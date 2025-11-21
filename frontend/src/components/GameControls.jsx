import { useState } from 'react'
import './GameControls.css'

const GameControls = ({ gameId, onSurrender, onDraw, onToggleFuki, onLeave, fukiMode = false, disabled = false, canLeave = false }) => {
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
        onClick={onLeave} 
        className="control-btn leave"
        disabled={!canLeave}
      >
        Выйти
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
        disabled={disabled || !onToggleFuki}
        title={fukiMode ? 'Режим фуков включен' : 'Режим фуков выключен'}
      >
        {fukiMode ? '🔥' : '♟️'}
      </button>
      {gameId && (
        <div className="game-id">
          <span className="game-id-label">ID:</span>
          <span className="game-id-value" title="ID игры">
            {gameId}
          </span>
        </div>
      )}
    </div>
  )
}

export default GameControls
