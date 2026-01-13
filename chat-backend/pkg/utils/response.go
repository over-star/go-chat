package utils

import (
	"chat-backend/pkg/xerror"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Code    xerror.Code `json:"code"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code: xerror.CodeOK,
		Data: data,
	})
}

// Message 成功消息响应
func Message(c *gin.Context, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    xerror.CodeOK,
		Message: message,
	})
}

// Error 错误响应
func Error(c *gin.Context, httpStatus int, err error) {
	var xerr *xerror.Error
	if errors.As(err, &xerr) {
		c.JSON(httpStatus, Response{
			Code:    xerr.Code,
			Message: xerr.Message,
		})
		return
	}
	c.JSON(httpStatus, Response{
		Code:    xerror.CodeInternalError,
		Message: err.Error(),
	})
}

// ErrorWithCode 带自定义状态码的错误响应
func ErrorWithCode(c *gin.Context, httpStatus int, code xerror.Code, message string) {
	c.JSON(httpStatus, Response{
		Code:    code,
		Message: message,
	})
}
