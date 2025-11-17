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
    
    // Нормализуем ID для сравнения
    const playerId = Number(player.id) || player.id
    const whiteId = game.players.white ? (Number(game.players.white.id) || game.players.white.id) : null
    const blackId = game.players.black ? (Number(game.players.black.id) || game.players.black.id) : null
    
    // Если игрок уже в игре - просто возвращаемся (не выбрасываем ошибку)
    if ((whiteId && whiteId === playerId) || (blackId && blackId === playerId)) {
      console.log(`⚠️ Игрок ${player.username} (ID: ${playerId}) уже в игре ${gameId}, пропускаем`)
      return
    }
    
    game.addPlayer(player)
    const color = game.players.white?.id === playerId || Number(game.players.white?.id) === playerId ? 'белые' : 'черные'
    console.log(`✅ Игрок ${player.username} (ID: ${playerId}) присоединился к игре ${gameId} как ${color}`)
  }

  getGame(gameId) {
    return this.games.get(gameId)
  }

  generateGameId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase()
  }
}

