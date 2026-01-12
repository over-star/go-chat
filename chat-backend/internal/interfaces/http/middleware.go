package http

import (
	"bytes"
	"chat-backend/pkg/logger"
	"chat-backend/pkg/utils"
	"chat-backend/pkg/xerror"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Read Request Body
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Use custom response writer to capture response body
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		c.Next()

		cost := time.Since(start)

		// Skip body logging for file uploads to avoid cluttering logs with binary data
		reqBody := string(requestBody)
		respBody := blw.body.String()
		if strings.Contains(path, "/messages/upload") {
			reqBody = "<binary data skipped>"
			respBody = "<response skipped>"
		}

		logger.L.Info("HTTP Request",
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", query),
			zap.Int("status", c.Writer.Status()),
			zap.String("request_body", reqBody),
			zap.String("response_body", respBody),
			zap.String("ip", c.ClientIP()),
			zap.Duration("cost", cost),
		)
	}
}

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, xerror.New(xerror.CodeUnauthorized, "Authorization header required"))
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, xerror.New(xerror.CodeUnauthorized, "Invalid authorization format"))
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(parts[1], secret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, xerror.New(xerror.CodeUnauthorized, "Invalid or expired token"))
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Next()
	}
}
