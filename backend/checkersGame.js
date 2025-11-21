import { GlassCheckersLogic } from './glassCheckersLogic.js'

export class CheckersGame {
  constructor(gameId, creator) {
    this.gameId = gameId
    // Сохраняем создателя игры
    this.creator = creator
    // Создатель пока не имеет цвета - будет определен при присоединении второго игрока
    this.players = {
      white: null,
      black: null
    }
    // Статус подключения игроков
    this.playerConnected = {
      white: true,
      black: true
    }
    this.logic = new GlassCheckersLogic()
    // Храним состояние для цепочек взятий
    this.mustCaptureFrom = null
    // Инициализируем фишки при создании игры
    this.logic.setBoard(this.logic.initializeBoard())
    this.status = 'waiting' // waiting, active, finished
    this.winner = null
    // Белые всегда ходят первыми (стандартные правила шашек)
    this.currentPlayer = 'white'
    // Режим с фуками (по умолчанию выключен)
    this.fukiMode = false
    // Временные метки для очистки неактивных игр
    this.createdAt = Date.now()
    this.lastActivityAt = Date.now()
  }
  
  isCreator(userId) {
    if (!userId || !this.creator) return false
    const userIdNum = Number(userId) || userId
    const creatorId = Number(this.creator.id) || this.creator.id
    return userIdNum === creatorId || userId === creatorId
  }

  addPlayer(player) {
    // Нормализуем ID для сравнения
    const playerId = Number(player.id) || player.id
    const whiteId = this.players.white ? (Number(this.players.white.id) || this.players.white.id) : null
    const blackId = this.players.black ? (Number(this.players.black.id) || this.players.black.id) : null
    
    // Проверка на игру с самим собой - только если игрок УЖЕ в игре
    if ((whiteId && whiteId === playerId) || (blackId && blackId === playerId)) {
      console.log(`⚠️ Игрок ${player.username} (ID: ${playerId}) уже в игре, пропускаем повторное присоединение`)
      return // Не выбрасываем ошибку, просто игнорируем
    }
    
    // Сохраняем игрока с нормализованным ID
    const normalizedPlayer = { ...player, id: playerId }
    
    // Если оба слота пустые - это первый игрок (создатель)
    if (!this.players.white && !this.players.black) {
      // Рандомно определяем цвет создателя
      const isCreatorWhite = Math.random() < 0.5
      if (isCreatorWhite) {
        this.players.white = normalizedPlayer
        console.log(`✅ Создатель ${player.username} (ID: ${playerId}) присоединился как БЕЛЫЕ`)
      } else {
        this.players.black = normalizedPlayer
        console.log(`✅ Создатель ${player.username} (ID: ${playerId}) присоединился как ЧЕРНЫЕ`)
      }
    }
    // Если один слот занят - это второй игрок, он ВСЕГДА получает противоположный цвет
    else if (this.players.white && !this.players.black) {
      // Создатель белый, второй игрок становится черным
      this.players.black = normalizedPlayer
      console.log(`✅ Второй игрок ${player.username} (ID: ${playerId}) присоединился как ЧЕРНЫЕ (создатель был белым)`)
    } else if (!this.players.white && this.players.black) {
      // Создатель черный, второй игрок становится белым
      this.players.white = normalizedPlayer
      console.log(`✅ Второй игрок ${player.username} (ID: ${playerId}) присоединился как БЕЛЫЕ (создатель был черным)`)
    } else {
      throw new Error('Игра уже заполнена')
    }
    
    // Когда оба игрока присоединились, меняем статус на waiting (ожидаем готовности)
    if (this.players.white && this.players.black) {
      this.status = 'waiting' // Ожидаем готовности обоих игроков
      this.lastActivityAt = Date.now() // Обновляем время активности
      
      // Финальная проверка: убеждаемся, что цвета разные
      const whiteIdFinal = Number(this.players.white.id) || this.players.white.id
      const blackIdFinal = Number(this.players.black.id) || this.players.black.id
      
      console.log(`🎮 Оба игрока присоединились:`)
      console.log(`   БЕЛЫЕ: ${this.players.white.username} (ID: ${whiteIdFinal}, тип: ${typeof whiteIdFinal})`)
      console.log(`   ЧЕРНЫЕ: ${this.players.black.username} (ID: ${blackIdFinal}, тип: ${typeof blackIdFinal})`)
      console.log(`🎯 Белые ходят первыми (currentPlayer: ${this.currentPlayer})`)
      
      // КРИТИЧЕСКАЯ ПРОВЕРКА: если ID одинаковые, это ошибка
      if (whiteIdFinal === blackIdFinal) {
        console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: Оба игрока имеют одинаковый ID! ${whiteIdFinal}`)
        console.error(`   Белые ID: ${whiteIdFinal}, Черные ID: ${blackIdFinal}`)
        console.error(`   Белые username: ${this.players.white.username}, Черные username: ${this.players.black.username}`)
        // Принудительно исправляем: второй игрок получает противоположный цвет создателя
        const creatorId = Number(this.creator?.id) || this.creator?.id
        if (creatorId === whiteIdFinal) {
          // Создатель белый, второй игрок должен быть черным
          this.players.black = normalizedPlayer
          console.log(`🔧 ИСПРАВЛЕНИЕ: Второй игрок принудительно установлен как ЧЕРНЫЕ`)
        } else {
          // Создатель черный, второй игрок должен быть белым
          this.players.white = normalizedPlayer
          console.log(`🔧 ИСПРАВЛЕНИЕ: Второй игрок принудительно установлен как БЕЛЫЕ`)
        }
      }
      
      // Финальная проверка: убеждаемся, что один белый, другой черный
      if (!this.players.white || !this.players.black) {
        console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: Не хватает игрока! Белые: ${!!this.players.white}, Черные: ${!!this.players.black}`)
      }
    }
    
