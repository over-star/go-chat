package chat

import (
	"time"
)

type ReadReceipt struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	MessageID uint      `gorm:"index;not null" json:"message_id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	ReadAt    time.Time `json:"read_at"`
}
