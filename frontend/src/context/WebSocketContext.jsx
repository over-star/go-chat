import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import errorHandler from '../utils/errorHandler'

const WebSocketContext = createContext(null)

export const useWebSocket = () => {
    const context = useContext(WebSocketContext)
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider')
    }
    return context
}

export const WebSocketProvider = ({ children }) => {
    const { user, token, isAuthenticated } = useAuth()
    const [isConnected, setIsConnected] = useState(false)
    const [messages, setMessages] = useState([])
    const [lastMessage, setLastMessage] = useState(null)
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
    const reconnectAttemptsRef = useRef(0)
    const messageHandlersRef = useRef([])

    useEffect(() => {
        if (isAuthenticated && user && token) {
            connectWebSocket()
        }

        return () => {
            disconnectWebSocket()
        }
    }, [isAuthenticated, user, token])



    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
            return
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${wsProtocol}//${window.location.host}/ws?user_id=${user.id}&token=${token}`

        console.log('Connecting to WebSocket...')
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            console.log('WebSocket connected')
            setIsConnected(true)
            reconnectAttemptsRef.current = 0
            errorHandler.success('已连接到聊天服务器', { id: 'ws-status' })
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)

                // Call registered handlers
                messageHandlersRef.current.forEach(handler => handler(data))

                // Store message if it's a chat message
                if (data.type === 'message' && data.data?.message) {
                    setMessages(prev => [...prev, data.data.message])
                    setLastMessage(data)
                } else {
                    setLastMessage(data)
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error)
            }
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
            setIsConnected(false)
        }

        ws.onclose = (event) => {
            console.log('WebSocket disconnected', event)
            setIsConnected(false)
            wsRef.current = null

            // Only attempt reconnect if not closing cleanly/intentionally
            // 1000 is normal closure
            if (isAuthenticated && event.code !== 1000) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
                reconnectAttemptsRef.current += 1

                errorHandler.loading(`连接已断开，${delay / 1000}秒后尝试重连...`, { id: 'ws-status' })

                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`)
                    connectWebSocket()
                }, delay)
            } else if (event.code !== 1000) {
                errorHandler.error(null, '已从服务器断开', { id: 'ws-status' })
            }
        }

        wsRef.current = ws
    }

    const disconnectWebSocket = () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }

        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }

        setIsConnected(false)
    }

    const sendMessage = (message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message))
        } else {
            console.error('WebSocket is not connected')
            errorHandler.error(null, '消息发送失败：未连接到服务器')
        }
    }

    const onMessage = (handler) => {
        messageHandlersRef.current.push(handler)

        // Return cleanup function
        return () => {
            messageHandlersRef.current = messageHandlersRef.current.filter(h => h !== handler)
        }
    }

    const sendChatMessage = (roomId, content, type = 'text', mentions = [], fileData = {}) => {
        const memberIds = [] // Will be populated from room data

        const message = {
            type: 'message',
            room_id: roomId,
            content,
            message_type: type,
            mentions,
            recipients: memberIds,
            ...fileData,
        }

        sendMessage(message)
    }

    const sendTyping = (roomId, isTyping) => {
        sendMessage({
            type: 'typing',
            room_id: roomId,
            data: { is_typing: isTyping },
        })
    }

    const sendReadReceipt = (messageId) => {
        sendMessage({
            type: 'read_receipt',
            message_id: messageId,
        })
    }

    const value = {
        isConnected,
        messages,
        lastMessage,
        sendMessage,
        sendChatMessage,
        sendTyping,
        sendReadReceipt,
        onMessage,
    }

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}
