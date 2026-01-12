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
	GroupID   *uint        `json:"group_id"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`

	// Relations
	User       User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	FriendUser User         `gorm:"foreignKey:FriendID" json:"friend,omitempty"`
	Group      *FriendGroup `gorm:"foreignKey:GroupID" json:"group,omitempty"`
}

// FriendResponse is the public friend response
type FriendResponse struct {
	ID        uint                 `json:"id"`
	Friend    UserResponse         `json:"friend"`
	Status    FriendStatus         `json:"status"`
	GroupID   *uint                `json:"group_id,omitempty"`
	Group     *FriendGroupResponse `json:"group,omitempty"`
	CreatedAt time.Time            `json:"created_at"`
}

// ToResponse converts Friend to FriendResponse
func (f *Friend) ToResponse() FriendResponse {
	var groupResponse *FriendGroupResponse
	if f.Group != nil {
		gr := f.Group.ToResponse()
		groupResponse = &gr
	}

	return FriendResponse{
		ID:        f.ID,
		Friend:    f.FriendUser.ToResponse(),
		Status:    f.Status,
		GroupID:   f.GroupID,
		Group:     groupResponse,
		CreatedAt: f.CreatedAt,
	}
}
