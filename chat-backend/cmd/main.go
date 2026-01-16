package main

import (
	"chat-backend/cmd/wire"
	"chat-backend/internal/domain/chat"
	"chat-backend/internal/domain/room"
	"chat-backend/internal/domain/user"
	"chat-backend/pkg/logger"
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// 1. Load config
	initConfig()

	// 2. Init Logger
	initLogger()
	defer logger.Sync()

	// 3. Init DB
	db := initDB()

	// 3.1 Init Redis
	rdb := initRedis()

	// 4. Initialize App using Wire
	application, cleanup, err := wire.InitializeApp(db, rdb)
	if err != nil {
		logger.L.Fatal("failed to initialize app", zap.Error(err))
	}
	defer cleanup()

	// 5. Start Hub
	go application.Hub.Run()

	// 6. Start Server
	port := viper.GetString("server.port")
	if port == "" {
		port = "8081"
	}
	logger.L.Info("IM Combined Server starting", zap.String("port", port))
	if err := application.Engine.Run(":" + port); err != nil {
		logger.L.Fatal("failed to start server", zap.Error(err))
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
	cfg := logger.Config{
		Filename:   viper.GetString("log.filename"),
		MaxSize:    viper.GetInt("log.max_size"),
		MaxBackups: viper.GetInt("log.max_backups"),
		MaxAge:     viper.GetInt("log.max_age"),
		Compress:   viper.GetBool("log.compress"),
		Level:      viper.GetString("log.level"),
	}

	// Set default values if not configured
	if cfg.Filename == "" {
		cfg.Filename = "logs/server.log"
	}
	if cfg.Level == "" {
		cfg.Level = "info"
	}
	if cfg.MaxSize == 0 {
		cfg.MaxSize = 100
	}
	if cfg.MaxBackups == 0 {
		cfg.MaxBackups = 7
	}
	if cfg.MaxAge == 0 {
		cfg.MaxAge = 30
	}

	logger.Init(cfg)
}

func initRedis() *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", viper.GetString("redis.host"), viper.GetString("redis.port")),
		Password: viper.GetString("redis.password"),
		DB:       viper.GetInt("redis.db"),
	})

	// Test connection
	_, err := rdb.Ping(context.Background()).Result()
	if err != nil {
		panic(err)
		//logger.L.Error("failed to connect to redis", zap.Error(err))
		// Don't fatal here, maybe redis is optional? Actually for IM optimization it's required.
		// logger.L.Fatal("failed to connect to redis", zap.Error(err))
	}
	return rdb
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
		panic(err)
		//logger.L.Fatal("failed to connect to database", zap.Error(err))
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
		logger.L.Warn("Auto migration warning", zap.Error(err))
	}
	return db
}
