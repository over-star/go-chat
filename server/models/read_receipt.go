package models

import "time"

type ReadReceipt struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	MessageID uint      `gorm:"not null;index:idx_message_user,unique" json:"message_id"`
	UserID    uint      `gorm:"not null;index:idx_message_user,unique" json:"user_id"`
	ReadAt    time.Time `gorm:"autoCreateTime" json:"read_at"`

	// Relations
	Message Message `gorm:"foreignKey:MessageID" json:"-"`
	User    User    `gorm:"foreignKey:UserID" json:"-"`
}
