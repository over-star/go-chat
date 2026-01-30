package persistence

import (
	"chat-backend/internal/domain/chat"
	"time"

	"gorm.io/gorm"
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
	err := r.db.Preload("Sender").First(&m, id).Error
	return &m, err
}

func (r *messageRepo) GetByRoomID(roomID uint, limit int, offset int) ([]chat.Message, error) {
	var messages []chat.Message
	err := r.db.Where("room_id = ?", roomID).
		Preload("Sender").
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error
	return messages, err
}

func (r *messageRepo) MarkAsRead(roomID uint, userID uint, lastReadMessageID uint) error {
	var receipt chat.ReadReceipt
	err := r.db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&receipt).Error
	if err == gorm.ErrRecordNotFound {
		receipt = chat.ReadReceipt{
			RoomID:            roomID,
			UserID:            userID,
			LastReadMessageID: lastReadMessageID,
			ReadAt:            time.Now(),
		}
		return r.db.Create(&receipt).Error
	} else if err != nil {
		return err
	}

	if lastReadMessageID > receipt.LastReadMessageID {
		return r.db.Model(&receipt).Updates(map[string]interface{}{
			"last_read_message_id": lastReadMessageID,
			"read_at":              time.Now(),
		}).Error
	}
	return nil
}
