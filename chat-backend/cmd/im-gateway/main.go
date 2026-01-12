package main

import (
	"chat-backend/internal/infrastructure/persistence"
	"chat-backend/internal/interfaces/ws"
	"chat-backend/pkg/logger"
	"chat-backend/pkg/utils"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/spf13/viper"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// 1. Load config
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("configs")       // For running from chat-backend root
	viper.AddConfigPath("../../configs") // For running from cmd/im-gateway

	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("Fatal error config file: %v", err)
	}

	// 2. Init Logger
	logger.Init(logger.Config{
		Filename: "logs/gateway.log",
		Level:    "debug",
	})

	// 3. Init DB
	dbUser := viper.GetString("db.user")
	dbPass := viper.GetString("db.password")
	dbHost := viper.GetString("db.host")
	dbPort := viper.GetString("db.port")
	dbName := viper.GetString("db.name")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPass, dbHost, dbPort, dbName,
	)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// 4. Init Repos
	messageRepo := persistence.NewMessageRepository(db)
	roomRepo := persistence.NewRoomRepository(db)

	// 5. Init Hub
	hub := ws.NewHub(messageRepo, roomRepo)
	go hub.Run()

	// 6. Setup WebSocket Route
	jwtSecret := viper.GetString("jwt.secret")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key"
	}

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		userIDStr := r.URL.Query().Get("user_id")
		token := r.URL.Query().Get("token")

		if userIDStr == "" || token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		claims, err := utils.ValidateToken(token, jwtSecret)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userID, _ := strconv.ParseUint(userIDStr, 10, 32)
		if uint(userID) != claims.UserID {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		upgrader := ws.GetUpgrader()
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("failed to upgrade: %v", err)
			return
		}

		client := ws.NewClient(hub, conn, uint(userID))
		hub.Register <- client

		go client.WritePump()
		go client.ReadPump()
	})

	// 7. Start Gateway
	port := viper.GetString("gateway.port")
	if port == "" {
		port = "8082" // Use 8082 to avoid conflict with im-api
	}
	log.Printf("im-gateway starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
