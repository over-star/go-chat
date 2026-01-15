package chat

import (
	"chat-backend/internal/domain/user"
	"time"

	"gorm.io/gorm"
)

type MessageType string

const (
	MessageTypeText  MessageType = "text"
	MessageTypeImage MessageType = "image"
	MessageTypeFile  MessageType = "file"
)

type Message struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	RoomID    uint           `gorm:"index;not null" json:"room_id"`
	SenderID  uint           `gorm:"index;not null" json:"sender_id"`
	Sender    user.User      `gorm:"foreignKey:SenderID" json:"sender"`
	Content   string         `gorm:"type:text" json:"content"`
	Type      MessageType    `gorm:"size:20;not null;default:'text'" json:"type"`
	FileURL   string         `json:"file_url,omitempty"`
	FileName  string         `json:"file_name,omitempty"`
	FileSize  int64          `json:"file_size,omitempty"`
	Mentions  []uint         `gorm:"serializer:json" json:"mentions,omitempty"`
	ReadBy    []ReadReceipt  `gorm:"foreignKey:MessageID" json:"read_by"`
}

type MessageResponse struct {
	ID        uint                `json:"id"`
	CreatedAt time.Time           `json:"created_at"`
	RoomID    uint                `json:"room_id"`
	Sender    user.UserResponse   `json:"sender"`
	Content   string              `json:"content"`
	Type      MessageType         `json:"type"`
	FileURL   string              `json:"file_url,omitempty"`
	FileName  string              `json:"file_name,omitempty"`
	FileSize  int64               `json:"file_size,omitempty"`
	Mentions  []uint              `json:"mentions,omitempty"`
	ReadBy    []ReadReceipt       `json:"read_by"`
}

func (m *Message) ToResponse() MessageResponse {
	return MessageResponse{
		ID:        m.ID,
		CreatedAt: m.CreatedAt,
		RoomID:    m.RoomID,
		Sender:    m.Sender.ToResponse(),
		Content:   m.Content,
		Type:      m.Type,
		FileURL:   m.FileURL,
		FileName:  m.FileName,
		FileSize:  m.FileSize,
		Mentions:  m.Mentions,
		ReadBy:    m.ReadBy,
	}
}

type Repository interface {
	Create(message *Message) error
	GetByID(id uint) (*Message, error)
	GetByRoomID(roomID uint, limit int, offset int) ([]Message, error)
	MarkAsRead(messageIDs []uint, userID uint) error
}
