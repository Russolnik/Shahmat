import { useState, useCallback, useRef } from 'react'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const lastNotificationRef = useRef(null)
  const activeNotificationsRef = useRef(new Set())

  const showNotification = useCallback((message, type = 'info', duration = 1000) => {
    // Дедупликация: не показываем одинаковое уведомление дважды подряд
    const now = Date.now()
    const notificationKey = `${message}_${type}`
    
    if (lastNotificationRef.current && 
        lastNotificationRef.current.key === notificationKey &&
        now - lastNotificationRef.current.timestamp < 500) {
      // Пропускаем дубликат, если он был показан менее 500мс назад
      console.log('⚠️ Пропущено дублирующее уведомление:', message)
      return lastNotificationRef.current.id
    }
    
    const id = now + Math.random()
    const notification = { id, message, type, duration, timestamp: now, key: notificationKey }
    
    lastNotificationRef.current = notification
    activeNotificationsRef.current.add(id)
    
    setNotifications(prev => {
      // Удаляем старые уведомления с таким же ключом
      const filtered = prev.filter(n => {
        const nKey = `${n.message}_${n.type}`
        return nKey !== notificationKey
      })
      return [...filtered, notification]
    })
    
    return id
  }, [])

  const removeNotification = useCallback((id) => {
    activeNotificationsRef.current.delete(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const showSuccess = useCallback((message, duration) => {
    return showNotification(message, 'success', duration)
  }, [showNotification])

  const showError = useCallback((message, duration) => {
    return showNotification(message, 'error', duration)
  }, [showNotification])

  const showWarning = useCallback((message, duration) => {
    return showNotification(message, 'warning', duration)
  }, [showNotification])

  const showInfo = useCallback((message, duration) => {
    return showNotification(message, 'info', duration)
  }, [showNotification])

  return {
    notifications,
    showNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}

