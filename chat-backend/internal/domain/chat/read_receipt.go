package chat

import (
	"time"
)

type ReadReceipt struct {
	ID                uint      `gorm:"primarykey" json:"id"`
	RoomID            uint      `gorm:"uniqueIndex:idx_room_user;not null" json:"room_id"`
	UserID            uint      `gorm:"uniqueIndex:idx_room_user;not null" json:"user_id"`
	LastReadMessageID uint      `gorm:"not null" json:"last_read_message_id"`
	ReadAt            time.Time `json:"read_at"`
}
