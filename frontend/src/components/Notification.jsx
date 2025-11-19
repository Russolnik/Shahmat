import { useEffect } from 'react'
import './Notification.css'

const Notification = ({ message, type = 'info', onClose, duration = 1000 }) => {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => {
        clearTimeout(timer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]) // Убираем onClose из зависимостей, чтобы таймер не пересоздавался

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
    draw: '🤝'
  }

  return (
    <div className={`notification notification-${type}`} onClick={onClose}>
      <div className="notification-content">
        <span className="notification-icon">{icons[type] || icons.info}</span>
        <span className="notification-message">{message}</span>
      </div>
      <button className="notification-close" onClick={onClose}>×</button>
    </div>
  )
}

export default Notification

