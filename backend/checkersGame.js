import { CheckersLogic } from './checkersLogic.js'

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
    this.logic = new CheckersLogic()
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
    }

    // Получаем доску из логики
    let board = this.logic.getBoard()
    
    // Проверяем, что доска инициализирована
    if (!board || board.length === 0) {
      console.error(`❌ ОШИБКА: Доска пустая в getState для игры ${this.gameId}!`)
      console.error(`   Статус: ${this.status}, Логика: ${this.logic ? 'есть' : 'отсутствует'}`)
      // Переинициализируем доску, если она пустая и игра еще не началась
      if (this.status === 'waiting' && this.logic) {
        console.log(`🔧 Переинициализация доски для игры ${this.gameId}`)
        this.logic.board = this.logic.initializeBoard()
        board = this.logic.getBoard()
      }
    }

    const state = {
      gameId: this.gameId,
      board: board,
      currentPlayer: this.currentPlayer,
      status: this.status,
      winner: this.winner,
      myPlayer,
      opponent,
      fukiMode: this.fukiMode,
      isCreator: userId ? this.isCreator(userId) : false
    }

    return state
  }

  getPossibleMoves(row, col) {
    return this.logic.getPossibleMoves(row, col, this.currentPlayer)
  }

  makeMove(from, to) {
    if (this.status !== 'active') {
      return { success: false, error: 'Игра не активна' }
    }

    const result = this.logic.makeMove(
      from.row,
      from.col,
      to.row,
      to.col,
      this.currentPlayer
    )

    if (result.success) {
      // Обновляем время последней активности
      this.lastActivityAt = Date.now()
      
      // Проверка на победу
      if (result.gameOver) {
        this.status = 'finished'
        this.winner = this.currentPlayer
      } else {
        // Переключение хода, если нет обязательного продолжения боя
        if (!result.mustContinueCapture) {
          this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white'
        }
      }
    }

    return result
  }

  surrender() {
    this.status = 'finished'
    this.winner = this.currentPlayer === 'white' ? 'black' : 'white'
    this.lastActivityAt = Date.now()
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

