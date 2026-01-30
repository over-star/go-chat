package market

import "time"

type MarketPrice struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Symbol        string    `gorm:"index" json:"symbol"`
	Name          string    `json:"name"`
	Price         float64   `json:"price"`
	Change        float64   `json:"change"`
	ChangePercent float64   `json:"change_percent"`
	Unit          string    `json:"unit"`
	CreatedAt     time.Time `gorm:"index" json:"created_at"`
}

type Repository interface {
	Create(price *MarketPrice) error
	GetLatestPrices() ([]MarketPrice, error)
	GetPriceHistory(symbol string, start, end time.Time) ([]MarketPrice, error)
}
