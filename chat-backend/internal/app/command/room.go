package command

import (
	"chat-backend/internal/domain/room"
	"chat-backend/pkg/xerror"
)

type RoomHandler struct {
	roomRepo room.Repository
}

func NewRoomHandler(roomRepo room.Repository) *RoomHandler {
	return &RoomHandler{roomRepo: roomRepo}
}

func (h *RoomHandler) CreateRoom(creatorID uint, name string, roomType string, memberIDs []uint) (*room.Room, error) {
	// If it's a private chat, check if a room already exists between these two users
	if roomType == string(room.RoomTypePrivate) && len(memberIDs) > 0 {
		var friendID uint
		for _, id := range memberIDs {
			if id != creatorID {
				friendID = id
				break
			}
		}

		if friendID > 0 {
			rm, err := h.roomRepo.GetPrivateRoomBetweenUsers(creatorID, friendID)
			if err == nil {
				// Unhide for both users if it exists
				h.roomRepo.SetHidden(rm.ID, creatorID, false)
				h.roomRepo.SetHidden(rm.ID, friendID, false)
				return rm, nil
			}
		}
	}

	rm := &room.Room{
		Name:      name,
		Type:      room.RoomType(roomType),
		CreatorID: creatorID,
	}
	if err := h.roomRepo.Create(rm); err != nil {
		return nil, xerror.New(xerror.CodeInternalError, "failed to create room")
	}

	// Add creator as member
	if err := h.roomRepo.AddMember(rm.ID, creatorID); err != nil {
		return nil, xerror.New(xerror.CodeInternalError, "failed to add creator to room")
	}

	// Add other members
	for _, memberID := range memberIDs {
		if memberID == creatorID {
			continue
		}
		if err := h.roomRepo.AddMember(rm.ID, memberID); err != nil {
			// Log error but continue? Or fail? Let's continue for now.
		}
	}

	return h.roomRepo.GetByID(rm.ID)
}

func (h *RoomHandler) GetRooms(userID uint) ([]room.Room, error) {
	return h.roomRepo.GetByUserID(userID)
}

func (h *RoomHandler) GetRoom(roomID uint) (*room.Room, error) {
	rm, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		return nil, xerror.New(xerror.CodeNotFound, "room not found")
	}
	return rm, nil
}

func (h *RoomHandler) DeleteRoom(roomID uint, userID uint) error {
	rm, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		return xerror.New(xerror.CodeNotFound, "room not found")
	}

	if rm.Type == room.RoomTypePrivate {
		// For private rooms, just hide it for the user
		return h.roomRepo.SetHidden(roomID, userID, true)
	}

	// For group rooms, check if creator
	if rm.CreatorID != userID {
		return xerror.New(xerror.CodePermissionDenied, "only creator can delete group room")
	}

	return h.roomRepo.Delete(roomID)
}

func (h *RoomHandler) AddMembers(roomID uint, operatorID uint, memberIDs []uint) error {
	rm, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		return xerror.New(xerror.CodeNotFound, "room not found")
	}

	// Only creator can add members to group room
	if rm.Type == room.RoomTypeGroup && rm.CreatorID != operatorID {
		return xerror.New(xerror.CodePermissionDenied, "only creator can add members")
	}

	for _, memberID := range memberIDs {
		if err := h.roomRepo.AddMember(roomID, memberID); err != nil {
			return xerror.New(xerror.CodeInternalError, "failed to add member")
		}
	}
	return nil
}

func (h *RoomHandler) RemoveMember(roomID uint, operatorID uint, userID uint) error {
	rm, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		return xerror.New(xerror.CodeNotFound, "room not found")
	}

	// Only creator can remove members from group room
	if rm.Type == room.RoomTypeGroup && rm.CreatorID != operatorID {
		return xerror.New(xerror.CodePermissionDenied, "only creator can remove members")
	}

	// Cannot remove creator
	if userID == rm.CreatorID {
		return xerror.New(xerror.CodeInvalidParams, "cannot remove creator")
	}

	return h.roomRepo.RemoveMember(roomID, userID)
}

func (h *RoomHandler) LeaveRoom(roomID, userID uint) error {
	rm, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		return xerror.New(xerror.CodeNotFound, "room not found")
	}

	if rm.Type == room.RoomTypePrivate {
		return h.roomRepo.SetHidden(roomID, userID, true)
	}

	return h.roomRepo.RemoveMember(roomID, userID)
}
