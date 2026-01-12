package models

import "time"

// FriendStatus defines the status of a friend relationship
type FriendStatus string

const (
	FriendStatusPending  FriendStatus = "pending"
	FriendStatusAccepted FriendStatus = "accepted"
	FriendStatusRejected FriendStatus = "rejected"
)

type Friend struct {
	ID        uint         `gorm:"primarykey" json:"id"`
	UserID    uint         `gorm:"not null;index:idx_user_friend,unique" json:"user_id"`
	FriendID  uint         `gorm:"not null;index:idx_user_friend,unique" json:"friend_id"`
	Status    FriendStatus `gorm:"type:varchar(20);not null" json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`

	// Relations
	User       User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	FriendUser User `gorm:"foreignKey:FriendID" json:"friend,omitempty"`
}

// FriendResponse is the public friend response
type FriendResponse struct {
	ID        uint         `json:"id"`
	Friend    UserResponse `json:"friend"`
	Status    FriendStatus `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
}

// ToResponse converts Friend to FriendResponse
func (f *Friend) ToResponse() FriendResponse {
	return FriendResponse{
		ID:        f.ID,
		Friend:    f.FriendUser.ToResponse(),
		Status:    f.Status,
		CreatedAt: f.CreatedAt,
	}
}
