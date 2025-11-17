import { CheckersGame } from './checkersGame.js'

export class GameManager {
  constructor() {
    this.games = new Map()
  }

  createGame(creator) {
    const gameId = this.generateGameId()
    const game = new CheckersGame(gameId, creator)
    this.games.set(gameId, game)
    console.log(`Игра создана: ${gameId} пользователем ${creator.username}`)
    return gameId
  }

  joinGame(gameId, player) {
    const game = this.games.get(gameId)
    if (!game) {
      throw new Error('Игра не найдена')
    }
    
    // Проверка на игру с самим собой
    if (game.players.white?.id === player.id) {
      throw new Error('Нельзя играть с самим собой')
    }
    
    game.addPlayer(player)
    console.log(`Игрок ${player.username} присоединился к игре ${gameId}`)
  }

  getGame(gameId) {
    return this.games.get(gameId)
  }

  generateGameId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase()
  }
}

