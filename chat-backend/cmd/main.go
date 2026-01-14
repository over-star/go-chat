package main

import (
	"chat-backend/cmd/wire"
	"chat-backend/internal/domain/chat"
	"chat-backend/internal/domain/room"
	"chat-backend/internal/domain/user"
	"chat-backend/pkg/logger"
	"fmt"
	"log"

	"github.com/spf13/viper"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// 1. Load config
	initConfig()

	// 2. Init Logger
	initLogger()

	// 3. Init DB
	db := initDB()

	// 4. Initialize App using Wire
	application, cleanup, err := wire.InitializeApp(db)
	if err != nil {
		log.Fatalf("failed to initialize app: %v", err)
	}
	defer cleanup()

	// 5. Start Hub
	go application.Hub.Run()

	// 6. Start Server
	port := viper.GetString("server.port")
	if port == "" {
		port = "8081"
	}
	log.Printf("IM Combined Server starting on port %s", port)
	if err := application.Engine.Run(":" + port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

func initConfig() {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: error config file: %v", err)
	}
	viper.AutomaticEnv()
}

func initLogger() {
	logger.Init(logger.Config{
		Filename:   viper.GetString("log.filename"),
		MaxSize:    viper.GetInt("log.max_size"),
		MaxBackups: viper.GetInt("log.max_backups"),
		MaxAge:     viper.GetInt("log.max_age"),
		Compress:   viper.GetBool("log.compress"),
		Level:      viper.GetString("log.level"),
	})
}

func initDB() *gorm.DB {
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
	return db
}
