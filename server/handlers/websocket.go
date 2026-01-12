package handlers

import (
	"chat-server/config"
	"chat-server/utils"
	"chat-server/websocket"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	gorilla "github.com/gorilla/websocket"
)

var upgrader = gorilla.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

type WebSocketHandler struct {
	Hub *websocket.Hub
}

func NewWebSocketHandler(hub *websocket.Hub) *WebSocketHandler {
	return &WebSocketHandler{Hub: hub}
}

// HandleWebSocket upgrades HTTP connection to WebSocket
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	token := c.Query("token")

	if token == "" {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse(401, "Token required"))
		return
	}

	// Validate token
	claims, err := utils.ValidateToken(token, config.GetJWTSecret())
	if err != nil {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse(401, "Invalid token"))
		return
	}

	userID := claims.UserID

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Create client
	client := websocket.NewClient(h.Hub, conn, userID)
	h.Hub.Register <- client

	// Start message pumps
	go client.WritePump()
	go client.ReadPump()
}
