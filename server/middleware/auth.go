package middleware

import (
	"chat-server/config"
	"chat-server/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT token and sets user context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse(401, "Authorization header required"))
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse(401, "Invalid authorization format"))
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.ValidateToken(token, config.GetJWTSecret())
		if err != nil {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse(401, "Invalid or expired token"))
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
}

// GetUserID extracts user ID from gin context
func GetUserID(c *gin.Context) uint {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	return userID.(uint)
}
