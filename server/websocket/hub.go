package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients mapped by user ID
	// Each user can have multiple clients (multi-device support)
	clients map[uint]map[*Client]bool

	// Inbound messages from clients
	Broadcast chan []byte

	// Register requests from clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[uint]map[*Client]bool),
		Broadcast:  make(chan []byte, 256),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
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
			log.Printf("Client registered: UserID=%d, Total clients for user=%d", client.UserID, len(h.clients[client.UserID]))

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.UserID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
					if len(clients) == 0 {
						delete(h.clients, client.UserID)
					}
					log.Printf("Client unregistered: UserID=%d, Remaining clients for user=%d", client.UserID, len(h.clients[client.UserID]))
				}
			}
			h.mu.Unlock()

		case message := <-h.Broadcast:
			// Parse message to determine recipients
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("Error unmarshaling broadcast message: %v", err)
				continue
			}

			// Broadcast to specific users or room members
			h.broadcastMessage(message, msg)
		}
	}
}

// broadcastMessage sends message to appropriate recipients
func (h *Hub) broadcastMessage(message []byte, msg map[string]interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	messageType, _ := msg["type"].(string)

	switch messageType {
	case "message":
		// Get room members from message
		if recipients, ok := msg["recipients"].([]interface{}); ok {
			for _, recipient := range recipients {
				if userID, ok := recipient.(float64); ok {
					h.sendToUser(uint(userID), message)
				}
			}
		}

	case "read_receipt", "typing", "user_status":
		// Send to specific users
		if recipients, ok := msg["recipients"].([]interface{}); ok {
			for _, recipient := range recipients {
				if userID, ok := recipient.(float64); ok {
					h.sendToUser(uint(userID), message)
				}
			}
		}

	default:
		log.Printf("Unknown message type: %s", messageType)
	}
}

// sendToUser sends message to all devices of a specific user
func (h *Hub) sendToUser(userID uint, message []byte) {
	if clients, ok := h.clients[userID]; ok {
		for client := range clients {
			select {
			case client.send <- message:
			default:
				// Client's send channel is full, close and remove
				close(client.send)
				delete(h.clients[userID], client)
				if len(h.clients[userID]) == 0 {
					delete(h.clients, userID)
				}
			}
		}
	}
}

// BroadcastToRoom sends message to all members of a room
func (h *Hub) BroadcastToRoom(roomMembers []uint, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, userID := range roomMembers {
		h.sendToUser(userID, message)
	}
}

// GetOnlineUsers returns list of currently online user IDs
func (h *Hub) GetOnlineUsers() []uint {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]uint, 0, len(h.clients))
	for userID := range h.clients {
		users = append(users, userID)
	}
	return users
}

// IsUserOnline checks if a user is currently online
func (h *Hub) IsUserOnline(userID uint) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, ok := h.clients[userID]
	return ok && len(clients) > 0
}
