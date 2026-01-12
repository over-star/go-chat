import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'
import RoomInfo from '../components/RoomInfo'
import { roomService } from '../services/roomService'
import { Loader2 } from 'lucide-react'

function Chat() {
    const { user, isAuthenticated, loading } = useAuth()
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
            loadRooms()
        }
    }, [isAuthenticated])

    const loadRooms = async () => {
        try {
            const response = await roomService.getRooms()
            if (response.data) {
                setRooms(response.data)
            }
        } catch (error) {
            // Global error handler will show toast
        } finally {
            setLoadingRooms(false)
        }
    }

    const handleRoomSelect = (room) => {
        setSelectedRoom(room)
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
        } else {
            // New room, add to list and select
            setRooms(prev => [newRoom, ...prev])
            setSelectedRoom(newRoom)
        }
    }

    const handleRoomDeleted = (roomId) => {
        setRooms(prev => prev.filter(r => r.id !== roomId))
        if (selectedRoom?.id === roomId) {
            setSelectedRoom(rooms[0] || null)
        }
    }

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
                />
            )}
        </div>
    )
}

export default Chat
