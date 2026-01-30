package ws

import (
	"chat-backend/internal/domain/chat"
	"chat-backend/internal/domain/room"
	"chat-backend/internal/domain/user"
	"chat-backend/pkg/logger"
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/redis/go-redis/v9"
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
	rdb         *redis.Client
}

type BroadcastMessage struct {
	Client  *Client
	Message []byte
}

func NewHub(messageRepo chat.Repository, roomRepo room.Repository, userRepo user.Repository, rdb *redis.Client) *Hub {
	return &Hub{
		clients:     make(map[uint]map[*Client]bool),
		Broadcast:   make(chan *BroadcastMessage, 256),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		messageRepo: messageRepo,
		roomRepo:    roomRepo,
		userRepo:    userRepo,
		rdb:         rdb,
	}
}

func (h *Hub) Run() {
	// 5. Start Redis Subscription
	go h.subscribeToRedis()

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

func (h *Hub) subscribeToRedis() {
	// Subscribe to both room messages and user status changes
	pubsub := h.rdb.PSubscribe(context.Background(), "room:*", "user:status:*")
	defer pubsub.Close()

	ch := pubsub.Channel()
	logger.L.Info("Subscribed to Redis channels room:* and user:status:*")

	for msg := range ch {
		h.handleRedisMessage(msg)
	}
}

func (h *Hub) handleRedisMessage(redisMsg *redis.Message) {
	// Handle User Status Change relay
	if len(redisMsg.Channel) > 12 && redisMsg.Channel[:12] == "user:status:" {
		h.handleUserStatusRelay(redisMsg)
		return
	}

	var payload struct {
		RoomID  uint            `json:"room_id"`
		Payload json.RawMessage `json:"payload"`
		Type    string          `json:"type"`
	}

	if err := json.Unmarshal([]byte(redisMsg.Payload), &payload); err != nil {
		logger.L.Error("failed to unmarshal redis message", zap.Error(err), zap.String("channel", redisMsg.Channel))
		return
	}

	// Fetch room members
	rm, err := h.roomRepo.GetByID(payload.RoomID)
	if err != nil {
		logger.L.Error("failed to get room members from repo", zap.Error(err), zap.Uint("room_id", payload.RoomID))
		return
	}

	if len(rm.Members) == 0 {
		return
	}

	for _, member := range rm.Members {
		h.SendToUser(member.ID, []byte(payload.Payload))
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

func (h *Hub) PublishToRedis(roomID uint, msgType string, payload []byte) {
	data, _ := json.Marshal(map[string]interface{}{
		"room_id": roomID,
		"type":    msgType,
		"payload": json.RawMessage(payload), // Use RawMessage to avoid base64 encoding
	})
	if err := h.rdb.Publish(context.Background(), fmt.Sprintf("room:%d", roomID), data).Err(); err != nil {
		logger.L.Error("failed to publish to redis", zap.Error(err), zap.Uint("room_id", roomID))
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

	// Unhide room for members when a new message is sent
	rm, err := h.roomRepo.GetByID(roomID)
	if err == nil {
		for _, member := range rm.Members {
			h.roomRepo.SetHidden(roomID, member.ID, false)
		}
		
		// Notify members to ensure room appears in their list
		resp := rm.ToResponse()
		notification, _ := json.Marshal(map[string]interface{}{
			"type": "room_created",
			"data": map[string]interface{}{
				"room": resp,
			},
		})
		h.PublishToRedis(roomID, "room_created", notification)
	}

	// Fetch message again to get sender info
	savedMsg, err := h.messageRepo.GetByID(chatMsg.ID)
	if err != nil {
		logger.L.Error("failed to fetch saved message", zap.Error(err))
		return
	}

	response, _ := json.Marshal(map[string]interface{}{
		"type": "message",
		"data": map[string]interface{}{
			"message": savedMsg.ToResponse(),
		},
	})

	// Publish to Redis instead of direct broadcast
	h.PublishToRedis(roomID, "message", response)
}

func (h *Hub) handleTypingStatus(client *Client, msg map[string]interface{}) {
	roomID := uint(msg["room_id"].(float64))
	// Broadcast typing status to room members via Redis
	response, _ := json.Marshal(map[string]interface{}{
		"type":    "typing",
		"room_id": roomID,
		"data":    msg["data"],
		"user_id": client.UserID,
	})

	// Publish to Redis instead of direct broadcast
	h.PublishToRedis(roomID, "typing", response)
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
	response, _ := json.Marshal(map[string]interface{}{
		"type": "read_receipt",
		"data": map[string]interface{}{
			"room_id":              roomID,
			"last_read_message_id": lastReadMessageID,
			"user_id":              userID,
		},
	})

	// Publish to Redis instead of direct broadcast
	h.PublishToRedis(roomID, "read_receipt", response)
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

func (h *Hub) handleUserStatusRelay(redisMsg *redis.Message) {
	var payload struct {
		UserID uint            `json:"user_id"`
		Status string          `json:"status"`
		Data   json.RawMessage `json:"data"`
	}

	if err := json.Unmarshal([]byte(redisMsg.Payload), &payload); err != nil {
		return
	}

	friends, err := h.userRepo.GetFriends(payload.UserID)
	if err != nil {
		return
	}

	for _, f := range friends {
		h.SendToUser(f.FriendID, payload.Data)
	}
	h.SendToUser(payload.UserID, payload.Data)
}

func (h *Hub) broadcastUserStatus(userID uint, status string) {
	response, _ := json.Marshal(map[string]interface{}{
		"type": "user_status_change",
		"data": map[string]interface{}{
			"user_id": userID,
			"status":  status,
		},
	})

	// Publish to Redis so all instances can notify local friends
	data, _ := json.Marshal(map[string]interface{}{
		"user_id": userID,
		"status":  status,
		"data":    json.RawMessage(response),
	})
	h.rdb.Publish(context.Background(), fmt.Sprintf("user:status:%d", userID), data)
}
