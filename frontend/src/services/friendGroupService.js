import api from './api'

export const friendGroupService = {
    getGroups: async () => {
        const response = await api.get('/friend-groups')
        return response.data
    },
    createGroup: async (name) => {
        const response = await api.post('/friend-groups', { name })
        return response.data
    },
    updateGroup: async (id, name) => {
        const response = await api.put(`/friend-groups/${id}`, { name })
        return response.data
    },
    deleteGroup: async (id) => {
        const response = await api.delete(`/friend-groups/${id}`)
        return response.data
    },
    setFriendGroup: async (friendId, groupId) => {
        const response = await api.post('/users/friends/set-group', {
            friend_id: friendId,
            group_id: groupId
        })
        return response.data
    }
}
