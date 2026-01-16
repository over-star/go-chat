package http

import (
	"chat-backend/internal/app/command"
	"chat-backend/internal/domain/chat"
	"chat-backend/internal/domain/room"
	"chat-backend/pkg/utils"
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
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	rm, err := h.roomApp.CreateRoom(userID, req.Name, req.Type, req.MemberIDs)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Success(c, rm.ToResponse())
}

func (h *RoomHandler) GetRooms(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	rooms, err := h.roomApp.GetRooms(userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}

	responses := make([]room.RoomResponse, len(rooms))
	for i, rm := range rooms {
		resp := rm.ToResponse()
		
		// 1. Get Read Status for all members in this room
		var readReceipts []chat.ReadReceipt
		h.db.Table("read_receipts").Where("room_id = ?", rm.ID).Find(&readReceipts)
		resp.ReadStatus = readReceipts

		// 2. Count unread messages for current user
		var lastReadID uint
		for _, r := range readReceipts {
			if r.UserID == userID {
				lastReadID = r.LastReadMessageID
				break
			}
		}

		var count int64
		h.db.Table("messages").
			Where("room_id = ? AND sender_id != ? AND id > ?", rm.ID, userID, lastReadID).
			Count(&count)
		resp.UnreadCount = count

		// 3. Get last message
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
	utils.Success(c, responses)
}

func (h *RoomHandler) GetRoom(c *gin.Context) {
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)
	userID := c.MustGet("user_id").(uint)

	rm, err := h.roomApp.GetRoom(uint(roomID))
	if err != nil {
		utils.Error(c, http.StatusNotFound, err)
		return
	}
	
	resp := rm.ToResponse()
	// Get Read Status
	var readReceipts []chat.ReadReceipt
	h.db.Table("read_receipts").Where("room_id = ?", rm.ID).Find(&readReceipts)
	resp.ReadStatus = readReceipts

	// Count unread
	var lastReadID uint
	for _, r := range readReceipts {
		if r.UserID == userID {
			lastReadID = r.LastReadMessageID
			break
		}
	}
	h.db.Table("messages").
		Where("room_id = ? AND sender_id != ? AND id > ?", rm.ID, userID, lastReadID).
		Count(&resp.UnreadCount)

	utils.Success(c, resp)
}

func (h *RoomHandler) DeleteRoom(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)

	// Verify creator
	rm, err := h.roomApp.GetRoom(uint(roomID))
	if err != nil {
		utils.Error(c, http.StatusNotFound, err)
		return
	}

	if rm.CreatorID != userID {
		utils.ErrorWithCode(c, http.StatusForbidden, xerror.CodePermissionDenied, "only creator can delete room")
		return
	}

	if err := h.roomApp.DeleteRoom(uint(roomID)); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "room deleted")
}

func (h *RoomHandler) AddMembers(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)

	var req struct {
		MemberIDs []uint `json:"member_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	if err := h.roomApp.AddMembers(uint(roomID), userID, req.MemberIDs); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "members added")
}

func (h *RoomHandler) RemoveMember(c *gin.Context) {
	operatorID := c.MustGet("user_id").(uint)
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)
	userIDStr := c.Param("user_id")
	userID, _ := strconv.ParseUint(userIDStr, 10, 32)

	if err := h.roomApp.RemoveMember(uint(roomID), operatorID, uint(userID)); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "member removed")
}

func (h *RoomHandler) LeaveRoom(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)

	if err := h.roomApp.LeaveRoom(uint(roomID), userID); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "left room")
}
