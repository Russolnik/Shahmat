import { CheckersLogic } from './checkersLogic.js'

export class CheckersGame {
  constructor(gameId, creator) {
    this.gameId = gameId
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
    
    // Если оба слота пустые - это первый игрок (создатель)
    if (!this.players.white && !this.players.black) {
      // Рандомно определяем цвет создателя
      const isCreatorWhite = Math.random() < 0.5
      if (isCreatorWhite) {
        this.players.white = player
        console.log(`✅ Создатель ${player.username} (ID: ${playerId}) присоединился как БЕЛЫЕ`)
      } else {
        this.players.black = player
        console.log(`✅ Создатель ${player.username} (ID: ${playerId}) присоединился как ЧЕРНЫЕ`)
      }
    }
    // Если один слот занят - это второй игрок, он получает противоположный цвет
    else if (!this.players.white) {
      this.players.white = player
      console.log(`✅ Второй игрок ${player.username} (ID: ${playerId}) присоединился как БЕЛЫЕ`)
    } else if (!this.players.black) {
      this.players.black = player
      console.log(`✅ Второй игрок ${player.username} (ID: ${playerId}) присоединился как ЧЕРНЫЕ`)
    } else {
      throw new Error('Игра уже заполнена')
    }
    
    // Когда оба игрока присоединились, меняем статус на waiting (ожидаем готовности)
    if (this.players.white && this.players.black) {
      this.status = 'waiting' // Ожидаем готовности обоих игроков
      console.log(`🎮 Оба игрока присоединились: белые=${this.players.white.username} (ID: ${this.players.white.id}), черные=${this.players.black.username} (ID: ${this.players.black.id})`)
      console.log(`🎯 Белые ходят первыми (currentPlayer: ${this.currentPlayer})`)
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

    const state = {
      gameId: this.gameId,
      board: this.logic.getBoard(),
      currentPlayer: this.currentPlayer,
      status: this.status,
      winner: this.winner,
      myPlayer,
      opponent,
      fukiMode: this.fukiMode
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
  }
}