    // Возвращаем информацию о присоединении для уведомлений
    return {
      player: normalizedPlayer,
      color: this.players.white?.id === playerId ? 'white' : 'black',
      bothJoined: !!(this.players.white && this.players.black)
    }
  }
  
  toggleFukiMode() {
    this.fukiMode = !this.fukiMode
    this.logic.setFukiMode(this.fukiMode)
    console.log(`🔥 Режим фуков: ${this.fukiMode ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}`)
    return this.fukiMode
  }

  getState(userId = null) {
    let myPlayer = null
    let opponent = null

    if (userId) {
      // Нормализуем ID для сравнения
      const userIdNum = Number(userId) || userId
      const whiteId = this.players.white ? (Number(this.players.white.id) || this.players.white.id) : null
      const blackId = this.players.black ? (Number(this.players.black.id) || this.players.black.id) : null
      
      if (whiteId === userIdNum || whiteId === userId) {
        myPlayer = 'white'
        opponent = this.players.black
      } else if (blackId === userIdNum || blackId === userId) {
        myPlayer = 'black'
        opponent = this.players.white
      }
      
      // Логирование для отладки
      if (this.players.white && this.players.black) {
        console.log(`📊 getState для ${userId}:`)
        console.log(`   Белые: ${this.players.white.username} (ID: ${whiteId})`)
        console.log(`   Черные: ${this.players.black.username} (ID: ${blackId})`)
        console.log(`   Текущий пользователь: ${userIdNum}`)
        console.log(`   myPlayer: ${myPlayer}, opponent: ${opponent?.username || 'нет'}`)
      }
    }

    // Получаем фишки из логики
    let pieces = this.logic.getBoard()
    
    // Проверяем, что фишки инициализированы
    if (!pieces || pieces.length === 0) {
      console.error(`❌ ОШИБКА: Фишки не инициализированы в getState для игры ${this.gameId}!`)
      console.error(`   Статус: ${this.status}, Логика: ${this.logic ? 'есть' : 'отсутствует'}`)
      // Переинициализируем фишки, если они пустые и игра еще не началась
      if (this.status === 'waiting' && this.logic) {
        console.log(`🔧 Переинициализация фишек для игры ${this.gameId}`)
        this.logic.setBoard(this.logic.initializeBoard())
        pieces = this.logic.getBoard()
      }
    }

    // Конвертируем фишки в формат доски для совместимости со старым фронтендом
    const board = this.piecesToBoard(pieces)
    
    // Подсчитываем захваченные фишки
    const totalWhite = 12
    const totalBlack = 12
    const currentWhite = pieces.filter(p => p.color === 'WHITE').length
    const currentBlack = pieces.filter(p => p.color === 'BLACK').length
    const capturedWhite = Math.max(0, totalWhite - currentWhite)
    const capturedBlack = Math.max(0, totalBlack - currentBlack)

    // Конвертируем currentPlayer в формат PieceColor
    const currentPlayerColor = this.currentPlayer === 'white' ? 'WHITE' : 'BLACK'
    const myPlayerColor = myPlayer === 'white' ? 'WHITE' : (myPlayer === 'black' ? 'BLACK' : null)
    
    const state = {
      gameId: this.gameId,
      board: board, // Старый формат для совместимости
      pieces: pieces, // Новый формат из glasscheckers
      currentPlayer: this.currentPlayer, // 'white' или 'black' для совместимости
      currentPlayerColor: currentPlayerColor, // 'WHITE' или 'BLACK' для glasscheckers
      status: this.status,
      winner: this.winner,
      myPlayer,
      myPlayerColor: myPlayerColor, // Для glasscheckers компонентов
      opponent: opponent ? {
        id: opponent.id,
        username: opponent.username || opponent.first_name || `user_${opponent.id}`,
        first_name: opponent.first_name || opponent.username || `user_${opponent.id}`
      } : null,
      fukiMode: this.fukiMode,
      isCreator: userId ? this.isCreator(userId) : false,
      mustCaptureFrom: this.mustCaptureFrom,
      capturedWhite: capturedWhite,
      capturedBlack: capturedBlack,
      // Статус подключения игроков
      whiteConnected: this.playerConnected.white,
      blackConnected: this.playerConnected.black
    }

    return state
  }

  // Конвертация фишек в формат доски (для совместимости)
  piecesToBoard(pieces) {
    const board = Array(8).fill(null).map(() => Array(8).fill(null))
    pieces.forEach(piece => {
      const row = piece.position.row
      const col = piece.position.col
      board[row][col] = {
        player: piece.color === 'WHITE' ? 'white' : 'black',
        isKing: piece.isKing
      }
    })
    return board
  }

  getPossibleMoves(row, col) {
    const pieces = this.logic.getBoard()
    const piece = pieces.find(p => p.position.row === row && p.position.col === col)
    if (!piece) return []
    
    const playerColor = this.currentPlayer === 'white' ? 'WHITE' : 'BLACK'
    if (piece.color !== playerColor) return []
    
    const moves = this.logic.getMovesForPiece(piece, pieces, this.mustCaptureFrom)
    
    // Конвертируем в старый формат для совместимости
    return moves.map(m => ({
      row: m.to.row,
      col: m.to.col,
      isCapture: m.isCapture,
      capturedRow: m.capturedPosition?.row,
      capturedCol: m.capturedPosition?.col
    }))
  }

  makeMove(from, to) {
    if (this.status !== 'active') {
      return { success: false, error: 'Игра не активна' }
    }

    const pieces = this.logic.getBoard()
    const playerColor = this.currentPlayer === 'white' ? 'WHITE' : 'BLACK'
    
    // Находим фишку
    const piece = pieces.find(p => 
      p.position.row === from.row && 
      p.position.col === from.col &&
      p.color === playerColor
    )
    
    if (!piece) {
      return { success: false, error: 'Фишка не найдена' }
    }

    // Создаем объект хода
    const move = {
      from: piece.position,
      to: to,
      isCapture: false,
      capturedPieceId: null,
      capturedPosition: null
    }

    // Проверяем, является ли это взятием
    const validMoves = this.logic.getMovesForPiece(piece, pieces, this.mustCaptureFrom)
    const validMove = validMoves.find(m => 
      m.to.row === to.row && 
      m.to.col === to.col
    )
    
    if (!validMove) {
      return { success: false, error: 'Неверный ход' }
    }

    move.isCapture = validMove.isCapture
    move.capturedPieceId = validMove.capturedPieceId
    move.capturedPosition = validMove.capturedPosition

    // Выполняем ход
    const result = this.logic.makeMove(pieces, move, playerColor, this.mustCaptureFrom)

    if (result.success) {
      // Обновляем фишки в логике
      this.logic.setBoard(result.pieces)
      
      // Обновляем состояние
      this.mustCaptureFrom = result.nextMustCaptureFrom
      
      // Обновляем время последней активности
      this.lastActivityAt = Date.now()
      
      // Проверка на победу
      if (result.gameOver) {
        this.status = 'finished'
        this.winner = result.winner === 'WHITE' ? 'white' : 'black'
      } else {
        // Переключение хода, если нет обязательного продолжения боя
        if (!result.mustContinueCapture) {
          this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white'
          this.mustCaptureFrom = null
        }
      }
      
      // Добавляем информацию о превращении в объект хода
      const executedMove = {
        ...move,
        isPromotion: result.becameKing
      }

      return {
        success: true,
        becameKing: result.becameKing || false,
        mustContinueCapture: result.mustContinueCapture || false,
        gameOver: result.gameOver || false,
        fukiBurned: result.fukiBurned || false,
        fukiBurnedPosition: result.burnedPosition || null,
        executedMove: executedMove
      }
    }

    return result
  }

  surrender() {
    this.status = 'finished'
    this.winner = this.currentPlayer === 'white' ? 'black' : 'white'
    this.lastActivityAt = Date.now()
    // Отмечаем сдавшегося игрока как отключенного
    if (this.currentPlayer === 'white') {
      this.playerConnected.white = false
    } else {
      this.playerConnected.black = false
    }
  }

  passTurn(playerColor) {
    if (this.status !== 'active') return { success: false, error: 'Игра не активна' }
    
    // Check correct player
    if (this.currentPlayer !== playerColor) return { success: false, error: 'Сейчас не ваш ход' }

    // Can only pass if capture series is in progress
    if (!this.mustCaptureFrom) return { success: false, error: 'Нельзя передать ход в данный момент' }

    // Switch turn
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white'
    this.mustCaptureFrom = null
    this.lastActivityAt = Date.now()
    
    return { success: true }
  }
  
  // Отметить игрока как отключенного
  setPlayerDisconnected(playerId) {
    const playerIdNum = Number(playerId) || playerId
    const whiteId = this.players.white ? (Number(this.players.white.id) || this.players.white.id) : null
    const blackId = this.players.black ? (Number(this.players.black.id) || this.players.black.id) : null
    
    if (whiteId === playerIdNum) {
      this.playerConnected.white = false
    } else if (blackId === playerIdNum) {
      this.playerConnected.black = false
    }
  }
  
  // Проверка, является ли игра неактивной (более 30 минут без активности)
  isInactive() {
    const INACTIVE_TIMEOUT = 30 * 60 * 1000 // 30 минут в миллисекундах
    const timeSinceLastActivity = Date.now() - this.lastActivityAt
    
    // Если игра в статусе waiting и прошло 30 минут с создания
    if (this.status === 'waiting') {
      const timeSinceCreation = Date.now() - this.createdAt
      return timeSinceCreation > INACTIVE_TIMEOUT
    }
    
    // Если игра активна или завершена, проверяем время последней активности
    return timeSinceLastActivity > INACTIVE_TIMEOUT
  }
}

