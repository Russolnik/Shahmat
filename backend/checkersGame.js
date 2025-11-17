import { CheckersLogic } from './checkersLogic.js'

export class CheckersGame {
  constructor(gameId, creator) {
    this.gameId = gameId
    // Рандомное определение, кто играет белыми, а кто чёрными
    const isCreatorWhite = Math.random() < 0.5
    this.players = {
      white: isCreatorWhite ? creator : null,
      black: isCreatorWhite ? null : creator
    }
    this.logic = new CheckersLogic()
    this.status = 'waiting' // waiting, active, finished
    this.winner = null
    // Белые всегда ходят первыми (стандартные правила шашек)
    this.currentPlayer = 'white'
  }

  addPlayer(player) {
    // Нормализуем ID для сравнения
    const playerId = Number(player.id) || player.id
    const whiteId = this.players.white ? (Number(this.players.white.id) || this.players.white.id) : null
    const blackId = this.players.black ? (Number(this.players.black.id) || this.players.black.id) : null
    
    // Проверка на игру с самим собой
    if (whiteId === playerId || blackId === playerId) {
      console.log(`❌ Попытка присоединения: игрок ${player.username} (ID: ${playerId}, тип: ${typeof playerId}) уже в игре`)
      console.log(`   Белые: ${whiteId} (тип: ${typeof whiteId}), Черные: ${blackId} (тип: ${typeof blackId})`)
      throw new Error('Нельзя играть с самим собой')
    }
    
    // Присваиваем игрока в свободный слот
    // Если создатель уже белый, второй игрок становится черным
    // Если создатель уже черный, второй игрок становится белым
    if (!this.players.white) {
      this.players.white = player
      console.log(`✅ Игрок ${player.username} (ID: ${playerId}) присоединился как БЕЛЫЕ`)
    } else if (!this.players.black) {
      this.players.black = player
      console.log(`✅ Игрок ${player.username} (ID: ${playerId}) присоединился как ЧЕРНЫЕ`)
    } else {
      throw new Error('Игра уже заполнена')
    }
    
    // Когда оба игрока присоединились, меняем статус на waiting (ожидаем готовности)
    if (this.players.white && this.players.black) {
      this.status = 'waiting' // Ожидаем готовности обоих игроков
      console.log(`🎮 Оба игрока присоединились: белые=${this.players.white.username} (ID: ${this.players.white.id}), черные=${this.players.black.username} (ID: ${this.players.black.id})`)
    }
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
      opponent
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

