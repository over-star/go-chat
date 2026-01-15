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
    const [isConnecting, setIsConnecting] = useState(false)
    const [messages, setMessages] = useState([])
    const [lastMessage, setLastMessage] = useState(null)
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
    const heartbeatIntervalRef = useRef(null)
    const reconnectAttemptsRef = useRef(0)
    const messageHandlersRef = useRef([])
    const isConnectingRef = useRef(false)
    const intentionalDisconnectRef = useRef(false)

    useEffect(() => {
        if (isAuthenticated && user && token) {
            intentionalDisconnectRef.current = false
            connectWebSocket()
        }

        return () => {
            intentionalDisconnectRef.current = true
            disconnectWebSocket()
        }
    }, [isAuthenticated, user, token])



    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN || 
            wsRef.current?.readyState === WebSocket.CONNECTING || 
            isConnectingRef.current) {
            return
        }

        isConnectingRef.current = true
        setIsConnecting(true)
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        // 对 Token 和 UserID 进行编码，防止特殊字符干扰
        const params = new URLSearchParams({
            user_id: user.id,
            token: token
        }).toString()
        const wsUrl = `${wsProtocol}//${window.location.host}/ws?${params}`

        console.log('Connecting to WebSocket...')
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            console.log('WebSocket connected')
            setIsConnected(true)
            setIsConnecting(false)
            isConnectingRef.current = false
            reconnectAttemptsRef.current = 0
            errorHandler.success('已连接到聊天服务器', { id: 'ws-status' })

            // 开始心跳
            startHeartbeat()
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
            setIsConnecting(false)
            isConnectingRef.current = false
        }

        ws.onclose = (event) => {
            console.log('WebSocket disconnected', event)
            setIsConnected(false)
            setIsConnecting(false)
            isConnectingRef.current = false
            wsRef.current = null

            // 停止心跳
            stopHeartbeat()

            // 清除之前的重连定时器
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }

            // 只有在非主动断开且已登录的情况下才尝试重连
            // 1000 是正常关闭
            if (!intentionalDisconnectRef.current && isAuthenticated && event.code !== 1000) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
                reconnectAttemptsRef.current += 1

                errorHandler.loading(`连接已断开，${delay / 1000}秒后尝试重连...`, { id: 'ws-status' })

                reconnectTimeoutRef.current = setTimeout(() => {
                    if (!intentionalDisconnectRef.current && isAuthenticated) {
                        console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`)
                        connectWebSocket()
                    }
                }, delay)
            } else if (!intentionalDisconnectRef.current && event.code !== 1000) {
                errorHandler.error(null, '已从服务器断开', { id: 'ws-status' })
            }
        }

        wsRef.current = ws
    }

    const disconnectWebSocket = () => {
        stopHeartbeat()
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }

        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }

        setIsConnected(false)
        errorHandler.dismiss('ws-status')
    }

    const startHeartbeat = () => {
        stopHeartbeat()
        heartbeatIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ping' }))
            }
        }, 20000) // 每 20 秒发送一次
    }

    const stopHeartbeat = () => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current)
            heartbeatIntervalRef.current = null
        }
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
