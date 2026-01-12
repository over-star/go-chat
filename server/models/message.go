package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// MessageType defines the type of message
type MessageType string

const (
	MessageTypeText  MessageType = "text"
	MessageTypeImage MessageType = "image"
	MessageTypeFile  MessageType = "file"
)

// MentionList is a custom type for storing mentions as JSON
type MentionList []uint

// Scan implements the sql.Scanner interface
func (m *MentionList) Scan(value interface{}) error {
	if value == nil {
		*m = []uint{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, m)
}

// Value implements the driver.Valuer interface
func (m MentionList) Value() (driver.Value, error) {
	if len(m) == 0 {
		return "[]", nil
	}
	return json.Marshal(m)
}

type Message struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	RoomID    uint           `gorm:"not null;index" json:"room_id"`
	SenderID  uint           `gorm:"not null;index" json:"sender_id"`
	Content   string         `gorm:"type:text" json:"content"`
	Type      MessageType    `gorm:"type:varchar(20);not null" json:"type"`
	FileURL   string         `gorm:"size:500" json:"file_url,omitempty"`
	FileName  string         `gorm:"size:255" json:"file_name,omitempty"`
	FileSize  int64          `json:"file_size,omitempty"`
	Mentions  MentionList    `gorm:"type:json" json:"mentions,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Sender       User          `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Room         Room          `gorm:"foreignKey:RoomID" json:"-"`
	ReadReceipts []ReadReceipt `gorm:"foreignKey:MessageID" json:"read_receipts,omitempty"`
}

// MessageResponse is the public message response
type MessageResponse struct {
	ID        uint         `json:"id"`
	RoomID    uint         `json:"room_id"`
	SenderID  uint         `json:"sender_id"`
	Sender    UserResponse `json:"sender"`
	Content   string       `json:"content"`
	Type      MessageType  `json:"type"`
	FileURL   string       `json:"file_url,omitempty"`
	FileName  string       `json:"file_name,omitempty"`
	FileSize  int64        `json:"file_size,omitempty"`
	Mentions  MentionList  `json:"mentions,omitempty"`
	ReadBy    []uint       `json:"read_by,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
}

// ToResponse converts Message to MessageResponse
func (m *Message) ToResponse() MessageResponse {
	response := MessageResponse{
		ID:        m.ID,
		RoomID:    m.RoomID,
		SenderID:  m.SenderID,
		Content:   m.Content,
		Type:      m.Type,
		FileURL:   m.FileURL,
		FileName:  m.FileName,
		FileSize:  m.FileSize,
		Mentions:  m.Mentions,
		CreatedAt: m.CreatedAt,
	}

	if m.Sender.ID != 0 {
		response.Sender = m.Sender.ToResponse()
	}

	if m.ReadReceipts != nil {
		readBy := make([]uint, len(m.ReadReceipts))
		for i, receipt := range m.ReadReceipts {
			readBy[i] = receipt.UserID
		}
		response.ReadBy = readBy
	}

	return response
}
