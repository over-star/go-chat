package command

import (
	"chat-backend/internal/domain/market"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type MarketHandler struct {
	marketRepo market.Repository
}

func NewMarketHandler(marketRepo market.Repository) *MarketHandler {
	h := &MarketHandler{marketRepo: marketRepo}
	go h.startPriceRefresher()
	return h
}

func (h *MarketHandler) startPriceRefresher() {
	ticker := time.NewTicker(1 * time.Minute)
	// Fetch and save immediately on start
	_, _ = h.RefreshPrices()

	for range ticker.C {
		_, _ = h.RefreshPrices()
	}
}

type PriceInfo struct {
	Symbol       string  `json:"symbol"`
	Name         string  `json:"name"`
	Price        float64 `json:"price"`
	Change       float64 `json:"change"`
	ChangePercent float64 `json:"change_percent"`
	Unit         string  `json:"unit"`
}

type JDFinanceResponse struct {
	ResultData struct {
		Data []struct {
			UniqueCode   string  `json:"uniqueCode"`
			Name         string  `json:"name"`
			LastPrice    float64 `json:"lastPrice"`
			Raise        float64 `json:"raise"`
			RaisePercent float64 `json:"raisePercent"`
		} `json:"data"`
	} `json:"resultData"`
}

func (h *MarketHandler) GetPrices() ([]PriceInfo, error) {
	latest, err := h.marketRepo.GetLatestPrices()
	if err != nil {
		return nil, err
	}

	var prices []PriceInfo
	for _, item := range latest {
		prices = append(prices, PriceInfo{
			Symbol:        item.Symbol,
			Name:          item.Name,
			Price:         item.Price,
			Change:        item.Change,
			ChangePercent: item.ChangePercent,
			Unit:          item.Unit,
		})
	}
	return prices, nil
}

func (h *MarketHandler) RefreshPrices() ([]PriceInfo, error) {
	reqData := `{"ticket":"gold-price-h5","uniqueCodes":["WG-XAUUSD","SGE-Au(T+D)","WG-XAGUSD","SGE-Ag(T+D)","FX-USDCNH","FX-DXY"]}`
	apiURL := fmt.Sprintf("https://ms.jr.jd.com/gw2/generic/jdtwt/h5/m/getSimpleQuoteUseUniqueCodes?reqData=%s", url.QueryEscape(reqData))

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var jdResp JDFinanceResponse
	if err := json.Unmarshal(body, &jdResp); err != nil {
		return nil, err
	}

	// 1. Find exchange rate first (USD/CNH)
	exchangeRate := 7.2 // Default fallback
	for _, item := range jdResp.ResultData.Data {
		if item.UniqueCode == "FX-USDCNH" && item.LastPrice > 0 {
			exchangeRate = item.LastPrice
			break
		}
	}

	const ozToGram = 31.1034768

	var prices []PriceInfo
	for _, item := range jdResp.ResultData.Data {
		unit := "CNY"
		priceValue := item.LastPrice
		changeValue := item.Raise

		// Convert USD/oz to CNY/g for international gold and silver
		if item.UniqueCode == "WG-XAUUSD" || item.UniqueCode == "WG-XAGUSD" {
			priceValue = (item.LastPrice * exchangeRate) / ozToGram
			changeValue = (item.Raise * exchangeRate) / ozToGram
			unit = "CNY/g"
		} else if item.UniqueCode == "SGE-Au(T+D)" {
			unit = "CNY/g"
		} else if item.UniqueCode == "SGE-Ag(T+D)" {
			// SGE Silver is quoted in CNY/kg, convert to CNY/g
			priceValue = item.LastPrice / 1000
			changeValue = item.Raise / 1000
			unit = "CNY/g"
		}

		price := PriceInfo{
			Symbol:        item.UniqueCode,
			Name:          item.Name,
			Price:         priceValue,
			Change:        changeValue,
			ChangePercent: item.RaisePercent * 100,
			Unit:          unit,
		}
		prices = append(prices, price)

		// Save to DB
		_ = h.marketRepo.Create(&market.MarketPrice{
			Symbol:        price.Symbol,
			Name:          price.Name,
			Price:         price.Price,
			Change:        price.Change,
			ChangePercent: price.ChangePercent,
			Unit:          price.Unit,
		})
	}

	return prices, nil
}

func (h *MarketHandler) GetHistory(symbol string, hours int) ([]market.MarketPrice, error) {
	end := time.Now()
	start := end.Add(-time.Duration(hours) * time.Hour)
	return h.marketRepo.GetPriceHistory(symbol, start, end)
}
