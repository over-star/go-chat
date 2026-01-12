package websocket

import (
	"chat-server/config"
	"chat-server/models"
	"encoding/json"
	"log"
)

// MessageProcessor handles WebSocket message processing
type MessageProcessor struct {
	Hub *Hub
}

// WebSocketMessage represents a WebSocket message structure
type WebSocketMessage struct {
	Type        string                 `json:"type"`
	RoomID      uint                   `json:"room_id,omitempty"`
	Content     string                 `json:"content,omitempty"`
	MessageType string                 `json:"message_type,omitempty"`
	FileURL     string                 `json:"file_url,omitempty"`
	FileName    string                 `json:"file_name,omitempty"`
	FileSize    int64                  `json:"file_size,omitempty"`
	Mentions    []uint                 `json:"mentions,omitempty"`
	MessageID   uint                   `json:"message_id,omitempty"`
	SenderID    uint                   `json:"sender_id,omitempty"`
	Data        map[string]interface{} `json:"data,omitempty"`
}

// ProcessMessage processes incoming WebSocket messages
func (mp *MessageProcessor) ProcessMessage(rawMessage []byte, senderID uint) {
	var wsMsg WebSocketMessage
	if err := json.Unmarshal(rawMessage, &wsMsg); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		return
	}

	wsMsg.SenderID = senderID

	switch wsMsg.Type {
	case "message":
		mp.handleNewMessage(wsMsg)
	case "typing":
		mp.handleTyping(wsMsg)
	case "read_receipt":
		mp.handleReadReceipt(wsMsg)
	default:
		log.Printf("Unknown message type: %s", wsMsg.Type)
	}
}

// handleNewMessage processes new chat messages
func (mp *MessageProcessor) handleNewMessage(wsMsg WebSocketMessage) {
	// Verify user is member of room
	var room models.Room
	if err := config.AppConfig.DB.Preload("Members").First(&room, wsMsg.RoomID).Error; err != nil {
		log.Printf("Room not found: %v", err)
		return
	}

	isMember := false
	for _, member := range room.Members {
		if member.ID == wsMsg.SenderID {
			isMember = true
			break
		}
	}

	if !isMember {
		log.Printf("User %d is not a member of room %d", wsMsg.SenderID, wsMsg.RoomID)
		return
	}

	// Create message
	msgType := models.MessageTypeText
	if wsMsg.MessageType == "image" {
		msgType = models.MessageTypeImage
	} else if wsMsg.MessageType == "file" {
		msgType = models.MessageTypeFile
	}

	message := models.Message{
		RoomID:   wsMsg.RoomID,
		SenderID: wsMsg.SenderID,
		Content:  wsMsg.Content,
		Type:     msgType,
		FileURL:  wsMsg.FileURL,
		FileName: wsMsg.FileName,
		FileSize: wsMsg.FileSize,
		Mentions: wsMsg.Mentions,
	}

	if err := config.AppConfig.DB.Create(&message).Error; err != nil {
		log.Printf("Failed to save message: %v", err)
		return
	}

	// Load sender info
	config.AppConfig.DB.Preload("Sender").First(&message, message.ID)

	// Broadcast to room members
	memberIDs := make([]uint, len(room.Members))
	for i, member := range room.Members {
		memberIDs[i] = member.ID
	}

	response := WebSocketMessage{
		Type:   "message",
		RoomID: wsMsg.RoomID,
		Data:   map[string]interface{}{"message": message.ToResponse()},
	}

	responseBytes, _ := json.Marshal(response)
	mp.Hub.BroadcastToRoom(memberIDs, responseBytes)
}

// handleTyping broadcasts typing indicator
func (mp *MessageProcessor) handleTyping(wsMsg WebSocketMessage) {
	var room models.Room
	if err := config.AppConfig.DB.Preload("Members").First(&room, wsMsg.RoomID).Error; err != nil {
		return
	}

	memberIDs := make([]uint, 0)
	for _, member := range room.Members {
		if member.ID != wsMsg.SenderID {
			memberIDs = append(memberIDs, member.ID)
		}
	}

	response := WebSocketMessage{
		Type:   "typing",
		RoomID: wsMsg.RoomID,
		Data: map[string]interface{}{
			"user_id":   wsMsg.SenderID,
			"is_typing": wsMsg.Data["is_typing"],
		},
	}

	responseBytes, _ := json.Marshal(response)
	mp.Hub.BroadcastToRoom(memberIDs, responseBytes)
}

// handleReadReceipt processes read receipts
func (mp *MessageProcessor) handleReadReceipt(wsMsg WebSocketMessage) {
	var message models.Message
	if err := config.AppConfig.DB.Preload("Room.Members").First(&message, wsMsg.MessageID).Error; err != nil {
		return
	}

	memberIDs := make([]uint, 0)
	for _, member := range message.Room.Members {
		if member.ID != wsMsg.SenderID {
			memberIDs = append(memberIDs, member.ID)
		}
	}

	response := WebSocketMessage{
		Type:      "read_receipt",
		MessageID: wsMsg.MessageID,
		Data: map[string]interface{}{
			"user_id":    wsMsg.SenderID,
			"message_id": wsMsg.MessageID,
		},
	}

	responseBytes, _ := json.Marshal(response)
	mp.Hub.BroadcastToRoom(memberIDs, responseBytes)
}
