package app

import (
	"chat-backend/internal/interfaces/ws"
	"github.com/gin-gonic/gin"
)

type App struct {
	Engine *gin.Engine
	Hub    *ws.Hub
}

func NewApp(engine *gin.Engine, hub *ws.Hub) *App {
	return &App{
		Engine: engine,
		Hub:    hub,
	}
}
