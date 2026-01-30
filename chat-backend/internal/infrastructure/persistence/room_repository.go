package persistence

import (
	"chat-backend/internal/domain/room"
	"chat-backend/internal/domain/user"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type roomRepo struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewRoomRepository(db *gorm.DB, rdb *redis.Client) room.Repository {
	return &roomRepo{db: db, rdb: rdb}
}

func (r *roomRepo) Create(rm *room.Room) error {
	return r.db.Create(rm).Error
}

func (r *roomRepo) GetByID(id uint) (*room.Room, error) {
	ctx := context.Background()
	cacheKey := fmt.Sprintf("room:%d", id)

	// Try cache
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var rm room.Room
		if err := json.Unmarshal([]byte(val), &rm); err == nil {
			return &rm, nil
		}
	}

	var rm room.Room
	err = r.db.Preload("Members").First(&rm, id).Error
	if err != nil {
		return nil, err
	}

	// Set cache
	data, _ := json.Marshal(rm)
	r.rdb.Set(ctx, cacheKey, data, 10*time.Minute)

	return &rm, nil
}

func (r *roomRepo) GetByUserID(userID uint) ([]room.Room, error) {
	var rooms []room.Room
	err := r.db.Model(&room.Room{}).
		Joins("JOIN room_members ON room_members.room_id = rooms.id").
		Where("room_members.user_id = ? AND room_members.is_hidden = ?", userID, false).
		Preload("Members").
		Order("updated_at DESC").
		Find(&rooms).Error
	return rooms, err
}

func (r *roomRepo) GetPrivateRoomBetweenUsers(userID1, userID2 uint) (*room.Room, error) {
	var rm room.Room
	err := r.db.Model(&room.Room{}).
		Joins("JOIN room_members rm1 ON rm1.room_id = rooms.id").
		Joins("JOIN room_members rm2 ON rm2.room_id = rooms.id").
		Where("rooms.type = ?", room.RoomTypePrivate).
		Where("rm1.user_id = ?", userID1).
		Where("rm2.user_id = ?", userID2).
		Preload("Members").
		First(&rm).Error
	if err != nil {
		return nil, err
	}
	return &rm, nil
}

func (r *roomRepo) Update(rm *room.Room) error {
	return r.db.Save(rm).Error
}

func (r *roomRepo) Delete(id uint) error {
	return r.db.Delete(&room.Room{}, id).Error
}

func (r *roomRepo) AddMember(roomID uint, userID uint) error {
	err := r.db.Model(&room.Room{ID: roomID}).Association("Members").Append(&user.User{ID: userID})
	if err == nil {
		r.rdb.Del(context.Background(), fmt.Sprintf("room:%d", roomID))
	}
	return err
}

func (r *roomRepo) RemoveMember(roomID uint, userID uint) error {
	err := r.db.Model(&room.Room{ID: roomID}).Association("Members").Delete(&user.User{ID: userID})
	if err == nil {
		r.rdb.Del(context.Background(), fmt.Sprintf("room:%d", roomID))
	}
	return err
}

func (r *roomRepo) SetHidden(roomID uint, userID uint, hidden bool) error {
	return r.db.Model(&room.RoomMember{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Update("is_hidden", hidden).Error
}
