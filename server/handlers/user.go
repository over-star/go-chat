package handlers

import (
	"chat-server/config"
	"chat-server/middleware"
	"chat-server/models"
	"chat-server/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// GetProfile returns the current user's profile
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var user models.User
	if err := config.AppConfig.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "User not found"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(user.ToResponse()))
}

// SearchUsers searches for users by username
func (h *UserHandler) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, "Search query required"))
		return
	}

	var users []models.User
	if err := config.AppConfig.DB.Where("username LIKE ?", "%"+query+"%").Limit(20).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to search users"))
		return
	}

	responses := make([]models.UserResponse, len(users))
	for i, user := range users {
		responses[i] = user.ToResponse()
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(responses))
}

// AddFriend sends a friend request
func (h *UserHandler) AddFriend(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req struct {
		FriendID uint `json:"friend_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	if userID == req.FriendID {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, "Cannot add yourself as friend"))
		return
	}

	// Check if friend exists
	var friend models.User
	if err := config.AppConfig.DB.First(&friend, req.FriendID).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "User not found"))
		return
	}

	// Check if friendship already exists
	var existing models.Friend
	if err := config.AppConfig.DB.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userID, req.FriendID, req.FriendID, userID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, utils.ErrorResponse(409, "Friend request already exists"))
		return
	}

	// Create friend request
	friendship := models.Friend{
		UserID:   userID,
		FriendID: req.FriendID,
		Status:   models.FriendStatusPending,
	}

	if err := config.AppConfig.DB.Create(&friendship).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to create friend request"))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse(gin.H{"message": "Friend request sent"}))
}

// AcceptFriend accepts a friend request
func (h *UserHandler) AcceptFriend(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req struct {
		FriendID uint `json:"friend_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	// Find pending friend request
	var friendship models.Friend
	if err := config.AppConfig.DB.Where("user_id = ? AND friend_id = ? AND status = ?",
		req.FriendID, userID, models.FriendStatusPending).First(&friendship).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Friend request not found"))
		return
	}

	// Update status
	friendship.Status = models.FriendStatusAccepted
	if err := config.AppConfig.DB.Save(&friendship).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to accept friend request"))
		return
	}

	// Create reverse relationship for bidirectional friendship
	reverseFriendship := models.Friend{
		UserID:   userID,
		FriendID: req.FriendID,
		Status:   models.FriendStatusAccepted,
	}
	config.AppConfig.DB.Create(&reverseFriendship)

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"message": "Friend request accepted"}))
}

// GetFriends returns the user's friends list
func (h *UserHandler) GetFriends(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var friendships []models.Friend
	if err := config.AppConfig.DB.Where("user_id = ? AND status = ?", userID, models.FriendStatusAccepted).
		Preload("FriendUser").Preload("Group").Find(&friendships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to get friends"))
		return
	}

	responses := make([]models.FriendResponse, len(friendships))
	for i, friendship := range friendships {
		responses[i] = friendship.ToResponse()
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(responses))
}

// GetFriendRequests returns pending friend requests
func (h *UserHandler) GetFriendRequests(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var friendships []models.Friend
	if err := config.AppConfig.DB.Where("friend_id = ? AND status = ?", userID, models.FriendStatusPending).
		Preload("User").Find(&friendships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to get friend requests"))
		return
	}

	responses := make([]gin.H, len(friendships))
	for i, friendship := range friendships {
		responses[i] = gin.H{
			"id":         friendship.ID,
			"user":       friendship.User.ToResponse(),
			"created_at": friendship.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(responses))
}

// RemoveFriend removes a friend
func (h *UserHandler) RemoveFriend(c *gin.Context) {
	userID := middleware.GetUserID(c)
	friendID := c.Param("id")

	// Delete both directions of friendship
	if err := config.AppConfig.DB.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userID, friendID, friendID, userID).Delete(&models.Friend{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to remove friend"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"message": "Friend removed"}))
}
