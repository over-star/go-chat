package user

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Username  string         `gorm:"uniqueIndex;not null;size:50" json:"username"`
	Email     string         `gorm:"uniqueIndex;not null;size:100" json:"email"`
	Password  string         `gorm:"not null" json:"-"`
	Avatar    string         `json:"avatar"`
	Bio       string         `json:"bio"`
	Status    string         `gorm:"default:'offline'" json:"status"`
}

type UserResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
	Bio      string `json:"bio"`
	Status   string `json:"status"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:       u.ID,
		Username: u.Username,
		Email:    u.Email,
		Avatar:   u.Avatar,
		Bio:      u.Bio,
		Status:   u.Status,
	}
}

type Repository interface {
	Create(user *User) error
	GetByID(id uint) (*User, error)
	GetByUsername(username string) (*User, error)
	GetByEmail(email string) (*User, error)
	Update(user *User) error
	Search(query string) ([]User, error)
	GetFriends(userID uint) ([]Friend, error)
	GetFriendRequests(userID uint) ([]Friend, error)
	AddFriend(userID uint, friendID uint) error
	AcceptFriend(userID uint, friendID uint) error
	RemoveFriend(userID uint, friendID uint) error
	GetGroups(userID uint) ([]FriendGroup, error)
	CreateGroup(group *FriendGroup) error
	UpdateGroup(group *FriendGroup) error
	DeleteGroup(id uint) error
	SetFriendGroup(userID uint, friendID uint, groupID uint) error
}
