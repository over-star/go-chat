package http

import (
	"chat-backend/internal/interfaces/ws"
	"chat-backend/pkg/logger"
	"chat-backend/pkg/utils"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

type RouterOptions struct {
	AuthHandler    *AuthHandler
	UserHandler    *UserHandler
	RoomHandler    *RoomHandler
	MessageHandler *MessageHandler
	MarketHandler   *MarketHandler
	Hub            *ws.Hub
}

func NewRouter(opts RouterOptions) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(LoggerMiddleware())
	r.Use(cors.Default())

	// Serve static files
	r.Static("/uploads", "uploads")

	jwtSecret := viper.GetString("jwt.secret")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key"
	}

	// API Routes
	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", opts.AuthHandler.Register)
			auth.POST("/login", opts.AuthHandler.Login)
		}

		protected := api.Group("")
		protected.Use(AuthMiddleware(jwtSecret))
		{
			// User routes
			protected.GET("/users/profile", opts.UserHandler.GetProfile)
			protected.PUT("/users/profile", opts.UserHandler.UpdateProfile)
			protected.GET("/users/search", opts.UserHandler.SearchUsers)
			protected.GET("/users/friends", opts.UserHandler.GetFriends)
			protected.GET("/users/friend-requests", opts.UserHandler.GetFriendRequests)
			protected.POST("/users/friends", opts.UserHandler.AddFriend)
			protected.POST("/users/friends/accept", opts.UserHandler.AcceptFriend)
			protected.DELETE("/users/friends/:id", opts.UserHandler.RemoveFriend)

			// Friend group routes
			protected.GET("/friend-groups", opts.UserHandler.GetGroups)
			protected.POST("/friend-groups", opts.UserHandler.CreateGroup)
			protected.PUT("/friend-groups/:id", opts.UserHandler.UpdateGroup)
			protected.DELETE("/friend-groups/:id", opts.UserHandler.DeleteGroup)
			protected.POST("/users/friends/set-group", opts.UserHandler.SetFriendGroup)

			// Room routes
			protected.POST("/rooms", opts.RoomHandler.CreateRoom)
			protected.GET("/rooms", opts.RoomHandler.GetRooms)
			protected.GET("/rooms/:id", opts.RoomHandler.GetRoom)
			protected.DELETE("/rooms/:id", opts.RoomHandler.DeleteRoom)
			protected.POST("/rooms/:id/leave", opts.RoomHandler.LeaveRoom)
			protected.POST("/rooms/:id/members", opts.RoomHandler.AddMembers)
			protected.DELETE("/rooms/:id/members/:user_id", opts.RoomHandler.RemoveMember)

			// Message routes
			protected.GET("/rooms/:id/messages", opts.MessageHandler.GetMessages)
			protected.POST("/messages/upload", opts.MessageHandler.UploadFile)
			protected.POST("/messages/read", opts.MessageHandler.MarkAsRead)

			// Market routes
			protected.GET("/market/prices", opts.MarketHandler.GetPrices)
			protected.GET("/market/history", opts.MarketHandler.GetHistory)
		}
	}

	// WebSocket Route
	r.GET("/ws", func(c *gin.Context) {
		userIDStr := c.Query("user_id")
		token := c.Query("token")

		if userIDStr == "" || token == "" {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return
		}

		claims, err := utils.ValidateToken(token, jwtSecret)
		if err != nil {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return
		}

		userID, _ := strconv.ParseUint(userIDStr, 10, 32)
		if uint(userID) != claims.UserID {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return
		}

		upgrader := ws.GetUpgrader()
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			logger.L.Error("failed to upgrade websocket", zap.Error(err))
			return
		}

		client := ws.NewClient(opts.Hub, conn, uint(userID))
		opts.Hub.Register <- client

		go client.WritePump()
		go client.ReadPump()
	})

	return r
}
