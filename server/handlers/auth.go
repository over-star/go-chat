package handlers

import (
	"chat-server/config"
	"chat-server/models"
	"chat-server/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string              `json:"token"`
	User  models.UserResponse `json:"user"`
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := config.AppConfig.DB.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, utils.ErrorResponse(409, "Username or email already exists"))
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to hash password"))
		return
	}

	// Create user
	user := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: hashedPassword,
		Avatar:   generateDefaultAvatar(req.Username),
	}

	if err := config.AppConfig.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to create user"))
		return
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Username, config.GetJWTSecret())
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to generate token"))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse(AuthResponse{
		Token: token,
		User:  user.ToResponse(),
	}))
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	// Find user by username or email
	var user models.User
	if err := config.AppConfig.DB.Where("username = ? OR email = ?", req.Username, req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse(401, "Invalid credentials"))
		return
	}

	// Check password
	if !utils.CheckPassword(user.Password, req.Password) {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse(401, "Invalid credentials"))
		return
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Username, config.GetJWTSecret())
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to generate token"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(AuthResponse{
		Token: token,
		User:  user.ToResponse(),
	}))
}

// generateDefaultAvatar creates a default avatar URL using UI Avatars service
func generateDefaultAvatar(username string) string {
	// Use first letter of username
	initial := strings.ToUpper(string(username[0]))
	return "https://ui-avatars.com/api/?name=" + initial + "&background=random&size=200"
}
