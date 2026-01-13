package http

import (
	"chat-backend/internal/app/command"
	"chat-backend/pkg/utils"
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
		utils.Error(c, http.StatusNotFound, err)
		return
	}
	utils.Success(c, u.ToResponse())
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		Nickname string `json:"nickname"`
		Avatar   string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	if err := h.userApp.UpdateProfile(userID, req.Nickname, req.Avatar); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "profile updated")
}

func (h *UserHandler) SearchUsers(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	query := c.Query("q")
	responses, err := h.userApp.SearchUsers(userID, query)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}

	utils.Success(c, responses)
}

func (h *UserHandler) AddFriend(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		FriendID uint `json:"friend_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	if err := h.userApp.AddFriend(userID, req.FriendID); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "friend request sent")
}

func (h *UserHandler) AcceptFriend(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		FriendID uint `json:"friend_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	if err := h.userApp.AcceptFriend(userID, req.FriendID); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "friend request accepted")
}

func (h *UserHandler) GetFriends(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	friends, err := h.userApp.GetFriends(userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Success(c, friends)
}

func (h *UserHandler) GetFriendRequests(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	requests, err := h.userApp.GetFriendRequests(userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Success(c, requests)
}

func (h *UserHandler) RemoveFriend(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	friendIDStr := c.Param("id")
	friendID, _ := strconv.ParseUint(friendIDStr, 10, 32)

	if err := h.userApp.RemoveFriend(userID, uint(friendID)); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "friend removed")
}

// Friend Group Handlers (merged for simplicity as they share the app)

func (h *UserHandler) GetGroups(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	groups, err := h.userApp.GetGroups(userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Success(c, groups)
}

func (h *UserHandler) CreateGroup(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	g, err := h.userApp.CreateGroup(userID, req.Name)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Success(c, g)
}

func (h *UserHandler) UpdateGroup(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	groupIDStr := c.Param("id")
	groupID, _ := strconv.ParseUint(groupIDStr, 10, 32)
	
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	if err := h.userApp.UpdateGroup(userID, uint(groupID), req.Name); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "group updated")
}

func (h *UserHandler) DeleteGroup(c *gin.Context) {
	groupIDStr := c.Param("id")
	groupID, _ := strconv.ParseUint(groupIDStr, 10, 32)

	if err := h.userApp.DeleteGroup(uint(groupID)); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "group deleted")
}

func (h *UserHandler) SetFriendGroup(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	var req struct {
		FriendID uint  `json:"friend_id" binding:"required"`
		GroupID  *uint `json:"group_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorWithCode(c, http.StatusBadRequest, xerror.CodeInvalidParams, err.Error())
		return
	}

	if err := h.userApp.SetFriendGroup(userID, req.FriendID, req.GroupID); err != nil {
		utils.Error(c, http.StatusInternalServerError, err)
		return
	}
	utils.Message(c, "friend group set")
}
