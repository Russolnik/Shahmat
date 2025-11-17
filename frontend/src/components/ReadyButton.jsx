import './ReadyButton.css'

const ReadyButton = ({ gameState, playerReady, onReady, onToggleFuki, disabled, socket }) => {
  if (!gameState || gameState.status !== 'waiting') {
    return null
  }

  const isMyColor = gameState.myPlayer
  const isReady = isMyColor === 'white' 
    ? playerReady?.white 
    : playerReady?.black

  const opponentReady = isMyColor === 'white'
    ? playerReady?.black
    : playerReady?.white

  const isCreator = gameState.isCreator || false

  return (
    <div className="ready-container">
      {isCreator && (
        <div className="fuki-mode-selector">
          <label className="fuki-label">
            <span className="fuki-icon">{gameState.fukiMode ? '🔥' : '♟️'}</span>
            <span className="fuki-text">Режим фуков</span>
            <button
              onClick={onToggleFuki}
              className={`fuki-toggle ${gameState.fukiMode ? 'active' : ''}`}
              disabled={disabled || isReady}
              title={gameState.fukiMode ? 'Режим фуков включен' : 'Режим фуков выключен'}
            >
              {gameState.fukiMode ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </label>
        </div>
      )}
      {!isCreator && (
        <div className="fuki-mode-display">
          <span className="fuki-icon">{gameState.fukiMode ? '🔥' : '♟️'}</span>
          <span className="fuki-text">Режим фуков: {gameState.fukiMode ? 'ВКЛ' : 'ВЫКЛ'}</span>
        </div>
      )}
      <div className="ready-status">
        {isReady ? (
          <div className="ready-indicator ready">
            ✅ Вы готовы
          </div>
        ) : (
          <button 
            onClick={onReady} 
            className="ready-btn"
            disabled={disabled}
          >
            ✅ Готов
          </button>
        )}
        {opponentReady ? (
          <div className="ready-indicator opponent-ready">
            ✅ Соперник готов
          </div>
        ) : (
          <div className="ready-indicator opponent-waiting">
            ⏳ Ожидание соперника...
          </div>
        )}
      </div>
    </div>
  )
}

export default ReadyButton

