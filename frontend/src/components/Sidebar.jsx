import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/userService'
import { roomService } from '../services/roomService'
import { friendGroupService } from '../services/friendGroupService'
import errorHandler from '../utils/errorHandler'
import {
    MessageCircle, Users, UserPlus, Search, Plus, LogOut, Hash, Loader2,
    ChevronDown, ChevronRight, FolderPlus, Trash2, X, MoreVertical, Settings
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { cn } from '../lib/utils'
import CreateRoomModal from './CreateRoomModal'

function Sidebar({ rooms, selectedRoom, onRoomSelect, onRoomCreated, user }) {
    const { logout } = useAuth()
    const [activeTab, setActiveTab] = useState('rooms')
    const [friends, setFriends] = useState([])
    const [groups, setGroups] = useState([])
    const [friendRequests, setFriendRequests] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [showCreateRoom, setShowCreateRoom] = useState(false)
    const [loading, setLoading] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState(new Set(['Ungrouped']))
    const [isManagingGroups, setIsManagingGroups] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')

    useEffect(() => {
        if (activeTab === 'friends') {
            loadFriends()
            loadFriendRequests()
        }
    }, [activeTab])

    useEffect(() => {
        if (showCreateRoom && friends.length === 0) {
            loadFriends()
        }
    }, [showCreateRoom])

    const loadFriends = async () => {
        try {
            const [friendsRes, groupsRes] = await Promise.all([
                userService.getFriends(),
                friendGroupService.getGroups()
            ])
            if (friendsRes.data) setFriends(friendsRes.data)
            if (groupsRes.data) setGroups(groupsRes.data)
        } catch (error) {
            // Global handler
        }
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return
        try {
            await friendGroupService.createGroup(newGroupName)
            setNewGroupName('')
            loadFriends()
            errorHandler.success('Group created')
        } catch (error) { }
    }

    const handleDeleteGroup = async (id) => {
        if (!confirm('Are you sure you want to delete this group? Friends in this group will be moved to Ungrouped.')) return
        try {
            await friendGroupService.deleteGroup(id)
            loadFriends()
            errorHandler.success('Group deleted')
        } catch (error) { }
    }

    const handleSetFriendGroup = async (friendId, groupId) => {
        try {
            await friendGroupService.setFriendGroup(friendId, groupId ? parseInt(groupId) : null)
            loadFriends()
        } catch (error) { }
    }

    const toggleGroupExpand = (groupName) => {
        const newExpanded = new Set(expandedGroups)
        if (newExpanded.has(groupName)) {
            newExpanded.delete(groupName)
        } else {
            newExpanded.add(groupName)
        }
        setExpandedGroups(newExpanded)
    }

    const loadFriendRequests = async () => {
        try {
            const response = await userService.getFriendRequests()
            if (response.data) setFriendRequests(response.data)
        } catch (error) {
            // Global handler
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
            // Silent fail for search often better, or global handler
        }
    }

    const handleAddFriend = async (friendId) => {
        try {
            await userService.addFriend(friendId)
            setSearchResults([])
            setSearchQuery('')
            errorHandler.success('Friend request sent')
        } catch (error) {
            // Global handler
        }
    }

    const handleAcceptFriend = async (friendId) => {
        try {
            await userService.acceptFriend(friendId)
            loadFriends()
            loadFriendRequests()
            errorHandler.success('Friend request accepted')
        } catch (error) {
            // Global handler
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
            // Global handler
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
                        <Button onClick={() => setShowCreateRoom(true)} className="w-full mb-2">
                            <Plus className="h-4 w-4 mr-2" />
                            New Group Chat
                        </Button>

                        {showCreateRoom && (
                            <CreateRoomModal
                                friends={friends}
                                groups={groups}
                                onRoomCreated={(room) => {
                                    onRoomCreated(room)
                                    setShowCreateRoom(false)
                                }}
                                onClose={() => setShowCreateRoom(false)}
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
                                        onClick={() => {
                                            if (selectedRoom?.id !== room.id) {
                                                onRoomSelect(room)
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-2 space-y-4">
                        {/* Friend Requests */}
                        {friendRequests.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
                                    Friend Requests ({friendRequests.length})
                                </p>
                                <div className="space-y-1">
                                    {friendRequests.map(request => (
                                        <div key={request.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={request.user.avatar} />
                                                <AvatarFallback>{request.user.username[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1 text-sm truncate">{request.user.username}</span>
                                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleAcceptFriend(request.user.id)}>
                                                Accept
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <div className="px-1">
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
                                        <div key={searchUser.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent border border-dashed">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={searchUser.avatar} />
                                                <AvatarFallback>{searchUser.username[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1 text-sm truncate">{searchUser.username}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddFriend(searchUser.id)}>
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Groups Management Toggle */}
                        <div className="flex items-center justify-between px-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Friends
                            </p>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-6 w-6", isManagingGroups && "text-primary")}
                                onClick={() => setIsManagingGroups(!isManagingGroups)}
                            >
                                <Settings className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        {isManagingGroups && (
                            <div className="px-2 pb-2 border rounded-md bg-muted/30 space-y-2 py-2">
                                <div className="flex gap-1">
                                    <Input
                                        placeholder="New group name"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="h-7 text-xs"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                                    />
                                    <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleCreateGroup}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="space-y-1">
                                    {groups.map(group => (
                                        <div key={group.id} className="flex items-center justify-between text-xs p-1 rounded hover:bg-accent">
                                            <span className="truncate">{group.name}</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDeleteGroup(group.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Friends List with Groups */}
                        <div className="space-y-1">
                            {/* Grouped Friends */}
                            {groups.map(group => {
                                const groupFriends = friends.filter(f => f.group_id === group.id)
                                return (
                                    <div key={group.id} className="space-y-1">
                                        <button
                                            onClick={() => toggleGroupExpand(group.name)}
                                            className="flex items-center gap-1 w-full text-left text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors py-1 px-2"
                                        >
                                            {expandedGroups.has(group.name) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            {group.name.toUpperCase()} ({groupFriends.length})
                                        </button>

                                        {expandedGroups.has(group.name) && groupFriends.map(friend => (
                                            <FriendItem
                                                key={friend.id}
                                                friend={friend}
                                                groups={groups}
                                                onStartChat={() => handleStartPrivateChat(friend)}
                                                onMoveToGroup={handleSetFriendGroup}
                                            />
                                        ))}
                                    </div>
                                )
                            })}

                            {/* Ungrouped Friends */}
                            {(() => {
                                const ungrouped = friends.filter(f => !f.group_id)
                                return (
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => toggleGroupExpand('Ungrouped')}
                                            className="flex items-center gap-1 w-full text-left text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors py-1 px-2"
                                        >
                                            {expandedGroups.has('Ungrouped') ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            UNGROUPED ({ungrouped.length})
                                        </button>

                                        {expandedGroups.has('Ungrouped') && ungrouped.map(friend => (
                                            <FriendItem
                                                key={friend.id}
                                                friend={friend}
                                                groups={groups}
                                                onStartChat={() => handleStartPrivateChat(friend)}
                                                onMoveToGroup={handleSetFriendGroup}
                                            />
                                        ))}
                                    </div>
                                )
                            })()}
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

function FriendItem({ friend, onStartChat, groups, onMoveToGroup }) {
    return (
        <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
            <div className="flex flex-1 items-center gap-2 min-w-0" onClick={onStartChat}>
                <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.friend.avatar} />
                    <AvatarFallback>{friend.friend.username[0]}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm truncate">{friend.friend.username}</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <select
                    className="text-[10px] bg-background border rounded px-1 h-5 w-20 outline-none"
                    value={friend.group_id || ''}
                    onChange={(e) => onMoveToGroup(friend.friend.id, e.target.value || null)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="">Move to...</option>
                    <option value="">None</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
                <MessageCircle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); onStartChat(); }} />
            </div>
        </div>
    )
}

export default Sidebar
