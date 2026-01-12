import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import { messageService } from '../services/messageService'
import Message from './Message'
import MessageInput from './MessageInput'
import { Info, Hash, Users, Loader2, ArrowDown } from 'lucide-react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

function ChatArea({ room, onToggleInfo, showRoomInfo, onMessagesRead }) {
    const { user } = useAuth()
    const { lastMessage, sendChatMessage } = useWebSocket()
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [showNewMessageArrow, setShowNewMessageArrow] = useState(false)
    const [newMessageCount, setNewMessageCount] = useState(0)
    const scrollAreaRef = useRef(null)
    const messagesEndRef = useRef(null)
    const messagesStartRef = useRef(null)
    const currentRoomIdRef = useRef(null)
    const isInitialLoadRef = useRef(true)

    const scrollToBottom = useCallback(() => {
        // Try using ref first
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        } else {
            // Fallback to manual scrolling
            const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
        }
        setShowNewMessageArrow(false)
        setNewMessageCount(0)
    }, [])

    const handleScroll = useCallback((e) => {
        const scrollContainer = e.target
        const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100
        setShowNewMessageArrow(!isNearBottom && messages.length > 0)
    }, [messages.length])

    useEffect(() => {
        if (room) {
            // Only reload messages if room actually changed
            if (currentRoomIdRef.current !== room.id) {
                setPage(1)
                setHasMore(true)
                isInitialLoadRef.current = true
                loadMessages(1, true)
                markMessagesAsRead()
                currentRoomIdRef.current = room.id
            }
        } else {
            // Reset current room id when no room is selected
            currentRoomIdRef.current = null
            setMessages([])
            setPage(1)
            setHasMore(true)
        }
    }, [room])

    useEffect(() => {
        const handleScroll = () => {
            const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
            const scrollContent = scrollContainer?.querySelector('div')

            if (!scrollContainer || !scrollContent) return

            const isNearBottom = scrollContent.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100
            setShowNewMessageArrow(!isNearBottom && messages.length > 0)

            // Check if scrolled to top to load more messages
            if (scrollContainer.scrollTop < 50 && hasMore && !loadingMore && !loading) {
                loadMoreMessages()
            }
        }

        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll)
            return () => scrollContainer.removeEventListener('scroll', handleScroll)
        }
    }, [messages.length, hasMore, loadingMore, loading])

    useEffect(() => {
        if (lastMessage && lastMessage.type === 'message' && lastMessage.data?.message) {
            const newMsg = lastMessage.data.message
            if (newMsg.room_id === room?.id) {
                setMessages(prev => {
                    const exists = prev.some(m => m.id === newMsg.id)
                    if (exists) return prev
                    return [...prev, newMsg]
                })

                // Use setTimeout to ensure DOM has updated
                setTimeout(() => {
                    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
                    const scrollContent = scrollContainer?.querySelector('div')

                    if (scrollContainer && scrollContent) {
                        const isNearBottom = scrollContent.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100

                        if (isNearBottom) {
                            scrollToBottom()
                        } else {
                            setShowNewMessageArrow(true)
                            setNewMessageCount(prev => prev + 1)
                        }
                    } else {
                        // If can't determine position, scroll to bottom
                        scrollToBottom()
                    }
                }, 50)
            }
        }
    }, [lastMessage, room, scrollToBottom])

    const loadMessages = async (pageNum = 1, isInitial = false) => {
        if (!room) return

        try {
            setLoading(true)
            const response = await messageService.getMessages(room.id, pageNum, 20)
            if (response.data?.messages) {
                const newMessages = response.data.messages

                if (isInitial) {
                    setMessages(newMessages)
                    setHasMore(newMessages.length === 20)
                    setTimeout(scrollToBottom, 100)
                } else {
                    setMessages(prev => [...newMessages, ...prev])
                    setHasMore(newMessages.length === 20)
                }
            }
        } catch (error) {
            // Global handler handles it
        } finally {
            setLoading(false)
        }
    }

    const loadMoreMessages = async () => {
        if (!room || loadingMore || !hasMore) return

        try {
            setLoadingMore(true)
            const nextPage = page + 1
            const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
            const previousScrollHeight = scrollContainer?.scrollHeight || 0

            const response = await messageService.getMessages(room.id, nextPage, 20)
            if (response.data?.messages) {
                const newMessages = response.data.messages
                if (newMessages.length > 0) {
                    setMessages(prev => [...newMessages, ...prev])
                    setPage(nextPage)
                    setHasMore(newMessages.length === 20)

                    // Maintain scroll position
                    setTimeout(() => {
                        if (scrollContainer) {
                            const newScrollHeight = scrollContainer.scrollHeight
                            scrollContainer.scrollTop = newScrollHeight - previousScrollHeight
                        }
                    }, 0)
                } else {
                    setHasMore(false)
                }
            }
        } catch (error) {
            // Global handler handles it
        } finally {
            setLoadingMore(false)
        }
    }

    const markMessagesAsRead = async () => {
        if (!room) return

        const unreadMessages = messages.filter(m => m.sender_id !== user?.id)
        if (unreadMessages.length > 0) {
            try {
                const messageIds = unreadMessages.map(m => m.id)
                await messageService.markAsRead(messageIds)
                if (onMessagesRead) {
                    onMessagesRead(room.id)
                }
            } catch (error) {
                // Silent fail - read receipts are nice to have
            }
        }
    }

    const handleSend = (content, type = 'text', file = null) => {
        if (!room) return

        const fileData = file ? {
            file_url: file.url,
            file_name: file.name,
            file_size: file.size
        } : {}

        sendChatMessage(room.id, content, type, [], fileData)
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
        <div className="flex-1 flex flex-col h-full relative">
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
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
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
                        {loadingMore && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                        )}
                        {!hasMore && messages.length > 0 && (
                            <div className="text-center py-2">
                                <p className="text-xs text-muted-foreground">No more messages</p>
                            </div>
                        )}
                        <div ref={messagesStartRef} />
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

            {/* New Message Arrow */}
            {showNewMessageArrow && (
                <div className="absolute bottom-20 right-4 flex flex-col items-end">
                    <Button
                        size="icon"
                        className="shadow-lg rounded-full h-10 w-10"
                        onClick={scrollToBottom}
                    >
                        <ArrowDown className="h-5 w-5" />
                    </Button>
                    {newMessageCount > 0 && (
                        <div className="mt-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-medium">
                            {newMessageCount} new
                        </div>
                    )}
                </div>
            )}

            {/* Input */}
            <MessageInput onSend={handleSend} roomMembers={room.members || []} />
        </div>
    )
}

export default ChatArea
