package command

import (
	"chat-backend/internal/domain/user"
	"chat-backend/pkg/utils"
	"chat-backend/pkg/xerror"
	"errors"
	"gorm.io/gorm"
)

type AuthHandler struct {
	userRepo user.Repository
}

func NewAuthHandler(userRepo user.Repository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

func (h *AuthHandler) Register(username, nickname, email, password string) (*user.User, error) {
	// Check if user exists
	_, err := h.userRepo.GetByUsername(username)
	if err == nil {
		return nil, xerror.New(xerror.CodeAlreadyExists, "username already exists")
	}

	_, err = h.userRepo.GetByEmail(email)
	if err == nil {
		return nil, xerror.New(xerror.CodeAlreadyExists, "email already exists")
	}

	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, xerror.New(xerror.CodeInternalError, "failed to hash password")
	}

	u := &user.User{
		Username: username,
		Nickname: nickname,
		Email:    email,
		Password: hashedPassword,
		Status:   "offline",
	}

	if err := h.userRepo.Create(u); err != nil {
		return nil, xerror.New(xerror.CodeInternalError, "failed to create user")
	}

	return u, nil
}

func (h *AuthHandler) Login(username, password string) (*user.User, string, error) {
	u, err := h.userRepo.GetByUsername(username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", xerror.New(xerror.CodeNotFound, "user not found")
		}
		return nil, "", xerror.New(xerror.CodeInternalError, "database error")
	}

	if !utils.CheckPassword(u.Password, password) {
		return nil, "", xerror.New(xerror.CodeUnauthorized, "invalid password")
	}

	// For now, I'll use a placeholder for token generation or import from server/utils
	// I'll assume server/utils/jwt.go is available
	token, err := utils.GenerateToken(u.ID, u.Username, "your-secret-key") // Placeholder
	if err != nil {
		return nil, "", xerror.New(xerror.CodeInternalError, "failed to generate token")
	}

	return u, token, nil
}
