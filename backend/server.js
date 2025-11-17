import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { GameManager } from './gameManager.js'
import { validateAuth } from './auth.js'
import { initBot, notifyGameFinished, notifyDraw } from './bot.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  path: '/ws'
})

app.use(cors())
app.use(express.json())

// Health check для Render.com
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Checkers Game Server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Checkers Game Server',
    timestamp: new Date().toISOString()
  })
})

const gameManager = new GameManager()

// Инициализация бота
if (process.env.BOT_TOKEN && process.env.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
  initBot(gameManager)
  console.log('🤖 Telegram бот подключен')
} else {
  console.log('⚠️  Telegram бот не настроен (BOT_TOKEN не указан)')
}

// Авторизация
app.post('/api/auth', async (req, res) => {
  try {
    const { initData } = req.body
    // В реальном приложении здесь должна быть валидация через Telegram
    const user = validateAuth(initData)
    res.json({ success: true, user })
  } catch (error) {
    res.status(401).json({ success: false, error: error.message })
  }
})

// Создать игру
app.post('/api/game/create', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const initData = authHeader?.replace('Bearer ', '')
    const user = validateAuth(initData)
    
    const gameId = gameManager.createGame(user)
    res.json({ success: true, gameId })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// Присоединиться к игре
app.post('/api/game/join/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const initData = authHeader?.replace('Bearer ', '')
    const user = validateAuth(initData)
    const gameId = req.params.id.toUpperCase()
    
    console.log(`🌐 API: Попытка присоединения к игре ${gameId} пользователем ${user.username} (ID: ${user.id})`)
    console.log(`📋 Доступные игры: ${Array.from(gameManager.games.keys()).join(', ')}`)
    
    const game = gameManager.getGame(gameId)
    if (!game) {
      console.log(`❌ API: Игра ${gameId} не найдена`)
      return res.status(404).json({ success: false, error: 'Игра не найдена' })
    }
    
    const joinResult = gameManager.joinGame(gameId, user)
    if (joinResult?.alreadyJoined) {
      console.log(`⚠️ API: Пользователь ${user.username} уже в игре ${gameId}`)
      return res.json({ success: true, alreadyJoined: true })
    }
    
    console.log(`✅ API: Пользователь ${user.username} успешно присоединился к игре ${gameId}`)
    
    // Если оба игрока присоединились, отправляем уведомление через WebSocket
    if (joinResult?.bothJoined && game.players.white && game.players.black) {
      // Отправляем обновленное состояние обоим игрокам
      const whiteState = game.getState(game.players.white.id)
      const blackState = game.getState(game.players.black.id)
      
      // Используем io для отправки всем в комнате игры
      io.to(`game:${gameId}`).emit('gameState', whiteState)
      io.to(`game:${gameId}`).emit('gameState', blackState)
      io.to(`game:${gameId}`).emit('playerJoined', {
        player: joinResult.player,
        color: joinResult.color,
        bothJoined: true
      })
      
      console.log(`📢 Уведомление о присоединении отправлено всем игрокам в игре ${gameId}`)
    }
    
    res.json({ success: true, color: joinResult?.color })
  } catch (error) {
    console.error(`❌ API: Ошибка присоединения к игре: ${error.message}`)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Получить состояние игры
app.get('/api/game/:id/state', async (req, res) => {
  try {
    const gameId = req.params.id
    const game = gameManager.getGame(gameId)
    if (!game) {
      return res.status(404).json({ error: 'Игра не найдена' })
    }
    res.json(game.getState())
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Обработка 404 для неизвестных маршрутов
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method
  })
})

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err)
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Произошла ошибка сервера' : err.message
  })
})

