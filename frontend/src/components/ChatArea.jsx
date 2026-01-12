import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import { messageService } from '../services/messageService'
import Message from './Message'
import MessageInput from './MessageInput'
import { Info, Hash, Users, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

function ChatArea({ room, onToggleInfo, showRoomInfo }) {
    const { user } = useAuth()
    const { lastMessage, sendChatMessage } = useWebSocket()
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        if (room) {
            loadMessages()
        }
    }, [room])

    useEffect(() => {
        if (lastMessage && lastMessage.type === 'message' && lastMessage.data?.message) {
            const newMsg = lastMessage.data.message
            if (newMsg.room_id === room?.id) {
                setMessages(prev => {
                    const exists = prev.some(m => m.id === newMsg.id)
                    if (exists) return prev
                    return [...prev, newMsg]
                })
                scrollToBottom()
            }
        }
    }, [lastMessage, room])

    const loadMessages = async () => {
        if (!room) return

        try {
            setLoading(true)
            const response = await messageService.getMessages(room.id, page)
            if (response.data) {
                setMessages(response.data.reverse())
                setTimeout(scrollToBottom, 100)
            }
        } catch (error) {
            console.error('Failed to load messages:', error)
        } finally {
            setLoading(false)
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSend = (content, type = 'text', file = null) => {
        if (!room) return

        const message = {
            type: 'message',
            room_id: room.id,
            content,
            message_type: type,
            file_url: file?.url || '',
            file_name: file?.name || '',
            file_size: file?.size || 0,
            mentions: []
        }

        sendChatMessage(message)
    }

    if (!room) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background/50">
                <div className="text-center">
                    <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Select a chat to start messaging</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="h-16 border-b bg-card px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={room.avatar} />
                        <AvatarFallback>{room.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            {room.type === 'group' && <Hash className="h-4 w-4 text-muted-foreground" />}
                            <h2 className="font-semibold">{room.name}</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {room.type === 'group'
                                ? `${room.members?.length || 0} members`
                                : 'Direct message'}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onToggleInfo}>
                    <Info className="h-5 w-5" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Hash className="h-8 w-8 text-primary" />
                            </div>
                            <p className="text-lg font-medium mb-1">No messages yet</p>
                            <p className="text-sm text-muted-foreground">Be the first to send a message!</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map(message => (
                            <Message
                                key={message.id}
                                message={message}
                                isOwn={message.sender_id === user?.id}
                                roomMembers={room.members || []}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <MessageInput onSend={handleSend} roomMembers={room.members || []} />
        </div>
    )
}

export default ChatArea
