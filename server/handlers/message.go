package handlers

import (
	"chat-server/config"
	"chat-server/middleware"
	"chat-server/models"
	"chat-server/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type MessageHandler struct{}

func NewMessageHandler() *MessageHandler {
	return &MessageHandler{}
}

// GetMessages returns messages for a room with pagination
func (h *MessageHandler) GetMessages(c *gin.Context) {
	userID := middleware.GetUserID(c)
	roomID := c.Param("id")

	// Verify user is member of room
	var room models.Room
	if err := config.AppConfig.DB.Preload("Members").First(&room, roomID).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Room not found"))
		return
	}

	isMember := false
	for _, member := range room.Members {
		if member.ID == userID {
			isMember = true
			break
		}
	}

	if !isMember {
		c.JSON(http.StatusForbidden, utils.ErrorResponse(403, "Not a member of this room"))
		return
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit

	// Get messages
	var messages []models.Message
	if err := config.AppConfig.DB.Where("room_id = ?", roomID).
		Preload("Sender").
		Preload("ReadReceipts").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to get messages"))
		return
	}

	// Convert to responses (reverse order for chronological display)
	responses := make([]models.MessageResponse, len(messages))
	for i := len(messages) - 1; i >= 0; i-- {
		responses[len(messages)-1-i] = messages[i].ToResponse()
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{
		"messages": responses,
		"page":     page,
		"limit":    limit,
	}))
}

// UploadFile handles file/image upload
func (h *MessageHandler) UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, "No file provided"))
		return
	}

	// Check file size (max 10MB)
	if file.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, "File size exceeds 10MB"))
		return
	}

	// Save file
	uploadPath := config.GetUploadPath()
	filename, err := utils.SaveUploadedFile(file, uploadPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to save file"))
		return
	}

	fileType := utils.GetFileType(filename)
	fileURL := "/uploads/" + filename

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{
		"file_url":  fileURL,
		"file_name": file.Filename,
		"file_size": file.Size,
		"file_type": fileType,
	}))
}

// MarkAsRead marks messages as read
func (h *MessageHandler) MarkAsRead(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req struct {
		MessageIDs []uint `json:"message_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	// Create read receipts
	for _, messageID := range req.MessageIDs {
		// Check if message exists and user has access
		var message models.Message
		if err := config.AppConfig.DB.Joins("JOIN rooms ON rooms.id = messages.room_id").
			Joins("JOIN user_rooms ON user_rooms.room_id = rooms.id").
			Where("messages.id = ? AND user_rooms.user_id = ? AND messages.sender_id != ?", messageID, userID, userID).
			First(&message).Error; err != nil {
			continue
		}

		// Create or update read receipt
		receipt := models.ReadReceipt{
			MessageID: messageID,
			UserID:    userID,
		}

		config.AppConfig.DB.Where("message_id = ? AND user_id = ?", messageID, userID).
			FirstOrCreate(&receipt)
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"message": "Messages marked as read"}))
}
