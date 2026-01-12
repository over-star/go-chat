import api from './api'

export const messageService = {
    getMessages: async (roomId, page = 1, limit = 50) => {
        const response = await api.get(`/rooms/${roomId}/messages?page=${page}&limit=${limit}`)
        return response.data
    },

    uploadFile: async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await api.post('/messages/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        return response.data
    },

    markAsRead: async (messageIds) => {
        const response = await api.post('/messages/read', { message_ids: messageIds })
        return response.data
    },
}
