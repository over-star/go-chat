package xerror

import "fmt"

type Code uint32

const (
	CodeOK             Code = 0
	CodeInternalError  Code = 10001
	CodeInvalidParams  Code = 10002
	CodeUnauthorized   Code = 10003
	CodeNotFound       Code = 10004
	CodeAlreadyExists  Code = 10005
	CodePermissionDenied Code = 10006
)

type Error struct {
	Code    Code   `json:"code"`
	Message string `json:"message"`
}

func (e *Error) Error() string {
	return fmt.Sprintf("code: %d, message: %s", e.Code, e.Message)
}

func New(code Code, message string) *Error {
	return &Error{
		Code:    code,
		Message: message,
	}
}
