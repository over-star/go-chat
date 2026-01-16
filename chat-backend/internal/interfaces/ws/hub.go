package ws

import (
	"chat-backend/internal/domain/chat"
	"chat-backend/internal/domain/room"
	"chat-backend/internal/domain/user"
	"chat-backend/pkg/logger"
	"encoding/json"
	"sync"

	"go.uber.org/zap"
)

type Hub struct {
	clients     map[uint]map[*Client]bool
	Broadcast   chan *BroadcastMessage
	Register    chan *Client
	Unregister  chan *Client
	mu          sync.RWMutex
	messageRepo chat.Repository
	roomRepo    room.Repository
	userRepo    user.Repository
}

type BroadcastMessage struct {
	Client  *Client
	Message []byte
}

func NewHub(messageRepo chat.Repository, roomRepo room.Repository, userRepo user.Repository) *Hub {
	return &Hub{
		clients:     make(map[uint]map[*Client]bool),
		Broadcast:   make(chan *BroadcastMessage, 256),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		messageRepo: messageRepo,
		roomRepo:    roomRepo,
		userRepo:    userRepo,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			isFirstClient := false
			if h.clients[client.UserID] == nil {
				h.clients[client.UserID] = make(map[*Client]bool)
				isFirstClient = true
			}
			h.clients[client.UserID][client] = true
			h.mu.Unlock()

			if isFirstClient {
				h.userRepo.UpdateStatus(client.UserID, "online")
				h.broadcastUserStatus(client.UserID, "online")
			}
			logger.L.Info("Client registered", zap.Uint("user_id", client.UserID))

		case client := <-h.Unregister:
			h.mu.Lock()
			isLastClient := false
			if clients, ok := h.clients[client.UserID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
					if len(clients) == 0 {
						delete(h.clients, client.UserID)
						isLastClient = true
					}
				}
			}
			h.mu.Unlock()

			if isLastClient {
				h.userRepo.UpdateStatus(client.UserID, "offline")
				h.broadcastUserStatus(client.UserID, "offline")
			}
			logger.L.Info("Client unregistered", zap.Uint("user_id", client.UserID))

		case broadcast := <-h.Broadcast:
			var msg map[string]interface{}
			if err := json.Unmarshal(broadcast.Message, &msg); err != nil {
				continue
			}
			h.handleIncomingMessage(broadcast.Client, broadcast.Message, msg)
		}
	}
}

func (h *Hub) handleIncomingMessage(client *Client, raw []byte, msg map[string]interface{}) {
	msgType, _ := msg["type"].(string)

	switch msgType {
	case "ping":
		h.handlePing(client)
	case "message":
		h.handleChatMessage(client, msg)
	case "typing":
		h.handleTypingStatus(client, msg)
	case "read_receipt":
		h.handleReadReceipt(client, msg)
	}
}

func (h *Hub) handlePing(client *Client) {
	response, _ := json.Marshal(map[string]interface{}{
		"type": "pong",
	})
	select {
	case client.send <- response:
	default:
		// Client buffer full
	}
}

func (h *Hub) handleChatMessage(client *Client, msg map[string]interface{}) {
	roomID := uint(msg["room_id"].(float64))
	content, _ := msg["content"].(string)
	mType, _ := msg["message_type"].(string)

	chatMsg := &chat.Message{
		RoomID:   roomID,
		SenderID: client.UserID,
		Content:  content,
		Type:     chat.MessageType(mType),
	}

	if fileUrl, ok := msg["file_url"].(string); ok {
		chatMsg.FileURL = fileUrl
	}
	if fileName, ok := msg["file_name"].(string); ok {
		chatMsg.FileName = fileName
	}
	if fileSize, ok := msg["file_size"].(float64); ok {
		chatMsg.FileSize = int64(fileSize)
	}

	if err := h.messageRepo.Create(chatMsg); err != nil {
		logger.L.Error("failed to save message", zap.Error(err))
		return
	}

	// Fetch message again to get sender info
	savedMsg, err := h.messageRepo.GetByID(chatMsg.ID)
	if err != nil {
		logger.L.Error("failed to fetch saved message", zap.Error(err))
		return
	}

	// Get room members to broadcast
	rm, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		logger.L.Error("failed to get room members", zap.Error(err))
		return
	}

	response, _ := json.Marshal(map[string]interface{}{
		"type": "message",
		"data": map[string]interface{}{
			"message": savedMsg.ToResponse(),
		},
	})

	for _, member := range rm.Members {
		h.SendToUser(member.ID, response)
	}
}

func (h *Hub) handleTypingStatus(client *Client, msg map[string]interface{}) {
	roomID := uint(msg["room_id"].(float64))
	// Broadcast typing status to room members except sender
	rm, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		return
	}

	response, _ := json.Marshal(map[string]interface{}{
		"type":    "typing",
		"room_id": roomID,
		"data":    msg["data"],
		"user_id": client.UserID,
	})

	for _, member := range rm.Members {
		if member.ID != client.UserID {
			h.SendToUser(member.ID, response)
		}
	}
}

func (h *Hub) handleReadReceipt(client *Client, msg map[string]interface{}) {
	roomID := uint(msg["room_id"].(float64))
	messageID := uint(msg["message_id"].(float64))

	if err := h.messageRepo.MarkAsRead(roomID, client.UserID, messageID); err != nil {
		return
	}

	h.BroadcastReadReceipt(roomID, messageID, client.UserID)
}

func (h *Hub) BroadcastReadReceipt(roomID uint, lastReadMessageID uint, userID uint) {
	rm, err := h.roomRepo.GetByID(roomID)
	if err != nil {
		return
	}

	response, _ := json.Marshal(map[string]interface{}{
		"type": "read_receipt",
		"data": map[string]interface{}{
			"room_id":              roomID,
			"last_read_message_id": lastReadMessageID,
			"user_id":              userID,
		},
	})

	for _, member := range rm.Members {
		h.SendToUser(member.ID, response)
	}
}

func (h *Hub) SendToUser(userID uint, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.clients[userID]; ok {
		for client := range clients {
			select {
			case client.send <- message:
			default:
				// Buffer full, skip or close
			}
		}
	}
}

func (h *Hub) broadcastUserStatus(userID uint, status string) {
	friends, err := h.userRepo.GetFriends(userID)
	if err != nil {
		logger.L.Error("failed to get friends for status broadcast", zap.Error(err))
		return
	}

	response, _ := json.Marshal(map[string]interface{}{
		"type": "user_status_change",
		"data": map[string]interface{}{
			"user_id": userID,
			"status":  status,
		},
	})

	for _, f := range friends {
		h.SendToUser(f.FriendID, response)
	}
	// Also send to the user themselves to update their local UI state
	h.SendToUser(userID, response)
}
