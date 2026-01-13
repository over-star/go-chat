import React, { useState } from 'react'
import { X, Search, UserPlus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { userService } from '../services/userService'
import { useAuth } from '../context/AuthContext'
import errorHandler from '../utils/errorHandler'

export default function AddFriendModal({ onClose }) {
    const { user: currentUser } = useAuth()
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [loading, setLoading] = useState(false)

    const handleSearch = async (e) => {
        const query = e.target.value
        setSearchQuery(query)
        if (query.trim().length < 2) {
            setSearchResults([])
            return
        }

        try {
            const response = await userService.searchUsers(query)
            if (response.data) {
                // Double check filtering on frontend
                setSearchResults(response.data.filter(u => u.id !== currentUser?.id))
            }
        } catch (error) {
            // Error handled by interceptor
        }
    }

    const handleAddFriend = async (friendId) => {
        try {
            setLoading(true)
            await userService.addFriend(friendId)
            errorHandler.success('好友请求已发送')
            // Optionally remove from search results or show "Sent"
            setSearchResults(results => results.filter(u => u.id !== friendId))
        } catch (error) {
            // Error handled by interceptor
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md border shadow-lg rounded-xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">添加好友</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="按用户名搜索..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="pl-8"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {searchResults.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {searchQuery.trim().length < 2 ? '输入至少 2 个字符以搜索' : '未找到用户'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {searchResults.map(user => (
                                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent border border-transparent hover:border-border transition-all">
                                    <Avatar>
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 font-medium">{user.username}</span>
                                    {user.friend_status === 'accepted' ? (
                                        <Button size="sm" variant="ghost" disabled className="text-muted-foreground">
                                            已添加
                                        </Button>
                                    ) : user.friend_status === 'pending' ? (
                                        <Button size="sm" variant="ghost" disabled className="text-muted-foreground">
                                            申请中
                                        </Button>
                                    ) : (
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleAddFriend(user.id)}
                                            disabled={loading}
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            添加
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
