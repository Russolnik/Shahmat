import { CheckersGame } from './checkersGame.js'

export class GameManager {
  constructor() {
    this.games = new Map()
    // Запускаем периодическую очистку неактивных игр
    this.startCleanupInterval()
  }
  
  // Периодическая очистка неактивных игр
  startCleanupInterval() {
    // Проверяем каждые 5 минут
    setInterval(() => {
      this.cleanupInactiveGames()
    }, 5 * 60 * 1000)
    
    console.log('🧹 Автоматическая очистка неактивных игр запущена (каждые 5 минут)')
  }
  
  // Удаление неактивных игр
  cleanupInactiveGames() {
    const now = Date.now()
    const INACTIVE_TIMEOUT = 30 * 60 * 1000 // 30 минут
    let removedCount = 0
    
    for (const [gameId, game] of this.games.entries()) {
      if (game.isInactive()) {
        const timeSinceLastActivity = now - game.lastActivityAt
        const minutes = Math.floor(timeSinceLastActivity / 60000)
        console.log(`🗑️  Удаление неактивной игры ${gameId} (неактивна ${minutes} минут)`)
        this.games.delete(gameId)
        removedCount++
      }
    }
    
    if (removedCount > 0) {
      console.log(`✅ Удалено ${removedCount} неактивных игр. Осталось игр: ${this.games.size}`)
    }
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
    if (!gameId) return null
    // Нормализуем gameId (приводим к верхнему регистру)
    const normalizedId = String(gameId).toUpperCase().trim()
    
    // Прямой поиск
    let game = this.games.get(normalizedId)
    if (game) return game
    
    // Поиск без учета регистра (на случай, если где-то сохранили в другом регистре)
    for (const [id, g] of this.games.entries()) {
      if (String(id).toUpperCase() === normalizedId) {
        return g
      }
    }
    
    return null
  }

  generateGameId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase()
  }
}

