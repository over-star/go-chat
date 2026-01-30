package http

import (
	"chat-backend/internal/app/command"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type MarketHandler struct {
	marketCommand *command.MarketHandler
}

func NewMarketHandler(marketCommand *command.MarketHandler) *MarketHandler {
	return &MarketHandler{marketCommand: marketCommand}
}

func (h *MarketHandler) GetPrices(c *gin.Context) {
	prices, err := h.marketCommand.GetPrices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, prices)
}

func (h *MarketHandler) GetHistory(c *gin.Context) {
	symbol := c.Query("symbol")
	hoursStr := c.DefaultQuery("hours", "24")
	hours, _ := strconv.Atoi(hoursStr)

	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "symbol is required"})
		return
	}

	history, err := h.marketCommand.GetHistory(symbol, hours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}
