package http

import (
	"chat-backend/internal/app/command"
	"chat-backend/internal/interfaces/ws"
	"chat-backend/pkg/utils"
	"chat-backend/pkg/xerror"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type MessageHandler struct {
	messageApp *command.MessageHandler
	hub        *ws.Hub
}

func NewMessageHandler(messageApp *command.MessageHandler, hub *ws.Hub) *MessageHandler {
	return &MessageHandler{messageApp: messageApp, hub: hub}
}

func (h *MessageHandler) GetMessages(c *gin.Context) {
	roomIDStr := c.Param("id")
	roomID, _ := strconv.ParseUint(roomIDStr, 10, 32)
	
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	// Support both page and offset, prioritize page if it exists
	var offset int
	if pageStr := c.Query("page"); pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		if page < 1 {
			page = 1
		}
		offset = (page - 1) * limit
	} else {
		offsetStr := c.DefaultQuery("offset", "0")
		offset, _ = strconv.Atoi(offsetStr)
	}

	messages, err := h.messageApp.GetMessages(uint(roomID), limit, offset)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}

	responses := make([]interface{}, len(messages))
	for i, m := range messages {
		responses[i] = m.ToResponse()
	}
	utils.Success(c, responses)
}

func (h *MessageHandler) MarkAsRead(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		RoomID    uint `json:"room_id" binding:"required"`
		MessageID uint `json:"message_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	if err := h.messageApp.MarkAsRead(req.RoomID, userID, req.MessageID); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}

	// Broadcast read receipt via websocket
	h.hub.BroadcastReadReceipt(req.RoomID, req.MessageID, userID)

	utils.Message(c, "marked as read")
}

func (h *MessageHandler) UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, "no file uploaded")
		return
	}

	// Max 4MB check
	if file.Size > 4*1024*1024 {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, "file size exceeds 4MB limit")
		return
	}

	// Ensure upload directory exists
	uploadDir := "uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), file.Filename)
	filepath := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, filepath); err != nil {
		utils.ErrorWithCode(c, http.StatusInternalServerError, xerror.CodeInternalError, "failed to save file")
		return
	}

	// In a real app, this URL should be configurable
	fileURL := fmt.Sprintf("/uploads/%s", filename)

	utils.Success(c, gin.H{
		"file_url":  fileURL,
		"file_name": file.Filename,
		"file_size": file.Size,
	})
}
