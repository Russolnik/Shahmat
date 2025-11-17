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
    const gameId = req.params.id
    
    gameManager.joinGame(gameId, user)
    res.json({ success: true })
  } catch (error) {
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
    const game = gameManager.getGame(gameId)
    if (game) {
      socket.join(`game:${gameId}`)
      socket.gameId = gameId
      socket.userId = userId
      const gameState = game.getState(userId)
      io.to(`game:${gameId}`).emit('gameState', gameState)
      
      // Отправляем информацию о готовности
      try {
        const { getPlayerReady } = await import('./bot.js')
        const ready = getPlayerReady?.(gameId) || { white: false, black: false }
        socket.emit('playerReady', ready)
      } catch (error) {
        socket.emit('playerReady', { white: false, black: false })
      }
    }
  })

  socket.on('setReady', async (gameId, userId) => {
    const game = gameManager.getGame(gameId)
    if (!game) return

    // Определяем цвет игрока
    let playerColor = null
    if (game.players.white?.id === userId) {
      playerColor = 'white'
    } else if (game.players.black?.id === userId) {
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
        const gameState = game.getState(userId)
        io.to(`game:${gameId}`).emit('gameState', gameState)
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

  socket.on('makeMove', ({ from, to }) => {
    if (!socket.gameId) return
    const game = gameManager.getGame(socket.gameId)
    if (!game) return

    try {
      const result = game.makeMove(from, to)
      if (result.success) {
        const gameState = game.getState(socket.userId)
        io.to(`game:${socket.gameId}`).emit('gameState', gameState)
        io.to(`game:${socket.gameId}`).emit('moveResult', {
          success: true,
          gameState,
          becameKing: result.becameKing || false
        })

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

