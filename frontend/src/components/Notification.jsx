import { useEffect } from 'react'
import './Notification.css'

const Notification = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
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

