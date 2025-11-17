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
    // Проверка на игру с самим собой
    if (this.players.white?.id === player.id || this.players.black?.id === player.id) {
      throw new Error('Нельзя играть с самим собой')
    }
    
    // Присваиваем игрока в свободный слот
    // Если создатель уже белый, второй игрок становится черным
    // Если создатель уже черный, второй игрок становится белым
    if (!this.players.white) {
      this.players.white = player
    } else if (!this.players.black) {
      this.players.black = player
    } else {
      throw new Error('Игра уже заполнена')
    }
    
    // Когда оба игрока присоединились, меняем статус на waiting (ожидаем готовности)
    if (this.players.white && this.players.black) {
      this.status = 'waiting' // Ожидаем готовности обоих игроков
      console.log(`Оба игрока присоединились: белые=${this.players.white.username}, черные=${this.players.black.username}`)
    }
  }

  getState(userId = null) {
    let myPlayer = null
    let opponent = null

    if (userId) {
      const userIdNum = Number(userId)
      if (this.players.white?.id === userIdNum || this.players.white?.id === userId) {
        myPlayer = 'white'
        opponent = this.players.black
      } else if (this.players.black?.id === userIdNum || this.players.black?.id === userId) {
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

