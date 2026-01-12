import { useState } from 'react'
import { roomService } from '../services/roomService'
import { X, Users, Crown, LogOut, Trash2, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

function RoomInfo({ room, onClose, onRoomDeleted }) {
    const [loading, setLoading] = useState(false)

    const handleLeaveRoom = async () => {
        if (!confirm('Are you sure you want to leave this room?')) return

        try {
            setLoading(true)
            await roomService.leaveRoom(room.id)
            onRoomDeleted(room.id)
            onClose()
        } catch (error) {
            console.error('Failed to leave room:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteRoom = async () => {
        if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) return

        try {
            setLoading(true)
            await roomService.deleteRoom(room.id)
            onRoomDeleted(room.id)
            onClose()
        } catch (error) {
            console.error('Failed to delete room:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-80 border-l bg-card flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Room Info</h3>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Room Details */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                    {/* Room Avatar and Name */}
                    <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 mb-3">
                            <AvatarImage src={room.avatar} />
                            <AvatarFallback className="text-2xl">{room.name[0]}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold">{room.name}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {room.type === 'group' ? 'Group Chat' : 'Direct Message'}
                        </p>
                    </div>

                    {/* Members List */}
                    {room.members && room.members.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold text-sm">Members ({room.members.length})</h4>
                            </div>

                            <div className="space-y-2">
                                {room.members.map(member => (
                                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={member.avatar} />
                                            <AvatarFallback>{member.username[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm truncate">{member.username}</p>
                                                {member.id === room.creator_id && (
                                                    <Crown className="h-3 w-3 text-yellow-500" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Room Settings */}
                    <div>
                        <h4 className="font-semibold text-sm mb-3">Room Settings</h4>
                        <div className="space-y-2">
                            <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Created</span>
                                    <span className="font-medium">
                                        {new Date(room.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Type</span>
                                    <span className="font-medium capitalize">{room.type}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 border-t space-y-2">
                {room.type === 'group' && (
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleLeaveRoom}
                        disabled={loading}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Room
                    </Button>
                )}

                {/* Only creator can delete */}
                {room.type === 'group' && (
                    <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={handleDeleteRoom}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Room
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    )
}

export default RoomInfo
