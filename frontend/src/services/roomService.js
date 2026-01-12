import api from './api'

export const roomService = {
    getRooms: async () => {
        const response = await api.get('/rooms')
        return response.data
    },

    getRoom: async (roomId) => {
        const response = await api.get(`/rooms/${roomId}`)
        return response.data
    },

    createRoom: async (name, type, memberIds) => {
        const response = await api.post('/rooms', {
            name,
            type,
            member_ids: memberIds,
        })
        return response.data
    },

    leaveRoom: async (roomId) => {
        const response = await api.post(`/rooms/${roomId}/leave`)
        return response.data
    },

    deleteRoom: async (roomId) => {
        const response = await api.delete(`/rooms/${roomId}`)
        return response.data
    },
}
