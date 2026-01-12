package persistence

import (
	"chat-backend/internal/domain/room"
	"chat-backend/internal/domain/user"
	"gorm.io/gorm"
)

type roomRepo struct {
	db *gorm.DB
}

func NewRoomRepository(db *gorm.DB) room.Repository {
	return &roomRepo{db: db}
}

func (r *roomRepo) Create(rm *room.Room) error {
	return r.db.Create(rm).Error
}

func (r *roomRepo) GetByID(id uint) (*room.Room, error) {
	var rm room.Room
	err := r.db.Preload("Members").First(&rm, id).Error
	return &rm, err
}

func (r *roomRepo) GetByUserID(userID uint) ([]room.Room, error) {
	var rooms []room.Room
	err := r.db.Model(&room.Room{}).
		Joins("JOIN room_members ON room_members.room_id = rooms.id").
		Where("room_members.user_id = ?", userID).
		Preload("Members").
		Order("updated_at DESC").
		Find(&rooms).Error
	return rooms, err
}

func (r *roomRepo) Update(rm *room.Room) error {
	return r.db.Save(rm).Error
}

func (r *roomRepo) Delete(id uint) error {
	return r.db.Delete(&room.Room{}, id).Error
}

func (r *roomRepo) AddMember(roomID uint, userID uint) error {
	return r.db.Model(&room.Room{ID: roomID}).Association("Members").Append(&user.User{ID: userID})
}

func (r *roomRepo) RemoveMember(roomID uint, userID uint) error {
	return r.db.Model(&room.Room{ID: roomID}).Association("Members").Delete(&user.User{ID: userID})
}
