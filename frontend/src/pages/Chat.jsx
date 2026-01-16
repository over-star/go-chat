import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'
import RoomInfo from '../components/RoomInfo'
import FriendDetail from '../components/FriendDetail'
import { roomService } from '../services/roomService'
import { userService } from '../services/userService'
import { friendGroupService } from '../services/friendGroupService'
import errorHandler from '../utils/errorHandler'
import { useWebSocket } from '../context/WebSocketContext'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

function Chat() {
    const { user, isAuthenticated, loading } = useAuth()
    const { lastMessage } = useWebSocket()
    const navigate = useNavigate()
    const [rooms, setRooms] = useState([])
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [selectedFriend, setSelectedFriend] = useState(null)
    const [friends, setFriends] = useState([])
    const [groups, setGroups] = useState([])
    const [loadingRooms, setLoadingRooms] = useState(true)
    const [showRoomInfo, setShowRoomInfo] = useState(false)
    const [sidebarTab, setSidebarTab] = useState('rooms')
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const initialLoadRef = useRef(false)
    const selectedRoomRef = useRef(selectedRoom)
    const selectedFriendRef = useRef(selectedFriend)

    useEffect(() => {
        selectedRoomRef.current = selectedRoom
    }, [selectedRoom])

    useEffect(() => {
        selectedFriendRef.current = selectedFriend
    }, [selectedFriend])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/login')
        }
    }, [isAuthenticated, loading, navigate])

    useEffect(() => {
        if (!isAuthenticated) {
            initialLoadRef.current = false
            return
        }

        if (!initialLoadRef.current) {
            initialLoadRef.current = true
            loadRooms().then((loadedRooms) => {
                if (loadedRooms && loadedRooms.length > 0) {
                    // Use ref to check the latest selection state
                    // as this async callback might run after user manual selection
                    if (selectedRoomRef.current || selectedFriendRef.current) return

                    // Skip auto-selection on mobile to show the room list first
                    if (window.innerWidth < 768) return

                    const savedRoomId = localStorage.getItem('lastRoomId')
                    if (savedRoomId) {
                        const room = loadedRooms.find(r => r.id.toString() === savedRoomId)
                        if (room) {
                            setSelectedRoom(room)
                        } else {
                            setSelectedRoom(loadedRooms[0])
                        }
                    } else {
                        setSelectedRoom(loadedRooms[0])
                    }
                }
            })
            loadFriends()
        }
    }, [isAuthenticated])

    const loadFriends = async () => {
        try {
            const [friendsRes, groupsRes] = await Promise.all([
                userService.getFriends(),
                friendGroupService.getGroups()
            ])
            if (friendsRes.data) setFriends(friendsRes.data)
            if (groupsRes.data) setGroups(groupsRes.data)
        } catch (error) { }
    }

    const loadRooms = async () => {
        try {
            const response = await roomService.getRooms()
            if (response.data) {
                setRooms(response.data)
                return response.data
            }
        } catch (error) {
            // Global error handler will show toast
        } finally {
            setLoadingRooms(false)
        }
        return null
    }

    const handleRoomSelect = (room) => {
        setSelectedRoom(room)
        setSelectedFriend(null)
        setSidebarTab('rooms')
        if (room) {
            localStorage.setItem('lastRoomId', room.id.toString())
            markRoomAsRead(room.id)
        }
    }

    const markRoomAsRead = (roomId) => {
        setRooms(prev => prev.map(r =>
            r.id === roomId ? { ...r, unread_count: 0 } : r
        ))
    }

    const handleMessagesRead = (roomId) => {
        markRoomAsRead(roomId)
        loadRooms()
    }

    const handleRoomCreated = (newRoom) => {
        // Clear selected friend when room is created (e.g. from starting a chat)
        setSelectedFriend(null)
        setSidebarTab('rooms')
        // Check if room already exists (e.g., private chat room)
        const existingRoom = rooms.find(r => r.id === newRoom.id)
        if (existingRoom) {
            // Room already exists, just select it
            setSelectedRoom(existingRoom)
            localStorage.setItem('lastRoomId', existingRoom.id.toString())
        } else {
            // New room, add to list and select
            setRooms(prev => [newRoom, ...prev])
            setSelectedRoom(newRoom)
            localStorage.setItem('lastRoomId', newRoom.id.toString())
        }
    }

    const handleRoomDeleted = (roomId) => {
        setRooms(prev => {
            const filtered = prev.filter(r => r.id !== roomId)
            if (selectedRoomRef.current?.id === roomId) {
                const nextRoom = filtered[0] || null
                setSelectedRoom(nextRoom)
                setSelectedFriend(null)
                if (nextRoom) {
                    localStorage.setItem('lastRoomId', nextRoom.id.toString())
                } else {
                    localStorage.removeItem('lastRoomId')
                }
            }
            return filtered
        })
    }

    const handleRoomUpdated = (updatedRoom) => {
        setRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r))
        if (selectedRoomRef.current?.id === updatedRoom.id) {
            setSelectedRoom(updatedRoom)
        }
    }

    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === 'message' && lastMessage.data?.message) {
                const newMsg = lastMessage.data.message
                
                // Update the room's unread count and last message
                setRooms(prev => {
                    const updatedRooms = prev.map(r => {
                        if (r.id === newMsg.room_id) {
                            const isNotSelected = newMsg.room_id !== selectedRoomRef.current?.id
                            const isNotOwn = newMsg.sender?.id !== user?.id
                            
                            return {
                                ...r,
                                unread_count: (isNotSelected && isNotOwn) ? (r.unread_count || 0) + 1 : r.unread_count,
                                last_message: newMsg
                            }
                        }
                        return r
                    })

                    // Also update selectedRoom if it's the current room to keep it in sync
                    if (selectedRoomRef.current?.id === newMsg.room_id) {
                        const updatedSelectedRoom = updatedRooms.find(r => r.id === newMsg.room_id)
                        if (updatedSelectedRoom) {
                            setSelectedRoom(updatedSelectedRoom)
                        }
                    }

                    return updatedRooms
                })
            } else if (lastMessage.type === 'read_receipt' && lastMessage.data) {
                const { room_id, last_read_message_id, user_id } = lastMessage.data
                setRooms(prev => prev.map(r => {
                    if (r.id === room_id) {
                        const updatedReadStatus = [...(r.read_status || [])]
                        const idx = updatedReadStatus.findIndex(rs => rs.user_id === user_id)
                        if (idx > -1) {
                            if (last_read_message_id > updatedReadStatus[idx].last_read_message_id) {
                                updatedReadStatus[idx] = { ...updatedReadStatus[idx], last_read_message_id }
                            }
                        } else {
                            updatedReadStatus.push({ room_id, user_id, last_read_message_id })
                        }
                        
                        let unreadCount = r.unread_count
                        if (user_id === user?.id) {
                            unreadCount = 0
                        }

                        const updatedRoom = { ...r, read_status: updatedReadStatus, unread_count: unreadCount }
                        if (selectedRoomRef.current?.id === room_id) {
                            setSelectedRoom(updatedRoom)
                        }
                        return updatedRoom
                    }
                    return r
                }))
            }
        }
    }, [lastMessage, user])

    const handleFriendSelect = (friend) => {
        setSelectedFriend(friend)
        setSelectedRoom(null)
        setSidebarTab('friends')
    }

    const handleSendMessage = async (friend) => {
        try {
            const response = await roomService.createRoom(friend.friend_info.username, 'private', [friend.friend_info.id])
            if (response.data) {
                handleRoomCreated(response.data)
            }
        } catch (error) { }
    }

    const handleRemoveFriend = async (friendId) => {
        try {
            await userService.removeFriend(friendId)
            errorHandler.success('好友已删除')
            loadFriends()
            if (selectedFriend?.friend_info.id === friendId) {
                setSelectedFriend(null)
            }
        } catch (error) { }
    }

    const handleMoveGroup = async (friendId, groupId) => {
        try {
            const gid = groupId ? parseInt(groupId) : null
            await friendGroupService.setFriendGroup(friendId, gid)
            loadFriends()
            // Update selected friend state to reflect group change
            if (selectedFriend?.friend_info.id === friendId) {
                setSelectedFriend(prev => prev ? { ...prev, group_id: gid } : null)
            }
        } catch (error) { }
    }

    const handleBack = () => {
        setSelectedRoom(null)
        setSelectedFriend(null)
    }

    if (loading || loadingRooms) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="h-screen flex bg-background overflow-hidden">
            {/* Sidebar */}
            <div className={cn(
                "h-full border-r transition-all duration-300 ease-in-out shrink-0",
                isMobile 
                    ? (selectedRoom || selectedFriend ? "w-0 overflow-hidden hidden" : "w-full") 
                    : "w-80"
            )}>
                <Sidebar
                    rooms={rooms}
                    selectedRoom={selectedRoom}
                    onRoomSelect={handleRoomSelect}
                    onRoomCreated={handleRoomCreated}
                    onRoomDeleted={handleRoomDeleted}
                    selectedFriend={selectedFriend}
                    onFriendSelect={handleFriendSelect}
                    friends={friends}
                    groups={groups}
                    onFriendsRefresh={loadFriends}
                    user={user}
                    activeTab={sidebarTab}
                    onTabChange={setSidebarTab}
                />
            </div>

            {/* Main Chat Area */}
            <div className={cn(
                "flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out",
                isMobile && !(selectedRoom || selectedFriend) ? "w-0 h-0 overflow-hidden hidden" : "flex"
            )}>
                {selectedFriend ? (
                    <FriendDetail
                        friend={selectedFriend}
                        groups={groups}
                        onSendMessage={handleSendMessage}
                        onRemoveFriend={handleRemoveFriend}
                        onMoveGroup={handleMoveGroup}
                        onBack={handleBack}
                    />
                ) : (
                    <ChatArea
                        room={selectedRoom}
                        onToggleInfo={() => setShowRoomInfo(!showRoomInfo)}
                        showRoomInfo={showRoomInfo}
                        onMessagesRead={handleMessagesRead}
                        onBack={handleBack}
                    />
                )}
            </div>

            {/* Room Info Panel */}
            {showRoomInfo && selectedRoom && (
                <div className={cn(
                    "fixed inset-0 z-50 md:relative md:inset-auto md:z-0 md:w-80 md:border-l bg-background",
                    isMobile && "w-full"
                )}>
                    <RoomInfo
                        room={selectedRoom}
                        onClose={() => setShowRoomInfo(false)}
                        onRoomDeleted={handleRoomDeleted}
                        onRoomUpdated={handleRoomUpdated}
                    />
                </div>
            )}
        </div>
    )
}

export default Chat
