package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Error codes
const (
	ErrCodeValidation = "VALIDATION_ERROR"
	ErrCodeAuth       = "AUTH_ERROR"
	ErrCodeForbidden  = "FORBIDDEN"
	ErrCodeNotFound   = "NOT_FOUND"
	ErrCodeConflict   = "CONFLICT"
	ErrCodeServer     = "SERVER_ERROR"
)

// Response is a standard API response structure
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ErrorResponseStruct is the structure for error responses
type ErrorResponseStruct struct {
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	ErrorCode string      `json:"error_code,omitempty"`
	Details   interface{} `json:"details,omitempty"`
}

// ValidationError represents a single validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// SuccessResponse creates a successful response
func SuccessResponse(data interface{}) Response {
	return Response{
		Code:    200,
		Message: "success",
		Data:    data,
	}
}

// ErrorResponse creates an error response
func ErrorResponse(code int, message string) ErrorResponseStruct {
	return ErrorResponseStruct{
		Code:    code,
		Message: message,
	}
}

// DetailedErrorResponse creates an error response with error code and details
func DetailedErrorResponse(code int, message string, errorCode string, details interface{}) ErrorResponseStruct {
	return ErrorResponseStruct{
		Code:      code,
		Message:   message,
		ErrorCode: errorCode,
		Details:   details,
	}
}

// SaveUploadedFile saves an uploaded file and returns the file path
func SaveUploadedFile(file *multipart.FileHeader, uploadDir string) (string, error) {
	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return "", err
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, src); err != nil {
		return "", err
	}

	return filename, nil
}

// IsImageFile checks if the file is an image
func IsImageFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	imageExts := []string{".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
	for _, imgExt := range imageExts {
		if ext == imgExt {
			return true
		}
	}
	return false
}

// GetFileType returns the file type based on extension
func GetFileType(filename string) string {
	if IsImageFile(filename) {
		return "image"
	}
	return "file"
}
