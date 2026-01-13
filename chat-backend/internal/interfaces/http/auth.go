package http

import (
	"chat-backend/internal/app/command"
	"chat-backend/pkg/xerror"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authApp *command.AuthHandler
}

func NewAuthHandler(authApp *command.AuthHandler) *AuthHandler {
	return &AuthHandler{authApp: authApp}
}

type registerRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Nickname string `json:"nickname" binding:"required,min=2,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	u, err := h.authApp.Register(req.Username, req.Nickname, req.Email, req.Password)
	if err != nil {
		if e, ok := err.(*xerror.Error); ok {
			c.JSON(http.StatusInternalServerError, e)
		} else {
			c.JSON(http.StatusInternalServerError, xerror.New(xerror.CodeInternalError, err.Error()))
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": u.ToResponse()})
}

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, xerror.New(xerror.CodeInvalidParams, err.Error()))
		return
	}

	u, token, err := h.authApp.Login(req.Username, req.Password)
	if err != nil {
		var e *xerror.Error
		if errors.As(err, &e) {
			status := http.StatusInternalServerError
			if e.Code == xerror.CodeUnauthorized {
				status = http.StatusUnauthorized
			} else if e.Code == xerror.CodeNotFound {
				status = http.StatusNotFound
			}
			c.JSON(status, e)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"user":  u.ToResponse(),
			"token": token,
		},
	})
}
