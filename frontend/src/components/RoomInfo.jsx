import { useState } from 'react'
import { roomService } from '../services/roomService'
import errorHandler from '../utils/errorHandler'
import { X, Users, Crown, LogOut, Trash2, Loader2, UserMinus } from 'lucide-react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useAuth } from '../context/AuthContext'

function RoomInfo({ room, onClose, onRoomDeleted, onRoomUpdated }) {
    const { user: currentUser } = useAuth()
    const [loading, setLoading] = useState(false)
    const isCreator = currentUser?.id === room.creator_id

    const handleLeaveRoom = async () => {
        if (!confirm('确定要退出该群聊吗？')) return

        try {
            setLoading(true)
            await roomService.leaveRoom(room.id)
            onRoomDeleted(room.id)
            onClose()
            errorHandler.success('已退出群聊')
        } catch (error) {
            // Global handler
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteRoom = async () => {
        if (!confirm('确定要解散该群聊吗？此操作无法撤销。')) return

        try {
            setLoading(true)
            await roomService.deleteRoom(room.id)
            onRoomDeleted(room.id)
            onClose()
            errorHandler.success('群聊已解散')
        } catch (error) {
            // Global handler
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveMember = async (userId) => {
        if (!confirm('确定要移除该成员吗？')) return

        try {
            setLoading(true)
            await roomService.removeMember(room.id, userId)
            errorHandler.success('成员已移除')
            if (onRoomUpdated) {
                // Fetch updated room info
                const response = await roomService.getRoom(room.id)
                onRoomUpdated(response.data)
            }
        } catch (error) {
            // Global handler
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full h-full bg-card flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">聊天信息</h3>
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
                            {room.type === 'group' ? '群聊' : '私聊'}
                        </p>
                    </div>

                    {/* Members List */}
                    {room.members && room.members.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold text-sm">成员 ({room.members.length})</h4>
                            </div>

                            <div className="space-y-2">
                                {room.members.map(member => (
                                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent group">
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
                                        {isCreator && member.id !== room.creator_id && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleRemoveMember(member.id)}
                                                disabled={loading}
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Room Settings */}
                    <div>
                        <h4 className="font-semibold text-sm mb-3">聊天设置</h4>
                        <div className="space-y-2">
                            <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">创建时间</span>
                                    <span className="font-medium">
                                        {room.created_at && !isNaN(new Date(room.created_at).getTime())
                                            ? new Date(room.created_at).toLocaleDateString('zh-CN')
                                            : '未知'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">类型</span>
                                    <span className="font-medium">{room.type === 'group' ? '群聊' : '私聊'}</span>
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
                        退出群聊
                    </Button>
                )}

                {/* Only creator can delete */}
                {isCreator && room.type === 'group' && (
                    <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={handleDeleteRoom}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                正在解散...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                解散群聊
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    )
}

export default RoomInfo
