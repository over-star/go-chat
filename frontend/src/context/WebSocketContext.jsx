import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

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
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
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
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${wsProtocol}//${window.location.host}/ws?user_id=${user.id}&token=${token}`

        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            console.log('WebSocket connected')
            setIsConnected(true)
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)

                // Call registered handlers
                messageHandlersRef.current.forEach(handler => handler(data))

                // Store message if it's a chat message
                if (data.type === 'message' && data.data?.message) {
                    setMessages(prev => [...prev, data.data.message])
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error)
            }
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        ws.onclose = () => {
            console.log('WebSocket disconnected')
            setIsConnected(false)

            // Attempt to reconnect after 3 seconds
            if (isAuthenticated) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('Attempting to reconnect...')
                    connectWebSocket()
                }, 3000)
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
        sendMessage,
        sendChatMessage,
        sendTyping,
        sendReadReceipt,
        onMessage,
    }

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}
