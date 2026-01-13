package http

import (
	"chat-backend/internal/app/command"
	"chat-backend/pkg/xerror"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userApp *command.UserHandler
}

func NewUserHandler(userApp *command.UserHandler) *UserHandler {
	return &UserHandler{userApp: userApp}
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	u, err := h.userApp.GetProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": u.ToResponse()})
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		Nickname string `json:"nickname"`
		Avatar   string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	if err := h.userApp.UpdateProfile(userID, req.Nickname, req.Avatar); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "profile updated"})
}

func (h *UserHandler) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	users, err := h.userApp.SearchUsers(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, xerror.New(xerror.CodeInternalError, err.Error()))
		return
	}
	
	responses := make([]interface{}, len(users))
	for i, u := range users {
		responses[i] = u.ToResponse()
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": responses})
}

func (h *UserHandler) AddFriend(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		FriendID uint `json:"friend_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	if err := h.userApp.AddFriend(userID, req.FriendID); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "friend request sent"})
}

func (h *UserHandler) AcceptFriend(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		FriendID uint `json:"friend_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	if err := h.userApp.AcceptFriend(userID, req.FriendID); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "friend request accepted"})
}

func (h *UserHandler) GetFriends(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	friends, err := h.userApp.GetFriends(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, xerror.New(xerror.CodeInternalError, err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": friends})
}

func (h *UserHandler) GetFriendRequests(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	requests, err := h.userApp.GetFriendRequests(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, xerror.New(xerror.CodeInternalError, err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": requests})
}

func (h *UserHandler) RemoveFriend(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	friendIDStr := c.Param("id")
	friendID, _ := strconv.ParseUint(friendIDStr, 10, 32)

	if err := h.userApp.RemoveFriend(userID, uint(friendID)); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "friend removed"})
}

// Friend Group Handlers (merged for simplicity as they share the app)

func (h *UserHandler) GetGroups(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	groups, err := h.userApp.GetGroups(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, xerror.New(xerror.CodeInternalError, err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": groups})
}

func (h *UserHandler) CreateGroup(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	g, err := h.userApp.CreateGroup(userID, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": g})
}

func (h *UserHandler) UpdateGroup(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	groupIDStr := c.Param("id")
	groupID, _ := strconv.ParseUint(groupIDStr, 10, 32)
	
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	if err := h.userApp.UpdateGroup(userID, uint(groupID), req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "group updated"})
}

func (h *UserHandler) DeleteGroup(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, _ := strconv.ParseUint(groupIDStr, 10, 32)

	if err := h.userApp.DeleteGroup(uint(groupID)); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "group deleted"})
}

func (h *UserHandler) SetFriendGroup(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		FriendID uint `json:"friend_id" binding:"required"`
		GroupID  uint `json:"group_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	if err := h.userApp.SetFriendGroup(userID, req.FriendID, req.GroupID); err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "friend group set"})
}
