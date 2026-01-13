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

		// Skip body logging for file uploads and static files to avoid cluttering logs with binary data
		isUpload := strings.Contains(path, "/messages/upload")
		isStatic := strings.HasPrefix(path, "/uploads")
		isMultipart := strings.HasPrefix(c.GetHeader("Content-Type"), "multipart/form-data")
		
		skipBody := isUpload || isStatic || isMultipart

		// Read Request Body only if not skipping
		var requestBody []byte
		if c.Request.Body != nil && !skipBody {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Use custom response writer to capture response body only if not skipping
		var blw *bodyLogWriter
		if !skipBody {
			blw = &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
			c.Writer = blw
		}

		c.Next()

		cost := time.Since(start)

		reqBody := string(requestBody)
		var respBody string
		if blw != nil {
			respBody = blw.body.String()
		}

		if skipBody {
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
			utils.ErrorWithCode(c, http.StatusUnauthorized, xerror.CodeUnauthorized, "Authorization header required")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			utils.ErrorWithCode(c, http.StatusUnauthorized, xerror.CodeUnauthorized, "Invalid authorization format")
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(parts[1], secret)
		if err != nil {
			utils.ErrorWithCode(c, http.StatusUnauthorized, xerror.CodeUnauthorized, "Invalid or expired token")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Next()
	}
}
