package http

import (
	"chat-backend/internal/app/command"
	"chat-backend/internal/domain/room"
	"chat-backend/pkg/xerror"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RoomHandler struct {
	roomApp *command.RoomHandler
	db      *gorm.DB
}

func NewRoomHandler(roomApp *command.RoomHandler, db *gorm.DB) *RoomHandler {
	return &RoomHandler{roomApp: roomApp, db: db}
}

func (h *RoomHandler) CreateRoom(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		Name      string `json:"name" binding:"required"`
		Type      string `json:"type" binding:"required"`
		MemberIDs []uint `json:"member_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	rm, err := h.roomApp.CreateRoom(userID, req.Name, req.Type, req.MemberIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": rm.ToResponse()})
}

func (h *RoomHandler) GetRooms(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	rooms, err := h.roomApp.GetRooms(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, xerror.New(xerror.CodeInternalError, err.Error()))
		return
	}

	responses := make([]room.RoomResponse, len(rooms))
	for i, rm := range rooms {
		resp := rm.ToResponse()
		// Count unread messages
		var count int64
		h.db.Table("messages").
			Joins("LEFT JOIN read_receipts ON read_receipts.message_id = messages.id AND read_receipts.user_id = ?", userID).
			Where("messages.room_id = ? AND messages.sender_id != ? AND read_receipts.id IS NULL", rm.ID, userID).
			Count(&count)
		resp.UnreadCount = count

		// Get last message
		var lastMsg struct {
			ID        uint      `json:"id"`
			Content   string    `json:"content"`
			CreatedAt time.Time `json:"created_at"`
			SenderID  uint      `json:"sender_id"`
			Sender    struct {
				Username string `json:"username"`
				Nickname string `json:"nickname"`
			} `json:"sender" gorm:"-"`
		}
		if err := h.db.Table("messages").
			Where("room_id = ?", rm.ID).
			Order("created_at DESC").
			First(&lastMsg).Error; err == nil {
			// Fetch sender info for last message
			h.db.Table("users").Select("username, nickname").Where("id = ?", lastMsg.SenderID).First(&lastMsg.Sender)
			resp.LastMessage = lastMsg
		}

		responses[i] = resp
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": responses})
}

func (h *RoomHandler) GetRoom(c *gin.Context) {
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)

	rm, err := h.roomApp.GetRoom(uint(roomID))
	if err != nil {
		c.JSON(http.StatusNotFound, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": rm.ToResponse()})
}

func (h *RoomHandler) DeleteRoom(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)

	// Verify creator
	rm, err := h.roomApp.GetRoom(uint(roomID))
	if err != nil {
		c.JSON(http.StatusNotFound, err)
		return
	}

	if rm.CreatorID != userID {
		c.JSON(http.StatusForbidden, xerror.New(xerror.CodePermissionDenied, "only creator can delete room"))
		return
	}

	if err := h.roomApp.DeleteRoom(uint(roomID)); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "room deleted"})
}

func (h *RoomHandler) AddMembers(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)

	var req struct {
		MemberIDs []uint `json:"member_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	if err := h.roomApp.AddMembers(uint(roomID), userID, req.MemberIDs); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "members added"})
}

func (h *RoomHandler) RemoveMember(c *gin.Context) {
	operatorID := c.MustGet("user_id").(uint)
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)
	userIDStr := c.Param("user_id")
	userID, _ := strconv.ParseUint(userIDStr, 10, 32)

	if err := h.roomApp.RemoveMember(uint(roomID), operatorID, uint(userID)); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "member removed"})
}

func (h *RoomHandler) LeaveRoom(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)

	if err := h.roomApp.LeaveRoom(uint(roomID), userID); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "left room"})
}
