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
	"gorm.io/gorm"
)

func InitializeApp(db *gorm.DB) (*app.App, func(), error) {
	wire.Build(
		persistence.NewUserRepository,
		persistence.NewRoomRepository,
		persistence.NewMessageRepository,
		command.NewAuthHandler,
		command.NewUserHandler,
		command.NewRoomHandler,
		command.NewMessageHandler,
		http.NewAuthHandler,
		http.NewUserHandler,
		http.NewRoomHandler,
		http.NewMessageHandler,
		ws.NewHub,
		http.NewRouter,
		wire.Struct(new(http.RouterOptions), "*"),
		app.NewApp,
	)
	return &app.App{}, nil, nil
}
