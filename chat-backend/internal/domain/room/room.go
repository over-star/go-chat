package room

import (
	"chat-backend/internal/domain/user"
	"time"

	"gorm.io/gorm"
)

type RoomType string

const (
	RoomTypePrivate RoomType = "private"
	RoomTypeGroup   RoomType = "group"
)

type Room struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Name      string         `gorm:"size:100" json:"name"`
	Avatar    string         `gorm:"size:255" json:"avatar"`
	Type      RoomType       `gorm:"size:20;not null;default:'private'" json:"type"`
	CreatorID uint           `json:"creator_id"`
	Members   []user.User    `gorm:"many2many:room_members;" json:"members"`
}

type RoomMember struct {
	RoomID   uint      `gorm:"primaryKey" json:"room_id"`
	UserID   uint      `gorm:"primaryKey" json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
}

type RoomResponse struct {
	ID          uint                `json:"id"`
	CreatedAt   time.Time           `json:"created_at"`
	Name        string              `json:"name"`
	Avatar      string              `json:"avatar"`
	Type        RoomType            `json:"type"`
	CreatorID   uint                `json:"creator_id"`
	Members     []user.UserResponse `json:"members"`
	UnreadCount int64               `json:"unread_count"`
	LastMessage interface{}         `json:"last_message"`
}

func (r *Room) ToResponse() RoomResponse {
	memberResponses := make([]user.UserResponse, len(r.Members))
	for i, member := range r.Members {
		memberResponses[i] = member.ToResponse()
	}

	return RoomResponse{
		ID:        r.ID,
		CreatedAt: r.CreatedAt,
		Name:      r.Name,
		Avatar:    r.Avatar,
		Type:      r.Type,
		CreatorID: r.CreatorID,
		Members:   memberResponses,
	}
}

type Repository interface {
	Create(room *Room) error
	GetByID(id uint) (*Room, error)
	GetByUserID(userID uint) ([]Room, error)
	Update(room *Room) error
	Delete(id uint) error
	AddMember(roomID uint, userID uint) error
	RemoveMember(roomID uint, userID uint) error
}
