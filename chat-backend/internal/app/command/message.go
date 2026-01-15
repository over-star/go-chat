package command

import (
	"chat-backend/internal/domain/chat"
	"chat-backend/pkg/xerror"
)

type MessageHandler struct {
	messageRepo chat.Repository
}

func NewMessageHandler(messageRepo chat.Repository) *MessageHandler {
	return &MessageHandler{messageRepo: messageRepo}
}

func (h *MessageHandler) GetMessages(roomID uint, limit, offset int) ([]chat.Message, error) {
	return h.messageRepo.GetByRoomID(roomID, limit, offset)
}

func (h *MessageHandler) GetByID(id uint) (*chat.Message, error) {
	return h.messageRepo.GetByID(id)
}

func (h *MessageHandler) MarkAsRead(messageIDs []uint, userID uint) error {
	return h.messageRepo.MarkAsRead(messageIDs, userID)
}

func (h *MessageHandler) CreateMessage(m *chat.Message) error {
	if err := h.messageRepo.Create(m); err != nil {
		return xerror.New(xerror.CodeInternalError, "failed to create message")
	}
	return nil
}
