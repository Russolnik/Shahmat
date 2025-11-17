import { useState, useEffect } from 'react'
import Board from './components/Board'
import GameInfo from './components/GameInfo'
import GameControls from './components/GameControls'
import ReadyButton from './components/ReadyButton'
import Notification from './components/Notification'
import ConfirmDialog from './components/ConfirmDialog'
import LoadingSpinner from './components/LoadingSpinner'
import { useTelegramAuth } from './hooks/useTelegramAuth'
import { useGameSocket } from './hooks/useGameSocket'
import { useTheme } from './hooks/useTheme'
import { useNotifications } from './hooks/useNotifications'
import './App.css'

function App() {
  const [gameId, setGameId] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null)
  const [possibleMoves, setPossibleMoves] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [playerReady, setPlayerReady] = useState({ white: false, black: false })
  
  const { user, isAuthenticated, initTelegram, urlParams } = useTelegramAuth()
  const { socket, connected } = useGameSocket(gameId)
  const { theme, toggleTheme } = useTheme()
  const { notifications, showSuccess, showError, showInfo, removeNotification } = useNotifications()

  // Автоматическое присоединение к игре из URL (через бота)
  useEffect(() => {
    if (urlParams?.gameId && isAuthenticated && user) {
      setGameId(urlParams.gameId)
      // Автоматически присоединяемся к игре
      joinGameFromBot(urlParams.gameId, user.id)
    }
  }, [urlParams, isAuthenticated, user])

  const joinGameFromBot = async (id, userId) => {
    if (!isAuthenticated || !id) return
    setLoading(true)
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const apiPath = apiUrl ? `${apiUrl}/api` : '/api'
      const response = await fetch(`${apiPath}/game/join/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.initData}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setGameId(id)
        setError(null)
        showInfo('Вы присоединились к игре!', 3000)
      } else {
        const errorMsg = data.error || 'Не удалось присоединиться к игре'
        setError(errorMsg)
        showError(errorMsg, 4000)
      }
    } catch (error) {
      console.error('Ошибка присоединения к игре:', error)
      const errorMsg = 'Не удалось присоединиться к игре.'
      setError(errorMsg)
      showError(errorMsg, 4000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!socket) return

    socket.on('gameState', (state) => {
      const prevState = gameState
      setGameState(state)
      setSelectedCell(null)
      setPossibleMoves([])
      
      // Уведомления о смене хода
      if (prevState && prevState.status === 'active' && state.status === 'active') {
        if (prevState.currentPlayer !== state.currentPlayer) {
          if (state.currentPlayer === state.myPlayer) {
            showInfo('Ваш ход!', 2000)
          }
        }
      }
      
      // Уведомление о начале игры
      if (prevState?.status === 'waiting' && state.status === 'active') {
        showSuccess('Игра началась!', 3000)
      }
    })

    socket.on('drawOffered', () => {
      setConfirmDialog({
        message: 'Соперник предлагает ничью. Принять?',
        onConfirm: () => {
          socket.emit('acceptDraw')
          setConfirmDialog(null)
        },
        onCancel: () => {
          socket.emit('rejectDraw')
          setConfirmDialog(null)
        }
      })
    })

    socket.on('drawRejected', () => {
      showInfo('Соперник отклонил предложение ничьей', 3000)
    })

    socket.on('drawAccepted', () => {
      showInfo('Ничья принята!', 3000)
    })

    socket.on('playerReady', (ready) => {
      setPlayerReady(ready)
    })

    socket.on('gameStarted', () => {
      showSuccess('🎮 Игра началась! Оба игрока готовы!', 4000)
    })

    socket.on('moveResult', (result) => {
      if (result.success) {
        setGameState(result.gameState)
        setSelectedCell(null)
        setPossibleMoves([])
        
        // Уведомление о превращении в дамку
        if (result.becameKing) {
          showSuccess('Фишка стала дамкой!', 2000)
        }
        
        // Уведомление о победе
        if (result.gameState?.status === 'finished') {
          if (result.gameState.winner === result.gameState.myPlayer) {
            showSuccess('🎉 Поздравляем! Вы выиграли!', 5000)
          } else if (result.gameState.winner === 'draw') {
            showInfo('🤝 Ничья!', 4000)
          } else {
            showError('😔 Вы проиграли', 4000)
          }
        }
      } else {
        showError(result.error || 'Неверный ход', 3000)
      }
    })

    socket.on('error', (error) => {
      showError(error.message || 'Произошла ошибка', 3000)
    })

    return () => {
      socket.off('gameState')
      socket.off('moveResult')
      socket.off('drawOffered')
      socket.off('drawRejected')
      socket.off('drawAccepted')
      socket.off('playerReady')
      socket.off('gameStarted')
      socket.off('error')
    }
  }, [socket, gameState, showSuccess, showError, showInfo])

  const handleCellClick = async (row, col) => {
    if (!gameState || !socket) return
    
    // Не позволяем ходить, если игра завершена
    if (gameState.status === 'finished') return
    
    // Не позволяем ходить не в свой ход
    if (gameState.currentPlayer !== gameState.myPlayer) return

    const cellKey = `${row}-${col}`
    const cell = gameState.board[row]?.[col]

    // Если выбрана та же клетка - снимаем выбор
    if (selectedCell === cellKey) {
      setSelectedCell(null)
      setPossibleMoves([])
      return
    }

    // Если выбрана фишка текущего игрока
    if (cell && cell.player === gameState.currentPlayer) {
      setSelectedCell(cellKey)
      // Запрос возможных ходов
      socket.emit('getPossibleMoves', { row, col }, (moves) => {
        setPossibleMoves(moves || [])
      })
      return
    }

    // Если выбрана клетка для хода
    if (selectedCell && possibleMoves.some(m => m.row === row && m.col === col)) {
      const [fromRow, fromCol] = selectedCell.split('-').map(Number)
      socket.emit('makeMove', {
        from: { row: fromRow, col: fromCol },
        to: { row, col }
      })
    }
  }

  const createGame = async () => {
    if (!isAuthenticated) return
    setError(null)
    setLoading(true)
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const apiPath = apiUrl ? `${apiUrl}/api` : '/api'
      const response = await fetch(`${apiPath}/game/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.initData}`
        }
      })
      const data = await response.json()
      if (data.gameId) {
        setGameId(data.gameId)
        setError(null)
        showSuccess(`Игра создана! ID: ${data.gameId}`, 4000)
      } else {
        const errorMsg = data.error || 'Ошибка создания игры'
        setError(errorMsg)
        showError(errorMsg, 4000)
      }
    } catch (error) {
      console.error('Ошибка создания игры:', error)
      const errorMsg = 'Не удалось создать игру. Попробуйте ещё раз.'
      setError(errorMsg)
      showError(errorMsg, 4000)
    } finally {
      setLoading(false)
    }
  }

  const joinGame = async (id) => {
    if (!isAuthenticated || !id) {
      const errorMsg = 'Введите ID игры'
      setError(errorMsg)
      showError(errorMsg, 3000)
      return
    }
    setError(null)
    setLoading(true)
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const apiPath = apiUrl ? `${apiUrl}/api` : '/api'
      const response = await fetch(`${apiPath}/game/join/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.initData}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setGameId(id)
        setError(null)
        showSuccess('Вы присоединились к игре!', 3000)
      } else {
        const errorMsg = data.error || 'Не удалось присоединиться к игре'
        setError(errorMsg)
        showError(errorMsg, 4000)
      }
    } catch (error) {
      console.error('Ошибка присоединения к игре:', error)
      const errorMsg = 'Не удалось присоединиться к игре. Проверьте ID.'
      setError(errorMsg)
      showError(errorMsg, 4000)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <div className="auth-message">
          <p>Запустите приложение через Telegram</p>
        </div>
      </div>
    )
  }

  const handleSurrender = () => {
    setConfirmDialog({
      message: 'Вы уверены, что хотите сдаться?',
      onConfirm: () => {
        socket?.emit('surrender')
        setConfirmDialog(null)
        showInfo('Вы сдались', 3000)
      },
      onCancel: () => {
        setConfirmDialog(null)
      },
      confirmText: 'Сдаться',
      cancelText: 'Отмена'
    })
  }

  const handleDraw = () => {
    socket?.emit('offerDraw')
    showInfo('Предложение ничьей отправлено', 2000)
  }

  const handleReady = () => {
    if (!gameId || !user || !socket) return
    socket.emit('setReady', gameId, user.id)
    showInfo('Вы готовы! Ожидаем соперника...', 2000)
  }

  return (
    <div className="app-container" data-theme={theme}>
      <div className="theme-toggle">
        <button onClick={toggleTheme} className="theme-btn" aria-label="Переключить тему">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Уведомления */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      {/* Диалог подтверждения */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
        />
      )}

      {/* Загрузка */}
      {loading && <LoadingSpinner message="Подключение..." />}

      {!gameId ? (
        <div className="game-setup">
          <h1 className="title">🎮 Шашки</h1>
          <button 
            onClick={createGame} 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Создание...' : 'Создать игру'}
          </button>
          <div className="join-section">
            <input
              type="text"
              placeholder="ID игры"
              className="input"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  const input = e.target
                  joinGame(input.value)
                }
              }}
              onChange={() => setError(null)}
              disabled={loading}
            />
            <button 
              onClick={() => {
                const input = document.querySelector('.input')
                if (input && !loading) joinGame(input.value)
              }} 
              className="btn-secondary"
              disabled={loading}
            >
              Присоединиться
            </button>
          </div>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      ) : (
        <>
          {!connected && (
            <div className="connection-status">
              <LoadingSpinner message="Подключение к игре..." />
            </div>
          )}
          <GameInfo gameState={gameState} user={user} />
          {gameState?.status === 'waiting' && (
            <ReadyButton
              gameState={gameState}
              playerReady={playerReady}
              onReady={handleReady}
              disabled={!connected || loading}
            />
          )}
          {(gameState?.status === 'active' || gameState?.status === 'finished') && (
            <>
              <Board
                board={gameState?.board || []}
                selectedCell={selectedCell}
                possibleMoves={possibleMoves}
                onCellClick={handleCellClick}
                myPlayer={gameState?.myPlayer}
              />
              <GameControls
                gameId={gameId}
                onSurrender={handleSurrender}
                onDraw={handleDraw}
                disabled={gameState?.status === 'finished'}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App

