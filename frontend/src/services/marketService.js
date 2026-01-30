import api from './api'

export const marketService = {
    getPrices: () => api.get('/market/prices'),
    getHistory: (symbol, hours = 24) => api.get(`/market/history?symbol=${encodeURIComponent(symbol)}&hours=${hours}`),
}
