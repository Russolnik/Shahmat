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
        // В production используем переменную окружения
        if (import.meta.env.VITE_WS_URL) {
          return import.meta.env.VITE_WS_URL
        }
        // Если VITE_WS_URL не указан, формируем из VITE_API_URL
        if (import.meta.env.VITE_API_URL) {
          return import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
        }
        // Fallback на текущий origin
        return window.location.origin.replace(/^http/, 'ws')
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

