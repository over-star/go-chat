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
                if (response.data.length > 0 && !selectedRoom) {
                    setSelectedRoom(response.data[0])
                }
            }
        } catch (error) {
            console.error('Failed to load rooms:', error)
        } finally {
            setLoadingRooms(false)
        }
    }

    const handleRoomSelect = (room) => {
        setSelectedRoom(room)
    }

    const handleRoomCreated = (newRoom) => {
        setRooms(prev => [newRoom, ...prev])
        setSelectedRoom(newRoom)
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
