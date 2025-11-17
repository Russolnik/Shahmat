import './GameInfo.css'

const GameInfo = ({ gameState, user, gameId }) => {
  if (!gameState) {
    return (
      <div className="game-info">
        <p>Ожидание начала игры...</p>
      </div>
    )
  }

  const currentPlayerName = gameState.currentPlayer === 'white' ? 'Белые' : 'Чёрные'
  const isMyTurn = gameState.currentPlayer === gameState.myPlayer

  if (gameState.status === 'finished') {
    let resultText = ''
    if (gameState.winner === 'draw') {
      resultText = 'Ничья!'
    } else if (gameState.winner === gameState.myPlayer) {
      resultText = '🎉 Вы выиграли!'
    } else {
      resultText = '😔 Вы проиграли'
    }

    return (
      <div className="game-info finished">
        <div className="info-row">
          <span className="info-label">🏁 Игра завершена</span>
        </div>
        <div className="info-row">
          <span className="info-value result">{resultText}</span>
        </div>
        {gameId && (
          <div className="info-row game-id-row">
            <span className="info-label">🆔 ID комнаты:</span>
            <span className="info-value game-id-display">{gameId}</span>
          </div>
        )}
      </div>
    )
  }

  const myColor = gameState.myPlayer === 'white' ? '⚪ Белые' : '⚫ Чёрные'
  const opponentColor = gameState.myPlayer === 'white' ? '⚫ Чёрные' : '⚪ Белые'

  return (
    <div className="game-info">
      {gameState.status === 'waiting' ? (
        <>
          <div className="info-row">
            <span className="info-label">⏳ Ожидание готовности...</span>
          </div>
          {gameState.opponent ? (
            <div className="info-row">
              <span className="info-label">👤 Соперник:</span>
              <span className="info-value">@{gameState.opponent.username || gameState.opponent.first_name || 'Игрок'}</span>
            </div>
          ) : (
            <div className="info-row">
              <span className="info-label">⏳ Ожидание соперника...</span>
            </div>
          )}
          {gameState.myPlayer && (
            <div className="info-row">
              <span className="info-label">🎯 Ваш цвет:</span>
              <span className="info-value">{myColor}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="info-row">
            <span className="info-label">🎮 Соперник:</span>
            <span className="info-value">
              {gameState.opponent ? `@${gameState.opponent.username || gameState.opponent.first_name || 'Игрок'}` : 'Ожидание соперника...'}
            </span>
          </div>
          {gameState.myPlayer && (
            <div className="info-row">
              <span className="info-label">🎯 Ваш цвет:</span>
              <span className="info-value">{myColor}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">👤 Ход:</span>
            <span className={`info-value ${isMyTurn ? 'my-turn' : ''}`}>
              {currentPlayerName} {isMyTurn && '(вы)'}
            </span>
          </div>
        </>
      )}
      {gameId && (
        <div className="info-row game-id-row">
          <span className="info-label">🆔 ID комнаты:</span>
          <span className="info-value game-id-display">{gameId}</span>
        </div>
      )}
    </div>
  )
}

export default GameInfo

