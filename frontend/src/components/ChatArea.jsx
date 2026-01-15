import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import { messageService } from '../services/messageService'
import Message from './Message'
import MessageInput from './MessageInput'
import { Info, Hash, Users, Loader2, ArrowDown, ChevronLeft } from 'lucide-react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

function ChatArea({ room, onToggleInfo, showRoomInfo, onMessagesRead, onBack }) {
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

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        // Try using ref first
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior })
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
        if (isInitialLoadRef.current && messages.length > 0 && !loading) {
            const timer = setTimeout(() => {
                scrollToBottom('auto')
                isInitialLoadRef.current = false
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [messages, loading, scrollToBottom])

    useEffect(() => {
        if (lastMessage && lastMessage.type === 'message' && lastMessage.data?.message) {
            const newMsg = lastMessage.data.message
            if (newMsg.room_id === room?.id) {
                setMessages(prev => {
                    const exists = prev.some(m => m.id === newMsg.id)
                    if (exists) return prev
                    return [...prev, newMsg]
                })

                // Mark as read immediately if it's from someone else
                if (newMsg.sender?.id !== user?.id) {
                    markMessagesAsRead([newMsg])
                }

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
        } else if (lastMessage && lastMessage.type === 'read_receipt' && lastMessage.data) {
            const { room_id, message_ids, user_id } = lastMessage.data
            if (room_id === room?.id) {
                setMessages(prev => prev.map(m => {
                    if (message_ids.includes(m.id)) {
                        const alreadyRead = m.read_by?.some(r => r.user_id === user_id)
                        if (!alreadyRead) {
                            return {
                                ...m,
                                read_by: [...(m.read_by || []), { user_id, read_at: new Date().toISOString() }]
                            }
                        }
                    }
                    return m
                }))
            }
        }
    }, [lastMessage, room, scrollToBottom, user?.id])

    const loadMessages = async (pageNum = 1, isInitial = false) => {
        if (!room) return

        try {
            setLoading(true)
            const response = await messageService.getMessages(room.id, pageNum, 20)
            if (response.data) {
                // Backend returns messages newest first (DESC), but we want them ASC for display
                const newMessages = [...response.data].reverse()

                if (isInitial) {
                    setMessages(newMessages)
                    setHasMore(response.data.length === 20)
                    markMessagesAsRead(newMessages)
                } else {
                    setMessages(prev => [...newMessages, ...prev])
                    setHasMore(response.data.length === 20)
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
            if (response.data) {
                // Reverse older messages to maintain ASC order in state
                const newMessages = [...response.data].reverse()
                if (newMessages.length > 0) {
                    setMessages(prev => [...newMessages, ...prev])
                    setPage(nextPage)
                    setHasMore(response.data.length === 20)
                    markMessagesAsRead(newMessages)

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

    const markMessagesAsRead = async (messagesToMark = null) => {
        if (!room) return

        const targetMessages = messagesToMark || messages
        const unreadMessages = targetMessages.filter(m => m.sender?.id !== user?.id)
        
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
                    <p className="text-lg font-medium text-muted-foreground">选择一个聊天开始交谈</p>
                </div>
            </div>
        )
    }

    const isGroup = room.type === 'group'
    const otherMember = !isGroup ? room.members?.find(m => m.id !== user?.id) : null
    const displayName = isGroup ? room.name : (otherMember?.nickname || otherMember?.username || room.name)
    const displayAvatar = isGroup ? room.avatar : (otherMember?.avatar || room.avatar)

    return (
        <div className="flex-1 flex flex-col h-full relative">
            {/* Header */}
            <div className="h-16 border-b bg-card px-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden" 
                        onClick={onBack}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={displayAvatar} />
                            <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1">
                                {isGroup && <Hash className="h-3 w-3 text-muted-foreground shrink-0" />}
                                <h2 className="font-semibold truncate text-sm md:text-base">{displayName}</h2>
                            </div>
                            <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                                {isGroup
                                    ? `${room.members?.length || 0} 位成员`
                                    : '在线'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={onToggleInfo}>
                        <Info className="h-5 w-5" />
                    </Button>
                </div>
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
                            <p className="text-lg font-medium mb-1">暂无消息</p>
                            <p className="text-sm text-muted-foreground">发送第一条消息吧！</p>
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
                                <p className="text-xs text-muted-foreground">没有更多消息了</p>
                            </div>
                        )}
                        <div ref={messagesStartRef} />
                        {messages.map(message => (
                            <Message
                                key={message.id}
                                message={message}
                                isOwn={message.sender?.id === user?.id}
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
                            {newMessageCount} 条新消息
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
