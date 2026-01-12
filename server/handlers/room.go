package handlers

import (
	"chat-server/config"
	"chat-server/middleware"
	"chat-server/models"
	"chat-server/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type RoomHandler struct{}

func NewRoomHandler() *RoomHandler {
	return &RoomHandler{}
}

type CreateRoomRequest struct {
	Name      string `json:"name" binding:"required"`
	Type      string `json:"type" binding:"required,oneof=private group"`
	MemberIDs []uint `json:"member_ids" binding:"required,min=1"`
}

// CreateRoom creates a new chat room
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req CreateRoomRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	// For private rooms, only 2 members allowed (including creator)
	if req.Type == "private" && len(req.MemberIDs) != 1 {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, "Private rooms must have exactly 2 members"))
		return
	}

	// Check if private room already exists
	if req.Type == "private" {
		var existingRoom models.Room
		err := config.AppConfig.DB.
			Joins("JOIN user_rooms ur1 ON ur1.room_id = rooms.id AND ur1.user_id = ?", userID).
			Joins("JOIN user_rooms ur2 ON ur2.room_id = rooms.id AND ur2.user_id = ?", req.MemberIDs[0]).
			Where("rooms.type = ?", models.RoomTypePrivate).
			First(&existingRoom).Error

		if err == nil {
			// Room already exists, return it
			config.AppConfig.DB.Preload("Members").First(&existingRoom, existingRoom.ID)
			c.JSON(http.StatusOK, utils.SuccessResponse(existingRoom.ToResponse()))
			return
		}
	}

	// Create room
	room := models.Room{
		Name:      req.Name,
		Type:      models.RoomType(req.Type),
		CreatorID: userID,
		Avatar:    generateRoomAvatar(req.Name),
	}

	// Start transaction
	tx := config.AppConfig.DB.Begin()

	if err := tx.Create(&room).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to create room"))
		return
	}

	// Add creator as member
	var members []*models.User
	var creator models.User
	if err := tx.First(&creator, userID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to find creator"))
		return
	}
	members = append(members, &creator)

	// Add other members
	for _, memberID := range req.MemberIDs {
		if memberID == userID {
			continue
		}
		var member models.User
		if err := tx.First(&member, memberID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Member not found"))
			return
		}
		members = append(members, &member)
	}

	if err := tx.Model(&room).Association("Members").Append(members); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to add members"))
		return
	}

	tx.Commit()

	// Reload room with members
	config.AppConfig.DB.Preload("Members").First(&room, room.ID)

	c.JSON(http.StatusCreated, utils.SuccessResponse(room.ToResponse()))
}

// GetRooms returns user's rooms
func (h *RoomHandler) GetRooms(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var user models.User
	if err := config.AppConfig.DB.Preload("Rooms.Members").Preload("Rooms.Creator").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to get rooms"))
		return
	}

	// Get last message for each room
	responses := make([]models.RoomResponse, len(user.Rooms))
	for i, room := range user.Rooms {
		roomResponse := room.ToResponse()

		// Get last message
		var lastMessage models.Message
		if err := config.AppConfig.DB.Where("room_id = ?", room.ID).
			Preload("Sender").
			Order("created_at DESC").
			First(&lastMessage).Error; err == nil {
			roomResponse.LastMessage = &lastMessage
		}

		// Get unread count
		var unreadCount int64
		config.AppConfig.DB.Model(&models.Message{}).
			Where("room_id = ? AND sender_id != ?", room.ID, userID).
			Where("id NOT IN (?)",
				config.AppConfig.DB.Model(&models.ReadReceipt{}).
					Select("message_id").
					Where("user_id = ?", userID),
			).Count(&unreadCount)
		roomResponse.UnreadCount = int(unreadCount)

		responses[i] = roomResponse
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(responses))
}

// GetRoom returns a specific room
func (h *RoomHandler) GetRoom(c *gin.Context) {
	userID := middleware.GetUserID(c)
	roomID := c.Param("id")

	var room models.Room
	if err := config.AppConfig.DB.Preload("Members").Preload("Creator").First(&room, roomID).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Room not found"))
		return
	}

	// Check if user is a member
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

	c.JSON(http.StatusOK, utils.SuccessResponse(room.ToResponse()))
}

// LeaveRoom removes user from a room
func (h *RoomHandler) LeaveRoom(c *gin.Context) {
	userID := middleware.GetUserID(c)
	roomID := c.Param("id")

	var room models.Room
	if err := config.AppConfig.DB.Preload("Members").First(&room, roomID).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Room not found"))
		return
	}

	var user models.User
	if err := config.AppConfig.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to find user"))
		return
	}

	if err := config.AppConfig.DB.Model(&room).Association("Members").Delete(&user); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to leave room"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"message": "Left room successfully"}))
}

// DeleteRoom deletes a room (only creator can delete)
func (h *RoomHandler) DeleteRoom(c *gin.Context) {
	userID := middleware.GetUserID(c)
	roomID := c.Param("id")

	var room models.Room
	if err := config.AppConfig.DB.First(&room, roomID).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Room not found"))
		return
	}

	if room.CreatorID != userID {
		c.JSON(http.StatusForbidden, utils.ErrorResponse(403, "Only room creator can delete the room"))
		return
	}

	if err := config.AppConfig.DB.Select("Members").Delete(&room).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to delete room"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"message": "Room deleted successfully"}))
}

// generateRoomAvatar creates a default room avatar
func generateRoomAvatar(roomName string) string {
	if roomName == "" {
		roomName = "Group"
	}
	return "https://ui-avatars.com/api/?name=" + roomName + "&background=random&size=200"
}
