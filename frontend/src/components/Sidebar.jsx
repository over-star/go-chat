import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/userService'
import { roomService } from '../services/roomService'
import { friendGroupService } from '../services/friendGroupService'
import errorHandler from '../utils/errorHandler'
import {
    MessageCircle, Users, UserPlus, Search, Plus, LogOut, Hash, Loader2,
    ChevronDown, ChevronRight, FolderPlus, Trash2, X, MoreVertical, Settings, UserMinus
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { cn } from '../lib/utils'
import CreateRoomModal from './CreateRoomModal'
import AddFriendModal from './AddFriendModal'
import ManageGroupsModal from './ManageGroupsModal'

function Sidebar({ rooms, selectedRoom, onRoomSelect, onRoomCreated, onRoomDeleted, user }) {
    const { logout } = useAuth()
    const [activeTab, setActiveTab] = useState('rooms')
    const [friends, setFriends] = useState([])
    const [groups, setGroups] = useState([])
    const [friendRequests, setFriendRequests] = useState([])
    const [showCreateRoom, setShowCreateRoom] = useState(false)
    const [showAddFriend, setShowAddFriend] = useState(false)
    const [showManageGroups, setShowManageGroups] = useState(false)
    const [loading, setLoading] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState(new Set(['Ungrouped']))

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

    const handleRemoveFriend = async (friendId) => {
        if (!confirm('Are you sure you want to remove this friend?')) return
        try {
            await userService.removeFriend(friendId)
            loadFriends()
            errorHandler.success('Friend removed')
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
            const response = await roomService.createRoom(friend.friend_info.username, 'private', [friend.friend_info.id])
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

    const handleDeleteRoom = async (room) => {
        const isCreator = user?.id === room.creator_id
        const action = (room.type === 'group' && isCreator) ? 'delete' : 'leave'
        
        if (!confirm(`Are you sure you want to ${action} this chat?`)) return
        
        try {
            setLoading(true)
            if (room.type === 'group' && isCreator) {
                await roomService.deleteRoom(room.id)
            } else {
                await roomService.leaveRoom(room.id)
            }
            onRoomDeleted(room.id)
            errorHandler.success(`Chat ${action}d successfully`)
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
                                        onDelete={() => handleDeleteRoom(room)}
                                        currentUser={user}
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

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2 px-1">
                            <Button 
                                onClick={() => setShowAddFriend(true)} 
                                variant="outline" 
                                size="sm" 
                                className="h-9"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Friend
                            </Button>
                            <Button 
                                onClick={() => setShowManageGroups(true)} 
                                variant="outline" 
                                size="sm" 
                                className="h-9"
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Groups
                            </Button>
                        </div>

                        {showAddFriend && (
                            <AddFriendModal 
                                onClose={() => {
                                    setShowAddFriend(false)
                                    loadFriendRequests() // Check for new requests/friends
                                }} 
                            />
                        )}

                        {showManageGroups && (
                            <ManageGroupsModal 
                                groups={groups}
                                onGroupsChange={loadFriends}
                                onClose={() => setShowManageGroups(false)}
                            />
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
                                                onDelete={() => handleRemoveFriend(friend.friend_info.id)}
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
                                                onDelete={() => handleRemoveFriend(friend.friend_info.id)}
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

function RoomItem({ room, isSelected, onClick, onDelete, currentUser }) {
    const isCreator = currentUser?.id === room.creator_id
    const isGroup = room.type === 'group'

    return (
        <div className="group relative">
            <div
                onClick={onClick}
                className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
                    isSelected 
                        ? "bg-primary/15 shadow-sm ring-1 ring-primary/20" 
                        : "hover:bg-accent/80 active:scale-[0.98]"
                )}
            >
                <div className="relative">
                    <Avatar className={cn(
                        "transition-transform",
                        isSelected && "scale-105"
                    )}>
                        <AvatarImage src={room.avatar} />
                        <AvatarFallback className={cn(
                            isGroup ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" 
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        )}>
                            {isGroup ? <Users className="h-5 w-5" /> : room.name[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {room.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold ring-2 ring-background">
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <p className={cn(
                                "font-bold text-sm truncate",
                                isSelected ? "text-primary" : "text-foreground"
                            )}>
                                {room.name}
                            </p>
                        </div>
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter shrink-0",
                            isGroup 
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" 
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        )}>
                            {isGroup ? 'Group' : 'Private'}
                        </span>
                    </div>
                    {room.last_message ? (
                        <p className="text-xs text-muted-foreground truncate italic">
                            <span className="font-semibold not-italic">{room.last_message.sender?.username}: </span>
                            {room.last_message.content || 'Sent a file'}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground/60 italic">No messages yet</p>
                    )}
                </div>
            </div>
            
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                }}
                title={room.type === 'group' && isCreator ? "Delete room" : "Leave chat"}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

function FriendItem({ friend, onStartChat, groups, onMoveToGroup, onDelete }) {
    return (
        <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
            <div className="flex flex-1 items-center gap-2 min-w-0" onClick={onStartChat}>
                <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.friend_info.avatar} />
                    <AvatarFallback>{friend.friend_info.username[0]}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm truncate">{friend.friend_info.username}</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <select
                    className="text-[10px] bg-background border rounded px-1 h-5 w-20 outline-none"
                    value={friend.group_id || ''}
                    onChange={(e) => onMoveToGroup(friend.friend_info.id, e.target.value ? parseInt(e.target.value) : null)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="">Move to...</option>
                    <option value="">None</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                >
                    <UserMinus className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}

export default Sidebar
