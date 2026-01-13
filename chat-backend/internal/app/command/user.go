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

func (h *UserHandler) UpdateProfile(userID uint, nickname, avatar string) error {
	u, err := h.userRepo.GetByID(userID)
	if err != nil {
		return xerror.New(xerror.CodeNotFound, "user not found")
	}

	u.Nickname = nickname
	u.Avatar = avatar

	if err := h.userRepo.Update(u); err != nil {
		return xerror.New(xerror.CodeInternalError, "failed to update profile")
	}
	return nil
}

func (h *UserHandler) SearchUsers(userID uint, query string) ([]user.UserResponse, error) {
	users, err := h.userRepo.Search(query)
	if err != nil {
		return nil, err
	}

	var friendIDs []uint
	for _, u := range users {
		if u.ID != userID {
			friendIDs = append(friendIDs, u.ID)
		}
	}

	statusMap, err := h.userRepo.GetFriendStatus(userID, friendIDs)
	if err != nil {
		return nil, err
	}

	responses := make([]user.UserResponse, 0, len(users))
	for _, u := range users {
		if u.ID == userID {
			continue
		}
		res := u.ToResponse()
		if status, ok := statusMap[u.ID]; ok {
			res.FriendStatus = status
		}
		responses = append(responses, res)
	}
	return responses, nil
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

	// Check if already friends or request pending
	statusMap, err := h.userRepo.GetFriendStatus(userID, []uint{friendID})
	if err == nil {
		if status, ok := statusMap[friendID]; ok {
			if status == string(user.FriendStatusAccepted) {
				return xerror.New(xerror.CodeInvalidParams, "already friends")
			}
			return xerror.New(xerror.CodeInvalidParams, "friend request already sent")
		}
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

func (h *UserHandler) SetFriendGroup(userID uint, friendID uint, groupID *uint) error {
	return h.userRepo.SetFriendGroup(userID, friendID, groupID)
}
