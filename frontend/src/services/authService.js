import api from './api'

export const authService = {
    register: async (username, nickname, email, password) => {
        const response = await api.post('/auth/register', { username, nickname, email, password })
        return response.data
    },

    login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password })
        return response.data
    },

    logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    },
}
