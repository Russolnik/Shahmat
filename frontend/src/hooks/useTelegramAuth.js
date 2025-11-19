import { useState, useEffect } from 'react'

export const useTelegramAuth = () => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const initTelegram = () => {
    // Проверяем параметры URL (для работы через бота)
    const urlParams = new URLSearchParams(window.location.search)
    const urlGameId = urlParams.get('gameId')
    const urlUserId = urlParams.get('userId')

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()

      const initData = tg.initDataUnsafe
      if (initData?.user) {
        const userData = {
          id: initData.user.id,
          username: initData.user.username || `user_${initData.user.id}`,
          firstName: initData.user.first_name,
          initData: tg.initData
        }
        setUser(userData)
        localStorage.setItem('userId', userData.id.toString())
        setIsAuthenticated(true)
        
        // Проверяем start_param для deep links комнат
        const startParam = tg.initDataUnsafe?.start_param
        const roomCode = startParam?.startsWith('room-') ? startParam.replace('room-', '') : null
        
        // Возвращаем gameId из URL или roomCode из start_param
        return { gameId: urlGameId || roomCode, userId: userData.id, roomCode }
      } else {
        // Для разработки без Telegram
        if (import.meta.env.DEV) {
          const userId = urlUserId ? Number(urlUserId) : 12345
          const userData = {
            id: userId,
            username: 'dev_user',
            firstName: 'Dev User',
            initData: 'dev'
          }
          setUser(userData)
          localStorage.setItem('userId', userData.id.toString())
          setIsAuthenticated(true)
          return { gameId: urlGameId, userId: userData.id }
        }
      }
    } else if (import.meta.env.DEV) {
      // Для разработки без Telegram
      const userId = urlUserId ? Number(urlUserId) : 12345
      const userData = {
        id: userId,
        username: 'dev_user',
        firstName: 'Dev User',
        initData: 'dev'
      }
      setUser(userData)
      localStorage.setItem('userId', userData.id.toString())
      setIsAuthenticated(true)
      return { gameId: urlGameId, userId: userData.id }
    }
    
    return { gameId: null, userId: null }
  }

  const [urlParams, setUrlParams] = useState({ gameId: null, userId: null })

  useEffect(() => {
    const params = initTelegram()
    setUrlParams(params)
  }, [])

  return { user, isAuthenticated, initTelegram, urlParams }
}

