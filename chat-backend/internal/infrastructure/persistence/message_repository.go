package persistence

import (
	"chat-backend/internal/domain/chat"
	"gorm.io/gorm"
	"time"
)

type messageRepo struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) chat.Repository {
	return &messageRepo{db: db}
}

func (r *messageRepo) Create(m *chat.Message) error {
	return r.db.Create(m).Error
}

func (r *messageRepo) GetByID(id uint) (*chat.Message, error) {
	var m chat.Message
	err := r.db.Preload("Sender").Preload("ReadBy").First(&m, id).Error
	return &m, err
}

func (r *messageRepo) GetByRoomID(roomID uint, limit int, offset int) ([]chat.Message, error) {
	var messages []chat.Message
	err := r.db.Where("room_id = ?", roomID).
		Preload("Sender").
		Preload("ReadBy").
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error
	return messages, err
}

func (r *messageRepo) MarkAsRead(messageIDs []uint, userID uint) error {
	for _, id := range messageIDs {
		var receipt chat.ReadReceipt
		err := r.db.Where("message_id = ? AND user_id = ?", id, userID).First(&receipt).Error
		if err == gorm.ErrRecordNotFound {
			receipt = chat.ReadReceipt{
				MessageID: id,
				UserID:    userID,
				ReadAt:    time.Now(),
			}
			if err := r.db.Create(&receipt).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
	}
	return nil
}
