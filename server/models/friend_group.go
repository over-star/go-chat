package models

import "time"

type FriendGroup struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Name      string    `gorm:"size:50;not null" json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type FriendGroupResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

func (fg *FriendGroup) ToResponse() FriendGroupResponse {
	return FriendGroupResponse{
		ID:   fg.ID,
		Name: fg.Name,
	}
}
