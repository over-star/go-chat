package command

import (
	"chat-backend/internal/domain/user"
	"chat-backend/pkg/xerror"
)

type UserHandler struct {
	userRepo user.Repository
}

func NewUserHandler(userRepo user.Repository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

func (h *UserHandler) GetProfile(userID uint) (*user.User, error) {
	u, err := h.userRepo.GetByID(userID)
	if err != nil {
		return nil, xerror.New(xerror.CodeNotFound, "user not found")
	}
	return u, nil
}

func (h *UserHandler) SearchUsers(query string) ([]user.User, error) {
	return h.userRepo.Search(query)
}

func (h *UserHandler) AddFriend(userID, friendID uint) error {
	if userID == friendID {
		return xerror.New(xerror.CodeInvalidParams, "cannot add yourself as friend")
	}
	// Check if friend exists
	_, err := h.userRepo.GetByID(friendID)
	if err != nil {
		return xerror.New(xerror.CodeNotFound, "user not found")
	}
	return h.userRepo.AddFriend(userID, friendID)
}

func (h *UserHandler) AcceptFriend(userID, friendID uint) error {
	return h.userRepo.AcceptFriend(userID, friendID)
}

func (h *UserHandler) GetFriends(userID uint) ([]user.Friend, error) {
	return h.userRepo.GetFriends(userID)
}

func (h *UserHandler) GetFriendRequests(userID uint) ([]user.Friend, error) {
	return h.userRepo.GetFriendRequests(userID)
}

func (h *UserHandler) RemoveFriend(userID, friendID uint) error {
	return h.userRepo.RemoveFriend(userID, friendID)
}

func (h *UserHandler) GetGroups(userID uint) ([]user.FriendGroup, error) {
	return h.userRepo.GetGroups(userID)
}

func (h *UserHandler) CreateGroup(userID uint, name string) (*user.FriendGroup, error) {
	g := &user.FriendGroup{
		UserID: userID,
		Name:   name,
	}
	if err := h.userRepo.CreateGroup(g); err != nil {
		return nil, xerror.New(xerror.CodeInternalError, "failed to create group")
	}
	return g, nil
}

func (h *UserHandler) UpdateGroup(userID uint, groupID uint, name string) error {
	g := &user.FriendGroup{
		ID:     groupID,
		UserID: userID,
		Name:   name,
	}
	return h.userRepo.UpdateGroup(g)
}

func (h *UserHandler) DeleteGroup(groupID uint) error {
	return h.userRepo.DeleteGroup(groupID)
}

func (h *UserHandler) SetFriendGroup(userID uint, friendID uint, groupID uint) error {
	return h.userRepo.SetFriendGroup(userID, friendID, groupID)
}
