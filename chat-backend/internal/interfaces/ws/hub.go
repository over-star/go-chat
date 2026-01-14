package ws

import (
	"chat-backend/internal/domain/chat"
	"chat-backend/internal/domain/room"
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
}

type BroadcastMessage struct {
	Client  *Client
	Message []byte
}

func NewHub(messageRepo chat.Repository, roomRepo room.Repository) *Hub {
	return &Hub{
		clients:     make(map[uint]map[*Client]bool),
		Broadcast:   make(chan *BroadcastMessage, 256),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		messageRepo: messageRepo,
		roomRepo:    roomRepo,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if h.clients[client.UserID] == nil {
				h.clients[client.UserID] = make(map[*Client]bool)
			}
			h.clients[client.UserID][client] = true
			h.mu.Unlock()
			logger.L.Info("Client registered", zap.Uint("user_id", client.UserID))

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.UserID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
					if len(clients) == 0 {
						delete(h.clients, client.UserID)
					}
					logger.L.Info("Client unregistered", zap.Uint("user_id", client.UserID))
				}
			}
			h.mu.Unlock()

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
	case "message":
		h.handleChatMessage(client, msg)
	case "typing":
		h.handleTypingStatus(client, msg)
	case "read_receipt":
		h.handleReadReceipt(client, msg)
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
	messageID := uint(msg["message_id"].(float64))
	if err := h.messageRepo.MarkAsRead([]uint{messageID}, client.UserID); err != nil {
		return
	}

	// Logic to notify other members about read receipt can be added here
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