// WebSocket подключения
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('joinGame', async (gameId, userId) => {
    if (!gameId) {
      console.log(`⚠️ Socket: gameId не указан`)
      return
    }
    
    // Нормализуем gameId и userId
    const normalizedGameId = String(gameId).toUpperCase().trim()
    const normalizedUserId = Number(userId) || userId
    console.log(`🔍 Socket: Поиск игры ${normalizedGameId} для пользователя ${normalizedUserId}`)
    
    const game = gameManager.getGame(normalizedGameId)
    if (game) {
      // Обновляем время последней активности при подключении
      game.lastActivityAt = Date.now()
      
      socket.join(`game:${normalizedGameId}`)
      socket.gameId = normalizedGameId
      socket.userId = normalizedUserId // Сохраняем нормализованный userId
      
      // Отправляем состояние игры конкретному игроку
      const gameState = game.getState(normalizedUserId)
      socket.emit('gameState', gameState)
      
      console.log(`✅ Socket: Пользователь ${normalizedUserId} подключился к игре ${normalizedGameId}`)
      console.log(`📊 Состояние доски: ${gameState.board ? 'есть' : 'отсутствует'}, размер: ${gameState.board?.length || 0}x${gameState.board?.[0]?.length || 0}`)
      console.log(`👤 Создатель игры: ${game.creator?.id} (тип: ${typeof game.creator?.id}), Текущий пользователь: ${normalizedUserId} (тип: ${typeof normalizedUserId})`)
      console.log(`🔐 Является создателем: ${game.isCreator(normalizedUserId)}`)
      
      // Отправляем информацию о готовности
      try {
        const { getPlayerReady } = await import('./bot.js')
        const ready = getPlayerReady?.(normalizedGameId) || { white: false, black: false }
        socket.emit('playerReady', ready)
      } catch (error) {
        socket.emit('playerReady', { white: false, black: false })
      }
    } else {
      console.log(`❌ Socket: Игра ${normalizedGameId} не найдена. Доступные игры: ${Array.from(gameManager.games.keys()).join(', ')}`)
      socket.emit('error', { message: `Игра ${normalizedGameId} не найдена` })
    }
  })

  socket.on('setReady', async (gameId, userId) => {
    const game = gameManager.getGame(gameId)
    if (!game) return

    // Нормализуем ID для сравнения
    const normalizedUserId = Number(userId) || userId
    const whiteId = game.players.white ? (Number(game.players.white.id) || game.players.white.id) : null
    const blackId = game.players.black ? (Number(game.players.black.id) || game.players.black.id) : null

    // Определяем цвет игрока
    let playerColor = null
    if (whiteId === normalizedUserId || whiteId === userId) {
      playerColor = 'white'
    } else if (blackId === normalizedUserId || blackId === userId) {
      playerColor = 'black'
    } else {
      return
    }

    // Обновляем готовность через бота
    try {
      const { setPlayerReady } = await import('./bot.js')
      const ready = setPlayerReady?.(gameId, playerColor) || { white: false, black: false }
      
      // Отправляем обновление готовности всем
      io.to(`game:${gameId}`).emit('playerReady', ready)

      // Проверяем, можно ли начать игру
      if (ready.white && ready.black && game.status === 'waiting') {
        game.status = 'active'
        game.lastActivityAt = Date.now() // Обновляем время активности при старте игры
        
        // Отправляем состояние игры обоим игрокам
        if (game.players.white) {
          const whiteState = game.getState(game.players.white.id)
          console.log(`📊 Отправка состояния белым: доска ${whiteState.board ? 'есть' : 'отсутствует'}, размер: ${whiteState.board?.length || 0}x${whiteState.board?.[0]?.length || 0}`)
          io.to(`game:${gameId}`).emit('gameState', whiteState)
        }
        if (game.players.black) {
          const blackState = game.getState(game.players.black.id)
          console.log(`📊 Отправка состояния черным: доска ${blackState.board ? 'есть' : 'отсутствует'}, размер: ${blackState.board?.length || 0}x${blackState.board?.[0]?.length || 0}`)
          io.to(`game:${gameId}`).emit('gameState', blackState)
        }
        
        io.to(`game:${gameId}`).emit('gameStarted')
      }
    } catch (error) {
      console.error('Ошибка установки готовности:', error)
    }
  })

  socket.on('getPossibleMoves', ({ row, col }, callback) => {
    if (!socket.gameId) return
    const game = gameManager.getGame(socket.gameId)
    if (!game) return
    
    const moves = game.getPossibleMoves(row, col)
    callback(moves)
  })
  
  socket.on('toggleFukiMode', () => {
    if (!socket.gameId) return
    const game = gameManager.getGame(socket.gameId)
    if (!game) return
    
    // Нормализуем userId для проверки
    const normalizedUserId = Number(socket.userId) || socket.userId
    const creatorId = Number(game.creator?.id) || game.creator?.id
    
    console.log(`🔐 Проверка прав на переключение режима фуков:`)
    console.log(`   Создатель игры: ${creatorId} (тип: ${typeof creatorId})`)
    console.log(`   Текущий пользователь: ${normalizedUserId} (тип: ${typeof normalizedUserId})`)
    console.log(`   Является создателем: ${game.isCreator(normalizedUserId)}`)
    
    // Проверяем, что это создатель игры по Telegram ID
    if (!game.isCreator(normalizedUserId)) {
      console.log(`❌ Отказ: пользователь ${normalizedUserId} не является создателем игры`)
      socket.emit('error', { message: 'Только создатель игры может изменить режим фуков' })
      return
    }
    
    if (game.status !== 'waiting') {
      socket.emit('error', { message: 'Режим фуков можно изменить только до начала игры' })
      return
    }
    
    const newMode = game.toggleFukiMode()
    console.log(`🔥 Режим фуков переключен на: ${newMode ? 'ВКЛ' : 'ВЫКЛ'} создателем ${normalizedUserId}`)
    
    // Отправляем обновленное состояние всем игрокам в комнате
    if (game.players.white) {
      const whiteState = game.getState(game.players.white.id)
      io.to(`game:${socket.gameId}`).emit('gameState', whiteState)
    }
    if (game.players.black) {
      const blackState = game.getState(game.players.black.id)
      io.to(`game:${socket.gameId}`).emit('gameState', blackState)
    }
    
    // Отправляем уведомление о изменении режима только один раз
    io.to(`game:${socket.gameId}`).emit('fukiModeChanged', newMode)
  })

  socket.on('makeMove', ({ from, to }) => {
    if (!socket.gameId) return
    const game = gameManager.getGame(socket.gameId)
    if (!game) return

    try {
      const result = game.makeMove(from, to)
      if (result.success) {
        // Отправляем состояние игры обоим игрокам
        if (game.players.white) {
          const whiteState = game.getState(game.players.white.id)
          io.to(`game:${socket.gameId}`).emit('gameState', whiteState)
        }
        if (game.players.black) {
          const blackState = game.getState(game.players.black.id)
          io.to(`game:${socket.gameId}`).emit('gameState', blackState)
        }
        
        const currentPlayerState = game.getState(socket.userId)
        io.to(`game:${socket.gameId}`).emit('moveResult', {
          success: true,
          gameState: currentPlayerState,
          becameKing: result.becameKing || false,
          fukiBurned: result.fukiBurned || false
        })
        
        // Уведомление о сгорании фишки в режиме фуков
        if (result.fukiBurned) {
          io.to(`game:${socket.gameId}`).emit('fukiBurned', {
            row: to.row,
            col: to.col
          })
        }

        // Уведомление о победе через бота
        if (result.gameOver && game.status === 'finished') {
          setTimeout(() => {
            const winner = game.winner === 'white' ? game.players.white : game.players.black
            const loser = game.winner === 'white' ? game.players.black : game.players.white
            if (winner && loser) {
              notifyGameFinished(socket.gameId, winner, loser)
            }
          }, 1000)
        }
      } else {
        socket.emit('moveResult', {
          success: false,
          error: result.error
        })
      }
    } catch (error) {
      socket.emit('moveResult', {
        success: false,
        error: error.message
      })
    }
  })

  socket.on('surrender', () => {
    if (!socket.gameId) return
    const game = gameManager.getGame(socket.gameId)
    if (game) {
      game.surrender()
      const gameState = game.getState(socket.userId)
      io.to(`game:${socket.gameId}`).emit('gameState', gameState)
      
      // Уведомление о победе через бота
      if (game.winner) {
        const winner = game.winner === 'white' ? game.players.white : game.players.black
        const loser = game.winner === 'white' ? game.players.black : game.players.white
        if (winner && loser) {
          notifyGameFinished(socket.gameId, winner, loser)
        }
      }
    }
  })

  socket.on('offerDraw', () => {
    if (!socket.gameId) return
    const game = gameManager.getGame(socket.gameId)
    if (game) {
      // Отправляем предложение ничьей другому игроку
      socket.to(`game:${socket.gameId}`).emit('drawOffered')
    }
  })

  socket.on('acceptDraw', () => {
    if (!socket.gameId) return
    const game = gameManager.getGame(socket.gameId)
    if (game) {
      game.status = 'finished'
      game.winner = 'draw'
      game.lastActivityAt = Date.now() // Обновляем время активности
      const gameState = game.getState(socket.userId)
      io.to(`game:${socket.gameId}`).emit('gameState', gameState)
      io.to(`game:${socket.gameId}`).emit('drawAccepted')
      
      // Уведомление о ничьей через бота
      if (game.players.white && game.players.black) {
        notifyDraw(socket.gameId, game.players.white, game.players.black)
      }
    }
  })

  socket.on('rejectDraw', () => {
    if (!socket.gameId) return
    io.to(`game:${socket.gameId}`).emit('drawRejected')
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 10000

// Обработка ошибок при запуске
httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} уже занят`)
  } else {
    console.error('❌ Ошибка сервера:', error)
  }
  process.exit(1)
})

// Запуск сервера
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`)
  console.log(`📡 WebSocket доступен на ws://localhost:${PORT}/ws`)
  console.log(`🌐 HTTP API доступен на http://localhost:${PORT}`)
  console.log(`✅ Health check: http://localhost:${PORT}/health`)
  
  // Проверка переменных окружения
  if (process.env.BOT_TOKEN && process.env.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
    console.log(`🤖 Telegram бот настроен`)
  } else {
    console.log(`⚠️  Telegram бот не настроен (BOT_TOKEN не указан)`)
  }
})

