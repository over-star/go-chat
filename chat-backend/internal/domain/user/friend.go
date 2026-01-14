package user

import (
	"time"
)

type FriendStatus string

const (
	FriendStatusPending  FriendStatus = "pending"
	FriendStatusAccepted FriendStatus = "accepted"
	FriendStatusBlocked  FriendStatus = "blocked"
)

type Friend struct {
	ID        uint         `gorm:"primarykey" json:"id"`
	CreatedAt time.Time    `json:"created_at"`
	UserID    uint         `gorm:"index;not null" json:"user_id"`
	FriendID  uint         `gorm:"index;not null" json:"friend_id"`
	Status    FriendStatus `gorm:"size:20;not null;default:'pending'" json:"status"`
	GroupID   *uint        `json:"group_id"`
	User      User         `gorm:"foreignKey:UserID" json:"user"`
	Friend    User         `gorm:"foreignKey:FriendID" json:"friend_info"`
}

type FriendGroup struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	Name      string    `gorm:"size:50;not null" json:"name"`
	Order     int       `gorm:"default:0" json:"order"`
}
