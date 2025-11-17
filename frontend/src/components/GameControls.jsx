import { useState } from 'react'
import RulesModal from './RulesModal'
import './GameControls.css'

const GameControls = ({ gameId, onSurrender, onDraw, onToggleFuki, fukiMode = false, disabled = false }) => {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (!gameId) return

    // Проверяем, есть ли Telegram WebApp API
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      // Пытаемся использовать Telegram Share API
      if (tg.shareUrl) {
        const shareUrl = `${window.location.origin}?gameId=${gameId}`
        tg.shareUrl(shareUrl, `🎮 Присоединяйся к игре в шашки! ID: ${gameId}`, () => {
          console.log('Поделились через Telegram')
        })
        return
      }
    }

    // Fallback: копируем ID в буфер обмена
    try {
      await navigator.clipboard.writeText(gameId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Если clipboard API не доступен, показываем ID для ручного копирования
      const textArea = document.createElement('textarea')
      textArea.value = gameId
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (e) {
        console.error('Не удалось скопировать ID')
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className="game-controls">
      <button 
        onClick={onSurrender} 
        className="control-btn surrender"
        disabled={disabled}
      >
        Сдаться
      </button>
      <button 
        onClick={onDraw} 
        className="control-btn draw"
        disabled={disabled}
      >
        Ничья?
      </button>
      <button 
        onClick={onToggleFuki} 
        className={`control-btn fuki ${fukiMode ? 'active' : ''}`}
        disabled={disabled}
        title={fukiMode ? 'Режим фуков включен' : 'Режим фуков выключен'}
      >
        {fukiMode ? '🔥' : '♟️'}
      </button>
      {gameId && (
        <button 
          onClick={handleShare} 
          className="control-btn share"
          disabled={disabled}
          title="Поделиться игрой"
        >
          {copied ? '✓' : '📤'}
        </button>
      )}
      <RulesModal />
      {gameId && (
        <div className="game-id">
          <span className="game-id-label">ID игры:</span>
          <span className="game-id-value" onClick={handleShare} title="Нажмите, чтобы скопировать">
            {gameId}
          </span>
          {copied && <span className="game-id-copied">✓ Скопировано!</span>}
        </div>
      )}
    </div>
  )
}

export default GameControls

