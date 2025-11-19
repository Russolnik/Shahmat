import { useState, useEffect, useRef } from 'react'
import Board from './components/GlassBoard'
import GlassGameInfo from './components/GlassGameInfo'
import OldGameInfo from './components/GameInfo'
import Lobby from './components/GlassLobby'
import GameControls from './components/GameControls'
import ReadyButton from './components/ReadyButton'
import Notification from './components/Notification'
import ConfirmDialog from './components/ConfirmDialog'
import LoadingSpinner from './components/LoadingSpinner'
import { useTelegramAuth } from './hooks/useTelegramAuth'
import { useGameSocket } from './hooks/useGameSocket'
import { useTheme } from './hooks/useTheme'
import { useNotifications } from './hooks/useNotifications'
import { PieceColor, Move } from './types'
import { boardToPieces, countCapturedPieces } from './utils/gameAdapter'
import { getAllValidMoves, getAvailableCaptures, initializeBoard } from './utils/glassCheckersLogic'
import './App.css'

function App() {
  // Восстанавливаем gameId из localStorage при загрузке
  const [gameId, setGameId] = useState(() => {
    const savedGameId = localStorage.getItem('currentGameId')
    return savedGameId || null
  })
  const [gameState, setGameState] = useState(null)
  const [selectedPieceId, setSelectedPieceId] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [huffedPosition, setHuffedPosition] = useState(null)
  const [showSeriesAlert, setShowSeriesAlert] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [playerReady, setPlayerReady] = useState({ white: false, black: false })
  const [gameTimer, setGameTimer] = useState(0)
  const prevFukiModeRef = useRef(null)
  
  const { user, isAuthenticated, initTelegram, urlParams } = useTelegramAuth()
  const { socket, connected } = useGameSocket(gameId)
  const { theme, toggleTheme } = useTheme()
  const { notifications, showSuccess, showError, showInfo, removeNotification } = useNotifications()

  // Сохраняем gameId в localStorage при изменении
  useEffect(() => {
    if (gameId) {
      localStorage.setItem('currentGameId', gameId)
    } else {
      localStorage.removeItem('currentGameId')
    }
  }, [gameId])

  // Автоматическое присоединение к игре из URL (через бота) или восстановление из localStorage
  useEffect(() => {
    if (!isAuthenticated || !user) return
    
    // Проверяем startapp параметр (для deep links комнат)
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
    if (startParam && startParam.startsWith('room-')) {
      const roomCode = startParam.replace('room-', '').toUpperCase()
      console.log(`🔗 Обнаружен deep link для комнаты ${roomCode}`)
      joinRoomFromDeepLink(roomCode)
      return
    }
    
    // Приоритет: URL параметры > сохраненный gameId
    if (urlParams?.gameId) {
      const normalizedId = String(urlParams.gameId).toUpperCase().trim()
      if (normalizedId !== gameId) {
        console.log(`🔗 Автоматическое присоединение к игре ${normalizedId} из URL`)
        setGameId(normalizedId)
        joinGameFromBot(normalizedId, user.id)
      }
    } else if (gameId && gameState === null) {
      // Восстанавливаем игру из localStorage только если нет gameState
      console.log(`🔄 Восстановление игры ${gameId} из localStorage`)
      joinGameFromBot(gameId, user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams?.gameId, isAuthenticated, user?.id])

  // Присоединение к комнате через deep link
  const joinRoomFromDeepLink = async (roomCode) => {
    if (!isAuthenticated || !user || !roomCode) {
      console.log('⚠️ joinRoomFromDeepLink: пропущено - не авторизован или нет roomCode')
      return
    }
    
    const normalizedCode = String(roomCode).toUpperCase().trim()
    console.log(`🔗 joinRoomFromDeepLink: присоединение к комнате ${normalizedCode}`)
    setLoading(true)
    
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const apiPath = apiUrl ? `${apiUrl}/api` : '/api'
      const url = `${apiPath}/join-room`
      console.log(`📡 Запрос к API: ${url}`)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.initData}`
        },
        body: JSON.stringify({ roomCode: normalizedCode })
      })
      
      console.log(`📥 Ответ API: статус ${response.status}`)
      const data = await response.json()
      console.log(`📥 Данные ответа:`, data)
      
      if (data.success) {
        setGameId(data.gameId || normalizedCode)
        setError(null)
        showInfo('Вы присоединились к комнате!', 1000)
        
        // Если игра уже началась, подключаемся через WebSocket
        if (data.status === 'PLAYING' && socket) {
          socket.emit('joinGame', data.gameId || normalizedCode, user.id)
        }
      } else {
        const errorMsg = data.error || 'Не удалось присоединиться к комнате'
        setError(errorMsg)
        showError(errorMsg, 1000)
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Ошибка присоединения к комнате:', error)
      const errorMsg = 'Не удалось присоединиться к комнате.'
      setError(errorMsg)
      showError(errorMsg, 4000)
      setLoading(false)
    }
  }

  const joinGameFromBot = async (id, userId) => {
    if (!isAuthenticated || !id) {
      console.log('⚠️ joinGameFromBot: пропущено - не авторизован или нет ID')
      return
    }
    
    // Нормализуем gameId
    const normalizedId = String(id).toUpperCase().trim()
    console.log(`🔗 joinGameFromBot: присоединение к игре ${normalizedId}`)
    setLoading(true)
    
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const apiPath = apiUrl ? `${apiUrl}/api` : '/api'
      const url = `${apiPath}/game/join/${normalizedId}`
      console.log(`📡 Запрос к API: ${url}`)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.initData}`
        }
      })
      
      console.log(`📥 Ответ API: статус ${response.status}`)
      const data = await response.json()
      console.log(`📥 Данные ответа:`, data)
      
      if (data.success) {
        setGameId(normalizedId)
        setError(null)
        showInfo('Вы присоединились к игре!', 1000)
      } else {
        const errorMsg = data.error || 'Не удалось присоединиться к игре'
        setError(errorMsg)
        showError(errorMsg, 1000)
        setLoading(false) // Останавливаем загрузку при ошибке
      }
    } catch (error) {
      console.error('❌ Ошибка присоединения к игре:', error)
      const errorMsg = 'Не удалось присоединиться к игре.'
      setError(errorMsg)
      showError(errorMsg, 4000)
      setLoading(false) // Останавливаем загрузку при ошибке
    }
    // Убираем finally, чтобы загрузка продолжалась только при успехе (для ожидания socket подключения)
  }

  // Таймер игры
  useEffect(() => {
    if (gameState?.status === 'active' && !gameState?.isGameOver) {
      const interval = setInterval(() => setGameTimer(t => t + 1), 1000)
      return () => clearInterval(interval)
    }
  }, [gameState?.status, gameState?.isGameOver])

  useEffect(() => {
    if (!socket) return

    socket.on('gameState', (state) => {
      console.log('📥 Получено состояние игры:', state)
      
      // Используем функциональное обновление для получения предыдущего состояния
      setGameState(prevState => {
        // Конвертируем доску в фишки, если нужно
        let pieces = []
        if (state.pieces && Array.isArray(state.pieces)) {
          pieces = state.pieces
        } else if (state.board) {
          pieces = boardToPieces(state.board)
        }

        // Конвертируем currentPlayer в PieceColor
        const currentPlayerColor = state.currentPlayerColor || 
          (state.currentPlayer === 'white' ? PieceColor.WHITE : PieceColor.BLACK)
        
        const myPlayerColor = state.myPlayerColor ||
          (state.myPlayer === 'white' ? PieceColor.WHITE : 
           state.myPlayer === 'black' ? PieceColor.BLACK : null)

        // Подсчитываем захваченные фишки
        const capturedWhite = state.capturedWhite || countCapturedPieces(pieces, PieceColor.WHITE)
        const capturedBlack = state.capturedBlack || countCapturedPieces(pieces, PieceColor.BLACK)

        // Получаем возможные ходы
        const mustCaptureFrom = state.mustCaptureFrom ? 
          { row: state.mustCaptureFrom.row, col: state.mustCaptureFrom.col } : null
        const validMoves = getAllValidMoves(pieces, currentPlayerColor, mustCaptureFrom)

        // Проверяем изменение режима фуков
        const fukiModeChanged = prevState && prevState.fukiMode !== state.fukiMode
        if (fukiModeChanged) {
          if (prevFukiModeRef.current === state.fukiMode) {
            console.log('🔥 Режим фуков изменен через gameState, уведомление уже показано')
          } else {
            prevFukiModeRef.current = state.fukiMode
          }
        }
        
        // Обновляем состояние с новым форматом
        // ВАЖНО: Сохраняем myPlayerColor из предыдущего состояния, если он был установлен
        // Это предотвращает скачки поворота доски
        const preservedMyPlayerColor = prevState?.myPlayerColor || myPlayerColor
        
        const newState = {
          ...state,
          pieces,
          currentPlayerColor,
          myPlayerColor: preservedMyPlayerColor, // Сохраняем цвет игрока
          capturedWhite,
          capturedBlack,
          validMoves,
          mustCaptureFrom
        }
        
        // Уведомления о смене хода убраны по запросу
        
        // Уведомление о начале игры
        if (prevState?.status === 'waiting' && state.status === 'active') {
          showSuccess('Игра началась!', 1500)
          setGameTimer(0) // Сбрасываем таймер при старте
        }

        // Уведомление о серии ходов
        if (mustCaptureFrom) {
          setShowSeriesAlert(true)
          setTimeout(() => setShowSeriesAlert(false), 3000)
        } else {
          setShowSeriesAlert(false)
        }
        
        return newState
      })
      
      setSelectedPieceId(null)
      setLoading(false)
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
      showInfo('Соперник отклонил предложение ничьей', 1500)
    })

    socket.on('drawAccepted', () => {
      showInfo('Ничья принята!', 1500)
    })

    socket.on('playerReady', (ready) => {
      console.log('📥 Получено состояние готовности:', ready)
      setPlayerReady(ready)
    })
    
    socket.on('playerJoined', ({ player, color, bothJoined }) => {
      console.log('📥 Игрок присоединился:', player, color)
      if (bothJoined && player) {
        const colorText = color === 'white' ? '⚪ белые' : '⚫ черные'
        showInfo(`👤 @${player.username} присоединился как ${colorText}!`, 1500)
      }
    })

    socket.on('gameStarted', () => {
      console.log('🎮 Игра началась!')
      setLoading(false) // Останавливаем загрузку
      showSuccess('🎮 Игра началась! Оба игрока готовы!', 1500)
    })
    
    socket.on('fukiModeChanged', (enabled) => {
      console.log(`🔥 Режим фуков: ${enabled ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}`)
      // Показываем уведомление только один раз при явном изменении
      if (enabled) {
        showInfo('🔥 Режим фуков включен!', 1500)
      } else {
        showInfo('♟️ Режим фуков выключен', 1500)
      }
      // Обновляем ref, чтобы не показывать уведомление при следующем gameState
      prevFukiModeRef.current = enabled
    })
    
    socket.on('connect', () => {
      console.log('✅ Socket подключен')
    })
    
    socket.on('disconnect', () => {
      console.log('❌ Socket отключен')
    })
    
    socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения socket:', error)
      setLoading(false)
    })

    socket.on('moveResult', (result) => {
      console.log('📥 Результат хода:', result)
      if (result.success) {
        if (result.gameState) {
          // Используем функциональное обновление для сохранения myPlayerColor
          setGameState(prevState => {
            // Конвертируем состояние
            let pieces = []
            if (result.gameState.pieces && Array.isArray(result.gameState.pieces)) {
              pieces = result.gameState.pieces
            } else if (result.gameState.board) {
              pieces = boardToPieces(result.gameState.board)
            }

            const currentPlayerColor = result.gameState.currentPlayerColor || 
              (result.gameState.currentPlayer === 'white' ? PieceColor.WHITE : PieceColor.BLACK)
            
            const mustCaptureFrom = result.gameState.mustCaptureFrom ? 
              { row: result.gameState.mustCaptureFrom.row, col: result.gameState.mustCaptureFrom.col } : null
            const validMoves = getAllValidMoves(pieces, currentPlayerColor, mustCaptureFrom)

            // ВАЖНО: Сохраняем myPlayerColor из предыдущего состояния
            const preservedMyPlayerColor = prevState?.myPlayerColor || 
              (result.gameState.myPlayer === 'white' ? PieceColor.WHITE : 
               result.gameState.myPlayer === 'black' ? PieceColor.BLACK : null)

            const newState = {
              ...result.gameState,
              pieces,
              currentPlayerColor,
              myPlayerColor: preservedMyPlayerColor, // Сохраняем цвет игрока
              validMoves,
              mustCaptureFrom
            }
            return newState
          })
        }
        setSelectedPieceId(null)
        
        // Обновляем lastMove для анимации
        if (result.move) {
          setLastMove(result.move)
        }
        
        // Уведомление о превращении в дамку
        if (result.becameKing) {
          showSuccess('Фишка стала дамкой!', 1500)
        }
        
        // Уведомление о сгорании фишки в режиме фуков
        if (result.fukiBurned) {
          showError('🔥 Фишка сгорела в огне!', 1000)
          setHuffedPosition(result.fukiBurnedPosition || null)
          setTimeout(() => setHuffedPosition(null), 1000)
        }
        
        // Уведомление о победе
        if (result.gameState?.status === 'finished') {
          if (result.gameState.winner === result.gameState.myPlayer) {
            showSuccess('🎉 Поздравляем! Вы выиграли!', 1000)
          } else if (result.gameState.winner === 'draw') {
            showInfo('🤝 Ничья!', 1000)
          } else {
            showError('😔 Вы проиграли', 1000)
          }
        }
      } else {
        showError(result.error || 'Неверный ход', 1500)
      }
    })
    
    socket.on('fukiBurned', ({ row, col }) => {
      console.log(`🔥 Фишка сгорела на позиции (${row}, ${col})`)
    })

    socket.on('error', (error) => {
      showError(error.message || 'Произошла ошибка', 1000)
    })

    return () => {
      socket.off('gameState')
      socket.off('moveResult')
      socket.off('drawOffered')
      socket.off('drawRejected')
      socket.off('drawAccepted')
      socket.off('playerReady')
      socket.off('playerJoined')
      socket.off('gameStarted')
      socket.off('fukiModeChanged')
      socket.off('error')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
    }
  }, [socket, showSuccess, showError, showInfo])

  // Обработка выбора фишки (новая логика из glasscheckers)
  const handleSelectPiece = (pieceId) => {
    if (!gameState || !socket) return
    if (gameState.status === 'finished') return
    
    const piece = gameState.pieces?.find(p => p.id === pieceId)
    if (!piece) return

    // Проверяем, что это фишка текущего игрока
    const myPlayerColor = gameState.myPlayerColor || 
      (gameState.myPlayer === 'white' ? PieceColor.WHITE : PieceColor.BLACK)
    const currentPlayerColor = gameState.currentPlayerColor ||
      (gameState.currentPlayer === 'white' ? PieceColor.WHITE : PieceColor.BLACK)

    if (piece.color !== currentPlayerColor || piece.color !== myPlayerColor) return

    // Проверяем обязательное взятие
    if (gameState.mustCaptureFrom) {
      if (piece.position.row !== gameState.mustCaptureFrom.row || 
          piece.position.col !== gameState.mustCaptureFrom.col) {
        return
      }
    }

    setSelectedPieceId(pieceId)
  }

  // Обработка хода (новая логика из glasscheckers)
  const handleMovePiece = (move) => {
    if (!gameState || !socket) return
    if (gameState.status === 'finished') return

    // Валидация: проверяем, что это наш ход
    const myPlayerColor = gameState.myPlayerColor || 
      (gameState.myPlayer === 'white' ? PieceColor.WHITE : PieceColor.BLACK)
    const currentPlayerColor = gameState.currentPlayerColor ||
      (gameState.currentPlayer === 'white' ? PieceColor.WHITE : PieceColor.BLACK)
    
    if (myPlayerColor !== currentPlayerColor) {
      showError('Сейчас не ваш ход!', 1500)
      return
    }

    // Валидация: проверяем, что ход валиден
    const selectedPiece = gameState.pieces?.find(p => p.id === selectedPieceId)
    if (!selectedPiece) {
      showError('Фишка не выбрана!', 1500)
      return
    }

    // Валидация: проверяем, что выбранная фишка принадлежит текущему игроку
    if (selectedPiece.color !== currentPlayerColor) {
      showError('Нельзя ходить чужой фишкой!', 1500)
      return
    }

    // Валидация: проверяем, что ход есть в списке валидных ходов
    const isValidMove = gameState.validMoves?.some(m => 
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col
    )

    if (!isValidMove) {
      showError('Неверный ход!', 1500)
      return
    }

    // Проверка обязательного взятия
    if (gameState.mustCaptureFrom) {
      if (selectedPiece.position.row !== gameState.mustCaptureFrom.row || 
          selectedPiece.position.col !== gameState.mustCaptureFrom.col) {
        showError('Обязательно бить выбранной фишкой!', 1500)
        return
      }
    }

    // Отправляем ход на сервер
    socket.emit('makeMove', {
      from: move.from,
      to: move.to
    })

    setSelectedPieceId(null)
  }

  const createGame = async () => {
    if (!isAuthenticated) return
    setError(null)
    setLoading(true)
    
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
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
        showSuccess(`Игра создана! ID: ${data.gameId}`, 1000)
      } else {
        const errorMsg = data.error || 'Ошибка создания игры'
        setError(errorMsg)
        showError(errorMsg, 1000)
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
      showError(errorMsg, 1000)
      return
    }
    
    // Нормализуем gameId
    const normalizedId = String(id).toUpperCase().trim()
    setError(null)
    setLoading(true)
    
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const apiPath = apiUrl ? `${apiUrl}/api` : '/api'
      const response = await fetch(`${apiPath}/game/join/${normalizedId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.initData}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setGameId(normalizedId)
        setError(null)
        showSuccess('Вы присоединились к игре!', 3000)
      } else {
        const errorMsg = data.error || 'Не удалось присоединиться к игре'
        setError(errorMsg)
        showError(errorMsg, 1000)
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
        showInfo('Вы сдались', 1000)
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
    showInfo('Предложение ничьей отправлено', 1000)
  }

  const handleLeave = () => {
    setConfirmDialog({
      message: 'Вы уверены, что хотите выйти из игры?',
      onConfirm: () => {
        // Очищаем состояние
        setGameId(null)
        setGameState(null)
        setSelectedPieceId(null)
        setLastMove(null)
        setPlayerReady({ white: false, black: false })
        setGameTimer(0)
        
        // Отключаемся от сокета
        if (socket) {
          socket.emit('leaveGame')
          socket.disconnect()
        }
        
        setConfirmDialog(null)
        showInfo('Вы вышли из игры', 1000)
      },
      onCancel: () => {
        setConfirmDialog(null)
      },
      confirmText: 'Выйти',
      cancelText: 'Отмена'
    })
  }

  const handleReady = async () => {
    if (!gameId || !user) {
      console.log('⚠️ handleReady: нет gameId или user')
      return
    }
    
    console.log(`🔘 handleReady: отправка готовности для игры ${gameId}, пользователь ${user.id}`)
    
    // Пробуем через API (для комнат)
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const apiPath = apiUrl ? `${apiUrl}/api` : '/api'
      const response = await fetch(`${apiPath}/set-ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.initData}`
        },
        body: JSON.stringify({ roomCode: gameId })
      })
      
      const data = await response.json()
      if (data.success) {
        showInfo('Вы готовы! Ожидаем соперника...', 1000)
        
        // Если оба готовы и игра началась, подключаемся через WebSocket
        if (data.status === 'PLAYING' && socket) {
          socket.emit('joinGame', data.gameId || gameId, user.id)
        }
      } else {
        // Если API не сработал, пробуем через WebSocket (старый способ)
        if (socket) {
          socket.emit('setReady', gameId, user.id)
          showInfo('Вы готовы! Ожидаем соперника...', 1000)
        } else {
          showError('Не удалось отправить готовность', 1000)
        }
      }
    } catch (error) {
      console.error('Ошибка отправки готовности через API:', error)
      // Пробуем через WebSocket
      if (socket) {
        socket.emit('setReady', gameId, user.id)
        showInfo('Вы готовы! Ожидаем соперника...', 1000)
      } else {
        showError('Не удалось отправить готовность', 3000)
      }
    }
  }
  
  const handleToggleFuki = () => {
    if (!socket) return
    socket.emit('toggleFukiMode')
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
          <OldGameInfo gameState={gameState} user={user} gameId={gameId} />
          {gameState?.status === 'waiting' && (
            <ReadyButton
              gameState={gameState}
              playerReady={playerReady}
              onReady={handleReady}
              onToggleFuki={handleToggleFuki}
              onLeave={handleLeave}
              disabled={!connected || loading}
              socket={socket}
            />
          )}
          {(gameState?.status === 'active' || gameState?.status === 'finished') && (
            <>
              <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full max-w-6xl px-4">
                <div className="relative w-full max-w-[500px] aspect-square z-10">
                  <Board
                    pieces={gameState?.pieces || []}
                    validMoves={gameState?.validMoves || []}
                    selectedPieceId={selectedPieceId}
                    lastMove={lastMove}
                    onSelectPiece={handleSelectPiece}
                    onMovePiece={handleMovePiece}
                    boardRotation={gameState?.myPlayerColor === PieceColor.BLACK && gameState?.status === 'active'}
                    canInteract={!gameState?.winner && gameState?.currentPlayerColor === gameState?.myPlayerColor}
                    huffedPosition={huffedPosition}
                  />
                </div>
                <GlassGameInfo
                  turn={gameState?.currentPlayerColor || PieceColor.WHITE}
                  hostName={gameState?.myPlayer === 'white' 
                    ? (user?.username || user?.first_name || 'Вы')
                    : (gameState?.opponent?.username || gameState?.opponent?.first_name || 'Соперник')}
                  hostColor={PieceColor.WHITE}
                  hostScore={gameState?.capturedBlack || 0}
                  hostId={gameState?.myPlayer === 'white' ? String(user?.id || '') : String(gameState?.opponent?.id || '')}
                  guestName={gameState?.myPlayer === 'black' 
                    ? (user?.username || user?.first_name || 'Вы')
                    : (gameState?.opponent?.username || gameState?.opponent?.first_name || 'Соперник')}
                  guestColor={PieceColor.BLACK}
                  guestScore={gameState?.capturedWhite || 0}
                  guestId={gameState?.myPlayer === 'black' ? String(user?.id || '') : String(gameState?.opponent?.id || '')}
                  timer={gameTimer}
                  myId={String(user?.id || '')}
                  roomCode={gameId}
                  hostConnected={true}
                  guestConnected={true}
                />
              </div>
              {showSeriesAlert && (
                <div className="fixed top-24 md:top-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-slide-down">
                  <div className="glass-panel px-8 py-4 rounded-2xl border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)] flex flex-col items-center bg-[#1a1a1a]/90 backdrop-blur-xl">
                    <span className="text-red-500 font-black tracking-[0.2em] text-lg uppercase shadow-red-500/50 drop-shadow-sm">Обязательно Бить</span>
                    <span className="text-gray-400 text-xs font-bold mt-1">(Серия ходов)</span>
                  </div>
                </div>
              )}
              <GameControls
                gameId={gameId}
                onSurrender={handleSurrender}
                onDraw={handleDraw}
                onToggleFuki={handleToggleFuki}
                onLeave={handleLeave}
                fukiMode={gameState?.fukiMode || false}
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

