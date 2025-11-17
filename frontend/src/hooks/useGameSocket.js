import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export const useGameSocket = (gameId) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!gameId) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
        setConnected(false)
      }
      return
    }

    // Определяем URL для WebSocket
    const getWsUrl = () => {
      if (import.meta.env.PROD) {
        // В production используем переменную окружения или определяем автоматически
        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin
        // Заменяем http/https на ws/wss
        const wsUrl = apiUrl.replace(/^http/, 'ws')
        return wsUrl
      }
      return 'http://localhost:3000'
    }

    const newSocket = io(getWsUrl(), {
      path: '/ws',
      transports: ['websocket'],
      query: { gameId }
    })

    newSocket.on('connect', () => {
      setConnected(true)
      // Получаем userId из localStorage или из Telegram
      const userId = localStorage.getItem('userId') || '12345'
      newSocket.emit('joinGame', gameId, userId)
      newSocket.userId = userId
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [gameId])

  return { socket, connected }
}

