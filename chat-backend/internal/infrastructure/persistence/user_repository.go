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
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Update original request: friendID -> userID
		if err := tx.Model(&user.Friend{}).
			Where("user_id = ? AND friend_id = ?", friendID, userID).
			Update("status", user.FriendStatusAccepted).Error; err != nil {
			return err
		}

		// Create reciprocal record: userID -> friendID
		// Use FirstOrCreate or check existence to be safe
		var reciprocal user.Friend
		err := tx.Where("user_id = ? AND friend_id = ?", userID, friendID).First(&reciprocal).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				f := user.Friend{
					UserID:   userID,
					FriendID: friendID,
					Status:   user.FriendStatusAccepted,
				}
				return tx.Create(&f).Error
			}
			return err
		}

		// If reciprocal record exists (e.g. both sent requests), update it to accepted
		if reciprocal.Status != user.FriendStatusAccepted {
			return tx.Model(&reciprocal).Update("status", user.FriendStatusAccepted).Error
		}

		return nil
	})
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
