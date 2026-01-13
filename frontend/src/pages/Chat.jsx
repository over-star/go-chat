import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'
import RoomInfo from '../components/RoomInfo'
import { roomService } from '../services/roomService'
import { useWebSocket } from '../context/WebSocketContext'
import { Loader2 } from 'lucide-react'

function Chat() {
    const { user, isAuthenticated, loading } = useAuth()
    const { lastMessage } = useWebSocket()
    const navigate = useNavigate()
    const [rooms, setRooms] = useState([])
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [loadingRooms, setLoadingRooms] = useState(true)
    const [showRoomInfo, setShowRoomInfo] = useState(false)

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/login')
        }
    }, [isAuthenticated, loading, navigate])

    useEffect(() => {
        if (isAuthenticated) {
            loadRooms().then((loadedRooms) => {
                if (loadedRooms && loadedRooms.length > 0) {
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
        }
    }, [isAuthenticated])

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
        if (room) {
            localStorage.setItem('lastRoomId', room.id.toString())
        }
        markRoomAsRead(room.id)
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
            if (selectedRoom?.id === roomId) {
                const nextRoom = filtered[0] || null
                setSelectedRoom(nextRoom)
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
        if (selectedRoom?.id === updatedRoom.id) {
            setSelectedRoom(updatedRoom)
        }
    }

    useEffect(() => {
        if (lastMessage && lastMessage.type === 'message' && lastMessage.data?.message) {
            const newMsg = lastMessage.data.message
            
            // Update the room's unread count and last message
            setRooms(prev => prev.map(r => {
                if (r.id === newMsg.room_id) {
                    const isNotSelected = newMsg.room_id !== selectedRoom?.id
                    const isNotOwn = newMsg.sender?.id !== user?.id
                    
                    return {
                        ...r,
                        unread_count: (isNotSelected && isNotOwn) ? (r.unread_count || 0) + 1 : r.unread_count,
                        last_message: newMsg
                    }
                }
                return r
            }))
        }
    }, [lastMessage, selectedRoom, user])

    if (loading || loadingRooms) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="h-screen flex bg-background">
            {/* Sidebar */}
            <Sidebar
                rooms={rooms}
                selectedRoom={selectedRoom}
                onRoomSelect={handleRoomSelect}
                onRoomCreated={handleRoomCreated}
                onRoomDeleted={handleRoomDeleted}
                user={user}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <ChatArea
                    room={selectedRoom}
                    onToggleInfo={() => setShowRoomInfo(!showRoomInfo)}
                    showRoomInfo={showRoomInfo}
                    onMessagesRead={handleMessagesRead}
                />
            </div>

            {/* Room Info Panel */}
            {showRoomInfo && selectedRoom && (
                <RoomInfo
                    room={selectedRoom}
                    onClose={() => setShowRoomInfo(false)}
                    onRoomDeleted={handleRoomDeleted}
                    onRoomUpdated={handleRoomUpdated}
                />
            )}
        </div>
    )
}

export default Chat
