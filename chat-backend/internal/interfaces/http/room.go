package http

import (
	"chat-backend/internal/app/command"
	"chat-backend/pkg/xerror"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type RoomHandler struct {
	roomApp *command.RoomHandler
}

func NewRoomHandler(roomApp *command.RoomHandler) *RoomHandler {
	return &RoomHandler{roomApp: roomApp}
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

	responses := make([]interface{}, len(rooms))
	for i, rm := range rooms {
		responses[i] = rm.ToResponse()
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
