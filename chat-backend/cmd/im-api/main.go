package main

import (
	"chat-backend/internal/app/command"
	"chat-backend/internal/domain/chat"
	"chat-backend/internal/domain/room"
	"chat-backend/internal/domain/user"
	"chat-backend/internal/infrastructure/persistence"
	"chat-backend/internal/interfaces/http"
	"chat-backend/pkg/logger"
	"fmt"
	"log"

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
	viper.AddConfigPath("../../configs") // For running from cmd/im-api

	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("Fatal error config file: %v", err)
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
		log.Fatalf("Database configuration is missing (host: %s, port: %s)", dbHost, dbPort)
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
		log.Fatalf("failed to auto migrate: %v", err)
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
	roomHandler := http.NewRoomHandler(roomApp)
	messageHandler := http.NewMessageHandler(messageApp)

	// 5. Setup Gin
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

	// 6. Start Server
	port := viper.GetString("server.port")
	if port == "" {
		port = "8081"
	}
	log.Printf("im-api starting on port %s", port)
	r.Run(":" + port)
}
