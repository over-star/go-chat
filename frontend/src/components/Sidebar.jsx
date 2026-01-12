import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/userService'
import { roomService } from '../services/roomService'
import { MessageCircle, Users, UserPlus, Search, Plus, LogOut, Hash, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { cn } from '../lib/utils'

function Sidebar({ rooms, selectedRoom, onRoomSelect, onRoomCreated, user }) {
    const { logout } = useAuth()
    const [activeTab, setActiveTab] = useState('rooms')
    const [friends, setFriends] = useState([])
    const [friendRequests, setFriendRequests] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [showCreateRoom, setShowCreateRoom] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (activeTab === 'friends') {
            loadFriends()
            loadFriendRequests()
        }
    }, [activeTab])

    const loadFriends = async () => {
        try {
            const response = await userService.getFriends()
            if (response.data) setFriends(response.data)
        } catch (error) {
            console.error('Failed to load friends:', error)
        }
    }

    const loadFriendRequests = async () => {
        try {
            const response = await userService.getFriendRequests()
            if (response.data) setFriendRequests(response.data)
        } catch (error) {
            console.error('Failed to load friend requests:', error)
        }
    }

    const handleSearch = async (query) => {
        setSearchQuery(query)
        if (query.trim().length < 2) {
            setSearchResults([])
            return
        }

        try {
            const response = await userService.searchUsers(query)
            if (response.data) setSearchResults(response.data)
        } catch (error) {
            console.error('Search failed:', error)
        }
    }

    const handleAddFriend = async (friendId) => {
        try {
            await userService.addFriend(friendId)
            setSearchResults([])
            setSearchQuery('')
        } catch (error) {
            console.error('Failed to add friend:', error)
        }
    }

    const handleAcceptFriend = async (friendId) => {
        try {
            await userService.acceptFriend(friendId)
            loadFriends()
            loadFriendRequests()
        } catch (error) {
            console.error('Failed to accept friend:', error)
        }
    }

    const handleStartPrivateChat = async (friend) => {
        try {
            setLoading(true)
            const response = await roomService.createRoom(friend.friend.username, 'private', [friend.friend.id])
            if (response.data) {
                onRoomCreated(response.data)
                setActiveTab('rooms')
            }
        } catch (error) {
            console.error('Failed to create private chat:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-80 border-r bg-card flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{user?.username}</p>
                            <p className="text-xs text-muted-foreground">Online</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={logout}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="rooms" className="text-xs">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Chats
                        </TabsTrigger>
                        <TabsTrigger value="friends" className="text-xs relative">
                            <Users className="h-3 w-3 mr-1" />
                            Friends
                            {friendRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                                    {friendRequests.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                {activeTab === 'rooms' ? (
                    <div className="p-2">
                        <Button onClick={() => setShowCreateRoom(!showCreateRoom)} className="w-full mb-2">
                            <Plus className="h-4 w-4 mr-2" />
                            New Group Chat
                        </Button>

                        {showCreateRoom && (
                            <CreateRoomForm
                                friends={friends}
                                onRoomCreated={(room) => {
                                    onRoomCreated(room)
                                    setShowCreateRoom(false)
                                }}
                                onCancel={() => setShowCreateRoom(false)}
                            />
                        )}

                        {rooms.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No chats yet</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {rooms.map(room => (
                                    <RoomItem
                                        key={room.id}
                                        room={room}
                                        isSelected={selectedRoom?.id === room.id}
                                        onClick={() => onRoomSelect(room)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-2">
                        {/* Friend Requests */}
                        {friendRequests.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                                    FRIEND REQUESTS ({friendRequests.length})
                                </p>
                                <div className="space-y-1">
                                    {friendRequests.map(request => (
                                        <div key={request.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={request.user.avatar} />
                                                <AvatarFallback>{request.user.username[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1 text-sm truncate">{request.user.username}</span>
                                            <Button size="sm" onClick={() => handleAcceptFriend(request.user.id)}>
                                                Accept
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>

                            {searchResults.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {searchResults.map(searchUser => (
                                        <div key={searchUser.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={searchUser.avatar} />
                                                <AvatarFallback>{searchUser.username[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1 text-sm truncate">{searchUser.username}</span>
                                            <Button variant="ghost" size="icon" onClick={() => handleAddFriend(searchUser.id)}>
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Friends List */}
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                                FRIENDS ({friends.length})
                            </p>
                            <div className="space-y-1">
                                {friends.map(friend => (
                                    <div
                                        key={friend.id}
                                        onClick={() => handleStartPrivateChat(friend)}
                                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={friend.friend.avatar} />
                                            <AvatarFallback>{friend.friend.username[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="flex-1 text-sm truncate">{friend.friend.username}</span>
                                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}

function RoomItem({ room, isSelected, onClick }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-accent"
            )}
        >
            <div className="relative">
                <Avatar>
                    <AvatarImage src={room.avatar} />
                    <AvatarFallback>{room.name[0]}</AvatarFallback>
                </Avatar>
                {room.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold">
                        {room.unread_count > 99 ? '99+' : room.unread_count}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                    {room.type === 'group' && <Hash className="h-3 w-3 text-muted-foreground" />}
                    <p className="font-semibold text-sm truncate">{room.name}</p>
                </div>
                {room.last_message && (
                    <p className="text-xs text-muted-foreground truncate">
                        {room.last_message.sender?.username}: {room.last_message.content || 'Sent a file'}
                    </p>
                )}
            </div>
        </div>
    )
}

function CreateRoomForm({ friends, onRoomCreated, onCancel }) {
    const [roomName, setRoomName] = useState('')
    const [selectedFriends, setSelectedFriends] = useState([])
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!roomName.trim() || selectedFriends.length === 0) return

        try {
            setLoading(true)
            const response = await roomService.createRoom(roomName, 'group', selectedFriends)
            if (response.data) onRoomCreated(response.data)
        } catch (error) {
            console.error('Failed to create room:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-accent p-3 rounded-lg mb-2">
            <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                    placeholder="Room name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="h-9"
                />

                <div>
                    <p className="text-xs text-muted-foreground mb-2">Select members:</p>
                    <ScrollArea className="h-32">
                        <div className="space-y-1">
                            {friends.map(friend => (
                                <label key={friend.id} className="flex items-center gap-2 p-2 rounded hover:bg-background cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedFriends.includes(friend.friend.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedFriends([...selectedFriends, friend.friend.id])
                                            } else {
                                                setSelectedFriends(selectedFriends.filter(id => id !== friend.friend.id))
                                            }
                                        }}
                                    />
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={friend.friend.avatar} />
                                        <AvatarFallback className="text-xs">{friend.friend.username[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{friend.friend.username}</span>
                                </label>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="flex-1 h-9">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                    </Button>
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-9">
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default Sidebar
