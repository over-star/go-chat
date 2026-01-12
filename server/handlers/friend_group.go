package handlers

import (
	"chat-server/config"
	"chat-server/middleware"
	"chat-server/models"
	"chat-server/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type FriendGroupHandler struct{}

func NewFriendGroupHandler() *FriendGroupHandler {
	return &FriendGroupHandler{}
}

func (h *FriendGroupHandler) CreateGroup(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req struct {
		Name string `json:"name" binding:"required,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	group := models.FriendGroup{
		UserID: userID,
		Name:   req.Name,
	}

	if err := config.AppConfig.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to create group"))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse(group.ToResponse()))
}

func (h *FriendGroupHandler) GetGroups(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var groups []models.FriendGroup
	if err := config.AppConfig.DB.Where("user_id = ?", userID).Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to get groups"))
		return
	}

	responses := make([]models.FriendGroupResponse, len(groups))
	for i, group := range groups {
		responses[i] = group.ToResponse()
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(responses))
}

func (h *FriendGroupHandler) UpdateGroup(c *gin.Context) {
	userID := middleware.GetUserID(c)
	groupID := c.Param("id")

	var req struct {
		Name string `json:"name" binding:"required,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	var group models.FriendGroup
	if err := config.AppConfig.DB.Where("id = ? AND user_id = ?", groupID, userID).First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Group not found"))
		return
	}

	group.Name = req.Name
	if err := config.AppConfig.DB.Save(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to update group"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(group.ToResponse()))
}

func (h *FriendGroupHandler) DeleteGroup(c *gin.Context) {
	userID := middleware.GetUserID(c)
	groupID := c.Param("id")

	tx := config.AppConfig.DB.Begin()

	var group models.FriendGroup
	if err := tx.Where("id = ? AND user_id = ?", groupID, userID).First(&group).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Group not found"))
		return
	}

	if err := tx.Model(&models.Friend{}).Where("user_id = ? AND group_id = ?", userID, groupID).Update("group_id", nil).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to update friends in group"))
		return
	}

	if err := tx.Delete(&group).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to delete group"))
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"message": "Group deleted"}))
}

func (h *FriendGroupHandler) SetFriendGroup(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req struct {
		FriendID uint  `json:"friend_id" binding:"required"`
		GroupID  *uint `json:"group_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(400, err.Error()))
		return
	}

	if req.GroupID != nil {
		var group models.FriendGroup
		if err := config.AppConfig.DB.Where("id = ? AND user_id = ?", req.GroupID, userID).First(&group).Error; err != nil {
			c.JSON(http.StatusNotFound, utils.ErrorResponse(404, "Group not found"))
			return
		}
	}

	if err := config.AppConfig.DB.Model(&models.Friend{}).
		Where("user_id = ? AND friend_id = ?", userID, req.FriendID).
		Update("group_id", req.GroupID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(500, "Failed to set friend group"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"message": "Friend group updated"}))
}
