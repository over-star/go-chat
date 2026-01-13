import api from './api'

export const userService = {
    getProfile: async () => {
        const response = await api.get('/users/profile')
        return response.data
    },

    updateProfile: async (data) => {
        const response = await api.put('/users/profile', data)
        return response.data
    },

    searchUsers: async (query) => {
        const response = await api.get(`/users/search?q=${query}`)
        return response.data
    },

    getFriends: async () => {
        const response = await api.get('/users/friends')
        return response.data
    },

    getFriendRequests: async () => {
        const response = await api.get('/users/friend-requests')
        return response.data
    },

    addFriend: async (friendId) => {
        const response = await api.post('/users/friends', { friend_id: friendId })
        return response.data
    },

    acceptFriend: async (friendId) => {
        const response = await api.post('/users/friends/accept', { friend_id: friendId })
        return response.data
    },

    removeFriend: async (friendId) => {
        const response = await api.delete(`/users/friends/${friendId}`)
        return response.data
    },
}
