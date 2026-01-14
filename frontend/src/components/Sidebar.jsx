import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/userService'
import { roomService } from '../services/roomService'
import { friendGroupService } from '../services/friendGroupService'
import errorHandler from '../utils/errorHandler'
import {
    MessageCircle, Users, UserPlus, Search, Plus, LogOut, Hash, Loader2,
    ChevronDown, ChevronRight, FolderPlus, Trash2, X, MoreVertical, Settings, UserMinus, ArrowRightLeft
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
import ProfileModal from './ProfileModal'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog"

function Sidebar({ rooms, selectedRoom, onRoomSelect, onRoomCreated, onRoomDeleted, selectedFriend, onFriendSelect, friends, groups, onFriendsRefresh, user }) {
    const { logout } = useAuth()
    const [activeTab, setActiveTab] = useState('rooms')
    const [friendRequests, setFriendRequests] = useState([])
    const [showCreateRoom, setShowCreateRoom] = useState(false)
    const [showAddFriend, setShowAddFriend] = useState(false)
    const [showManageGroups, setShowManageGroups] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [loading, setLoading] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState(new Set(['Ungrouped']))
    const [contextMenu, setContextMenu] = useState(null)

    const [confirmConfig, setConfirmConfig] = useState(null)

    useEffect(() => {
        const handleCloseMenu = () => setContextMenu(null)
        window.addEventListener('click', handleCloseMenu)
        return () => window.removeEventListener('click', handleCloseMenu)
    }, [])

    useEffect(() => {
        if (activeTab === 'friends') {
            onFriendsRefresh()
            loadFriendRequests()
        }
    }, [activeTab])

    useEffect(() => {
        if (showCreateRoom && friends.length === 0) {
            onFriendsRefresh()
        }
    }, [showCreateRoom])

    const handleRemoveFriend = async (friendId) => {
        setConfirmConfig({
            title: '删除好友',
            description: '确定要删除该好友吗？',
            onConfirm: async () => {
                try {
                    await userService.removeFriend(friendId)
                    onFriendsRefresh()
                    errorHandler.success('好友已删除')
                } catch (error) { }
            }
        })
    }

    const handleSetFriendGroup = async (friendId, groupId) => {
        try {
            await friendGroupService.setFriendGroup(friendId, groupId ? parseInt(groupId) : null)
            onFriendsRefresh()
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

    const handleContextMenu = (e, friend) => {
        e.preventDefault()
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            friend
        })
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
            onFriendsRefresh()
            loadFriendRequests()
            errorHandler.success('好友申请已接受')
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
        const action = (room.type === 'group' && isCreator) ? '删除' : '离开'
        
        setConfirmConfig({
            title: `${action}聊天`,
            description: `确定要${action}该聊天吗？`,
            onConfirm: async () => {
                try {
                    setLoading(true)
                    if (room.type === 'group' && isCreator) {
                        await roomService.deleteRoom(room.id)
                    } else {
                        await roomService.leaveRoom(room.id)
                    }
                    onRoomDeleted(room.id)
                    errorHandler.success(`聊天已${action}`)
                } catch (error) {
                    // Global handler
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    return (
        <div className="w-80 border-r bg-card flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                    <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 p-1 rounded-lg transition-colors group"
                        onClick={() => setShowProfile(true)}
                        title="点击修改资料"
                    >
                        <div className="relative">
                            <Avatar>
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Settings className="h-3 w-3 text-white" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold text-sm truncate">{user?.nickname || user?.username}</p>
                            <p className="text-xs text-muted-foreground">在线</p>
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
                            聊天
                        </TabsTrigger>
                        <TabsTrigger value="friends" className="text-xs relative">
                            <Users className="h-3 w-3 mr-1" />
                            好友
                            {friendRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                                    {friendRequests.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Actions */}
            <AlertDialog open={!!confirmConfig} onOpenChange={() => setConfirmConfig(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmConfig?.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmConfig?.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={confirmConfig?.onConfirm}
                        >
                            确定
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <ScrollArea className="flex-1">
                {activeTab === 'rooms' ? (
                    <div className="p-2">
                        <Button onClick={() => setShowCreateRoom(true)} className="w-full mb-2">
                            <Plus className="h-4 w-4 mr-2" />
                            发起群聊
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
                                <p>暂无聊天记录</p>
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
                                    好友申请 ({friendRequests.length})
                                </p>
                                <div className="space-y-1">
                                    {friendRequests.map(request => (
                                        <div key={request.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={request.user?.avatar} />
                                                <AvatarFallback>{request.user?.username?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1 text-sm truncate">{request.user?.username}</span>
                                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleAcceptFriend(request.user?.id)}>
                                                接受
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
                                添加好友
                            </Button>
                            <Button 
                                onClick={() => setShowManageGroups(true)} 
                                variant="outline" 
                                size="sm" 
                                className="h-9"
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                分组管理
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
                                onGroupsChange={onFriendsRefresh}
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
                                                isSelected={selectedFriend?.id === friend.id}
                                                onClick={() => onFriendSelect(friend)}
                                                onContextMenu={handleContextMenu}
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
                                            未分组 ({ungrouped.length})
                                        </button>

                                        {expandedGroups.has('Ungrouped') && ungrouped.map(friend => (
                                            <FriendItem
                                                key={friend.id}
                                                friend={friend}
                                                isSelected={selectedFriend?.id === friend.id}
                                                onClick={() => onFriendSelect(friend)}
                                                onContextMenu={handleContextMenu}
                                            />
                                        ))}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                )}
            </ScrollArea>

            {showProfile && (
                <ProfileModal 
                    onClose={() => setShowProfile(false)} 
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed z-[100] bg-card border rounded-md shadow-lg p-1 min-w-[160px] animate-in fade-in zoom-in duration-75"
                    style={{ 
                        top: Math.min(contextMenu.y, window.innerHeight - 200), 
                        left: Math.min(contextMenu.x, window.innerWidth - 170) 
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors"
                        onClick={() => {
                            handleStartPrivateChat(contextMenu.friend)
                            setContextMenu(null)
                        }}
                    >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        发送消息
                    </button>
                    
                    <div className="h-px bg-border my-1" />
                    
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        移动到分组
                    </div>
                    
                    <div className="max-h-[150px] overflow-y-auto">
                        <button
                            className={cn(
                                "flex items-center w-full px-2 py-1 text-sm rounded-sm hover:bg-accent transition-colors pl-6",
                                !contextMenu.friend.group_id && "bg-accent/50 text-primary font-medium"
                            )}
                            onClick={() => {
                                handleSetFriendGroup(contextMenu.friend.friend_info.id, null)
                                setContextMenu(null)
                            }}
                        >
                            未分组
                        </button>
                        {groups.map(g => (
                            <button
                                key={g.id}
                                className={cn(
                                    "flex items-center w-full px-2 py-1 text-sm rounded-sm hover:bg-accent transition-colors pl-6",
                                    contextMenu.friend.group_id === g.id && "bg-accent/50 text-primary font-medium"
                                )}
                                onClick={() => {
                                    handleSetFriendGroup(contextMenu.friend.friend_info.id, g.id)
                                    setContextMenu(null)
                                }}
                            >
                                {g.name}
                            </button>
                        ))}
                    </div>
                    
                    <div className="h-px bg-border my-1" />
                    
                    <button 
                        className="flex items-center w-full px-2 py-1.5 text-sm text-destructive rounded-sm hover:bg-destructive/10 transition-colors"
                        onClick={() => {
                            handleRemoveFriend(contextMenu.friend.friend_info.id)
                            setContextMenu(null)
                        }}
                    >
                        <UserMinus className="h-4 w-4 mr-2" />
                        删除好友
                    </button>
                </div>
            )}
        </div>
    )
}

function RoomItem({ room, isSelected, onClick, onDelete, currentUser }) {
    const isCreator = currentUser?.id === room.creator_id
    const isGroup = room.type === 'group'

    const otherMember = !isGroup ? room.members?.find(m => m.id !== currentUser?.id) : null
    const displayName = isGroup ? room.name : (otherMember?.nickname || otherMember?.username || room.name)
    const displayAvatar = isGroup ? room.avatar : (otherMember?.avatar || room.avatar)

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
                        <AvatarImage src={displayAvatar} />
                        <AvatarFallback className={cn(
                            isGroup ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" 
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        )}>
                            {isGroup ? <Users className="h-5 w-5" /> : displayName[0]?.toUpperCase()}
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
                                {displayName}
                            </p>
                        </div>
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter shrink-0",
                            isGroup 
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" 
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        )}>
                            {isGroup ? '群聊' : '私聊'}
                        </span>
                    </div>
                    {room.last_message ? (
                        <p className="text-xs text-muted-foreground truncate italic">
                            <span className="font-semibold not-italic">{room.last_message.sender?.nickname || room.last_message.sender?.username}: </span>
                            {room.last_message.content || '发送了一个文件'}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground/60 italic">暂无消息</p>
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
                title={room.type === 'group' && isCreator ? "解散群聊" : "退出聊天"}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

function FriendItem({ friend, isSelected, onClick, onContextMenu }) {
    return (
        <div 
            onClick={onClick}
            onContextMenu={(e) => onContextMenu(e, friend)}
            className={cn(
                "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                isSelected ? "bg-accent" : "hover:bg-accent/50"
            )}
        >
            <div className="flex flex-1 items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 ring-1 ring-border group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={friend.friend_info?.avatar} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">{friend.friend_info?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.friend_info?.username}</p>
                </div>
            </div>
        </div>
    )
}

export default Sidebar
