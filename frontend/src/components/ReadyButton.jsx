import './ReadyButton.css'

const ReadyButton = ({ gameState, playerReady, onReady, disabled }) => {
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

  return (
    <div className="ready-container">
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

