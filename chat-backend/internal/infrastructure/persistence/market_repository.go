package persistence

import (
	"chat-backend/internal/domain/market"
	"gorm.io/gorm"
	"time"
)

type marketRepo struct {
	db *gorm.DB
}

func NewMarketRepository(db *gorm.DB) market.Repository {
	return &marketRepo{db: db}
}

func (r *marketRepo) Create(price *market.MarketPrice) error {
	if price.CreatedAt.IsZero() {
		price.CreatedAt = time.Now()
	}
	return r.db.Create(price).Error
}

func (r *marketRepo) GetLatestPrices() ([]market.MarketPrice, error) {
	var prices []market.MarketPrice
	// Get the latest price for each symbol
	subQuery := r.db.Model(&market.MarketPrice{}).
		Select("symbol, MAX(created_at) as max_created_at").
		Group("symbol")

	err := r.db.Table("market_prices").
		Joins("JOIN (?) as t ON market_prices.symbol = t.symbol AND market_prices.created_at = t.max_created_at", subQuery).
		Find(&prices).Error

	return prices, err
}

func (r *marketRepo) GetPriceHistory(symbol string, start, end time.Time) ([]market.MarketPrice, error) {
	var prices []market.MarketPrice
	err := r.db.Where("symbol = ? AND created_at BETWEEN ? AND ?", symbol, start, end).
		Order("created_at asc").
		Find(&prices).Error
	return prices, err
}
