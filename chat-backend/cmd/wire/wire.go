//go:build wireinject
// +build wireinject

package wire

import (
	"chat-backend/internal/app"
	"chat-backend/internal/app/command"
	"chat-backend/internal/infrastructure/persistence"
	"chat-backend/internal/interfaces/http"
	"chat-backend/internal/interfaces/ws"

	"github.com/google/wire"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func InitializeApp(db *gorm.DB, rdb *redis.Client) (*app.App, func(), error) {
	wire.Build(
		persistence.NewUserRepository,
		persistence.NewRoomRepository,
		persistence.NewMessageRepository,
		persistence.NewMarketRepository,
		command.NewAuthHandler,
		command.NewUserHandler,
		command.NewRoomHandler,
		command.NewMessageHandler,
		command.NewMarketHandler,
		http.NewAuthHandler,
		http.NewUserHandler,
		http.NewRoomHandler,
		http.NewMessageHandler,
		http.NewMarketHandler,
		ws.NewHub,
		http.NewRouter,
		wire.Struct(new(http.RouterOptions), "*"),
		app.NewApp,
	)
	return &app.App{}, nil, nil
}
