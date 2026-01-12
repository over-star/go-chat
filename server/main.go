package main

import (
	"chat-server/config"
	"chat-server/handlers"
	"chat-server/middleware"
	"chat-server/models"
	"chat-server/websocket"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables or defaults")
	}

	// Initialize database
	dbConfig := config.GetDefaultDBConfig()
	db, err := config.InitDB(dbConfig)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Set global config
	config.AppConfig = &config.Config{DB: db}

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.User{},
		&models.Room{},
		&models.Message{},
		&models.Friend{},
		&models.ReadReceipt{},
	); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database migration completed successfully")

	// Create upload directory
	uploadPath := config.GetUploadPath()
	if err := os.MkdirAll(uploadPath, os.ModePerm); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize Gin
	router := gin.Default()

	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve uploaded files
	router.Static("/uploads", uploadPath)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler()
	userHandler := handlers.NewUserHandler()
	roomHandler := handlers.NewRoomHandler()
	messageHandler := handlers.NewMessageHandler()
	wsHandler := handlers.NewWebSocketHandler(hub)

	// Public routes
	public := router.Group("/api")
	{
		public.POST("/auth/register", authHandler.Register)
		public.POST("/auth/login", authHandler.Login)
	}

	// Protected routes
	protected := router.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		// User routes
		protected.GET("/users/profile", userHandler.GetProfile)
		protected.GET("/users/search", userHandler.SearchUsers)
		protected.GET("/users/friends", userHandler.GetFriends)
		protected.GET("/users/friend-requests", userHandler.GetFriendRequests)
		protected.POST("/users/friends", userHandler.AddFriend)
		protected.POST("/users/friends/accept", userHandler.AcceptFriend)
		protected.DELETE("/users/friends/:id", userHandler.RemoveFriend)

		// Room routes
		protected.POST("/rooms", roomHandler.CreateRoom)
		protected.GET("/rooms", roomHandler.GetRooms)
		protected.GET("/rooms/:id", roomHandler.GetRoom)
		protected.DELETE("/rooms/:id", roomHandler.DeleteRoom)
		protected.POST("/rooms/:id/leave", roomHandler.LeaveRoom)

		// Message routes
		protected.GET("/rooms/:id/messages", messageHandler.GetMessages)
		protected.POST("/messages/upload", messageHandler.UploadFile)
		protected.POST("/messages/read", messageHandler.MarkAsRead)
	}

	// WebSocket route
	router.GET("/ws", wsHandler.HandleWebSocket)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Start server
	port := config.GetServerPort()
	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
