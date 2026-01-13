package persistence

import (
	"chat-backend/internal/domain/user"
	"gorm.io/gorm"
)

type userRepo struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) user.Repository {
	return &userRepo{db: db}
}

func (r *userRepo) Create(u *user.User) error {
	return r.db.Create(u).Error
}

func (r *userRepo) GetByID(id uint) (*user.User, error) {
	var u user.User
	err := r.db.First(&u, id).Error
	return &u, err
}

func (r *userRepo) GetByUsername(username string) (*user.User, error) {
	var u user.User
	err := r.db.Where("username = ?", username).First(&u).Error
	return &u, err
}

func (r *userRepo) GetByEmail(email string) (*user.User, error) {
	var u user.User
	err := r.db.Where("email = ?", email).First(&u).Error
	return &u, err
}

func (r *userRepo) Update(u *user.User) error {
	return r.db.Save(u).Error
}

func (r *userRepo) Search(query string) ([]user.User, error) {
	var users []user.User
	err := r.db.Where("username LIKE ? OR email LIKE ?", "%"+query+"%", "%"+query+"%").Find(&users).Error
	return users, err
}

func (r *userRepo) GetFriends(userID uint) ([]user.Friend, error) {
	var friends []user.Friend
	err := r.db.Where("user_id = ? AND status = ?", userID, user.FriendStatusAccepted).
		Preload("Friend").Find(&friends).Error
	return friends, err
}

func (r *userRepo) GetFriendRequests(userID uint) ([]user.Friend, error) {
	var friends []user.Friend
	err := r.db.Where("friend_id = ? AND status = ?", userID, user.FriendStatusPending).
		Preload("User").Find(&friends).Error
	return friends, err
}

func (r *userRepo) AddFriend(userID uint, friendID uint) error {
	f := user.Friend{
		UserID:   userID,
		FriendID: friendID,
		Status:   user.FriendStatusPending,
	}
	return r.db.Create(&f).Error
}

func (r *userRepo) AcceptFriend(userID uint, friendID uint) error {
	// Update status for both sides (or just one depending on design)
	// Original logic had it one way. I'll stick to original logic if I can find it.
	// In the original models, it's a simple status update.
	return r.db.Model(&user.Friend{}).
		Where("user_id = ? AND friend_id = ?", friendID, userID).
		Update("status", user.FriendStatusAccepted).Error
}

func (r *userRepo) RemoveFriend(userID uint, friendID uint) error {
	return r.db.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userID, friendID, friendID, userID).Delete(&user.Friend{}).Error
}

func (r *userRepo) GetGroups(userID uint) ([]user.FriendGroup, error) {
	var groups []user.FriendGroup
	err := r.db.Where("user_id = ?", userID).Order("`order` ASC").Find(&groups).Error
	return groups, err
}

func (r *userRepo) CreateGroup(g *user.FriendGroup) error {
	return r.db.Create(g).Error
}

func (r *userRepo) UpdateGroup(g *user.FriendGroup) error {
	return r.db.Save(g).Error
}

func (r *userRepo) DeleteGroup(id uint) error {
	return r.db.Delete(&user.FriendGroup{}, id).Error
}

func (r *userRepo) SetFriendGroup(userID uint, friendID uint, groupID *uint) error {
	return r.db.Model(&user.Friend{}).
		Where("user_id = ? AND friend_id = ?", userID, friendID).
		Update("group_id", groupID).Error
}

func (r *userRepo) GetFriendStatus(userID uint, friendIDs []uint) (map[uint]string, error) {
	var friends []user.Friend
	err := r.db.Where("user_id = ? AND friend_id IN ?", userID, friendIDs).Find(&friends).Error
	if err != nil {
		return nil, err
	}

	statusMap := make(map[uint]string)
	for _, f := range friends {
		statusMap[f.FriendID] = string(f.Status)
	}
	return statusMap, nil
}
