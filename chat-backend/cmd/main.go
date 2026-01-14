package main

import (
	"chat-backend/internal/app/command"
	"chat-backend/internal/domain/chat"
	"chat-backend/internal/domain/room"
	"chat-backend/internal/domain/user"
	"chat-backend/internal/infrastructure/persistence"
	"chat-backend/internal/interfaces/http"
	"chat-backend/internal/interfaces/ws"
	"chat-backend/pkg/logger"
	"chat-backend/pkg/utils"
	"fmt"
	"log"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// 1. Load config
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("configs")       // For running from chat-backend root
	viper.AddConfigPath("../configs")    // For running from cmd/
	viper.AddConfigPath("../../configs") // For running from deep subdirs
	viper.AddConfigPath(".")

	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: error config file: %v", err)
	}
	viper.AutomaticEnv()

	// 2. Init Logger
	logger.Init(logger.Config{
		Filename:   viper.GetString("log.filename"),
		MaxSize:    viper.GetInt("log.max_size"),
		MaxBackups: viper.GetInt("log.max_backups"),
		MaxAge:     viper.GetInt("log.max_age"),
		Compress:   viper.GetBool("log.compress"),
		Level:      viper.GetString("log.level"),
	})

	// 3. Init DB
	dbUser := viper.GetString("db.user")
	dbPass := viper.GetString("db.password")
	dbHost := viper.GetString("db.host")
	dbPort := viper.GetString("db.port")
	dbName := viper.GetString("db.name")

	if dbHost == "" || dbPort == "" {
		log.Printf("Warning: Database configuration might be missing (host: %s, port: %s)", dbHost, dbPort)
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPass, dbHost, dbPort, dbName,
	)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// Auto Migrate
	if err := db.AutoMigrate(
		&user.User{},
		&user.Friend{},
		&user.FriendGroup{},
		&room.Room{},
		&room.RoomMember{},
		&chat.Message{},
		&chat.ReadReceipt{},
	); err != nil {
		log.Printf("Auto migration warning: %v", err)
	}

	// 4. Init Repo & App & Handler
	userRepo := persistence.NewUserRepository(db)
	roomRepo := persistence.NewRoomRepository(db)
	messageRepo := persistence.NewMessageRepository(db)

	authApp := command.NewAuthHandler(userRepo)
	userApp := command.NewUserHandler(userRepo)
	roomApp := command.NewRoomHandler(roomRepo)
	messageApp := command.NewMessageHandler(messageRepo)

	authHandler := http.NewAuthHandler(authApp)
	userHandler := http.NewUserHandler(userApp)
	roomHandler := http.NewRoomHandler(roomApp, db)
	messageHandler := http.NewMessageHandler(messageApp)

	// 5. Init Hub
	hub := ws.NewHub(messageRepo, roomRepo)
	go hub.Run()

	// 6. Setup Gin
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(http.LoggerMiddleware())
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
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		protected := api.Group("")
		protected.Use(http.AuthMiddleware(jwtSecret))
		{
			// User routes
			protected.GET("/users/profile", userHandler.GetProfile)
			protected.PUT("/users/profile", userHandler.UpdateProfile)
			protected.GET("/users/search", userHandler.SearchUsers)
			protected.GET("/users/friends", userHandler.GetFriends)
			protected.GET("/users/friend-requests", userHandler.GetFriendRequests)
			protected.POST("/users/friends", userHandler.AddFriend)
			protected.POST("/users/friends/accept", userHandler.AcceptFriend)
			protected.DELETE("/users/friends/:id", userHandler.RemoveFriend)

			// Friend group routes
			protected.GET("/friend-groups", userHandler.GetGroups)
			protected.POST("/friend-groups", userHandler.CreateGroup)
			protected.PUT("/friend-groups/:id", userHandler.UpdateGroup)
			protected.DELETE("/friend-groups/:id", userHandler.DeleteGroup)
			protected.POST("/users/friends/set-group", userHandler.SetFriendGroup)

			// Room routes
			protected.POST("/rooms", roomHandler.CreateRoom)
			protected.GET("/rooms", roomHandler.GetRooms)
			protected.GET("/rooms/:id", roomHandler.GetRoom)
			protected.DELETE("/rooms/:id", roomHandler.DeleteRoom)
			protected.POST("/rooms/:id/leave", roomHandler.LeaveRoom)
			protected.POST("/rooms/:id/members", roomHandler.AddMembers)
			protected.DELETE("/rooms/:id/members/:user_id", roomHandler.RemoveMember)

			// Message routes
			protected.GET("/rooms/:id/messages", messageHandler.GetMessages)
			protected.POST("/messages/upload", messageHandler.UploadFile)
			protected.POST("/messages/read", messageHandler.MarkAsRead)
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
			log.Printf("failed to upgrade: %v", err)
			return
		}

		client := ws.NewClient(hub, conn, uint(userID))
		hub.Register <- client

		go client.WritePump()
		go client.ReadPump()
	})

	// 7. Start Server
	port := viper.GetString("server.port")
	if port == "" {
		port = "8081"
	}
	log.Printf("IM Combined Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
