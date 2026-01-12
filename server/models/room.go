package models

import (
	"time"

	"gorm.io/gorm"
)

// RoomType defines the type of room
type RoomType string

const (
	RoomTypePrivate RoomType = "private"
	RoomTypeGroup   RoomType = "group"
)

type Room struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	Name      string         `gorm:"size:100" json:"name"`
	Type      RoomType       `gorm:"type:varchar(20);not null" json:"type"`
	Avatar    string         `gorm:"size:255" json:"avatar"`
	CreatorID uint           `gorm:"not null" json:"creator_id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Creator  User      `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Members  []*User   `gorm:"many2many:user_rooms;" json:"members,omitempty"`
	Messages []Message `gorm:"foreignKey:RoomID" json:"-"`
}

// RoomResponse is the public room response
type RoomResponse struct {
	ID          uint           `json:"id"`
	Name        string         `json:"name"`
	Type        RoomType       `json:"type"`
	Avatar      string         `json:"avatar"`
	CreatorID   uint           `json:"creator_id"`
	Members     []UserResponse `json:"members,omitempty"`
	MemberCount int            `json:"member_count"`
	LastMessage *Message       `json:"last_message,omitempty"`
	UnreadCount int            `json:"unread_count,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
}

// ToResponse converts Room to RoomResponse
func (r *Room) ToResponse() RoomResponse {
	response := RoomResponse{
		ID:          r.ID,
		Name:        r.Name,
		Type:        r.Type,
		Avatar:      r.Avatar,
		CreatorID:   r.CreatorID,
		MemberCount: len(r.Members),
		CreatedAt:   r.CreatedAt,
	}

	if r.Members != nil {
		members := make([]UserResponse, len(r.Members))
		for i, member := range r.Members {
			members[i] = member.ToResponse()
		}
		response.Members = members
	}

	return response
}
