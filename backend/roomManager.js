// Менеджер комнат для игры в шашки через Telegram
import { CheckersGame } from './checkersGame.js'

class RoomManager {
  constructor() {
    this.rooms = new Map() // roomCode -> Room
    this.roomByGameId = new Map() // gameId -> roomCode
    this.cleanupInterval = null
    this.startCleanupInterval()
  }

  /**
   * Создает новую комнату
   * @param {Object} options
   * @param {number} options.creatorTgId - Telegram ID создателя
   * @param {string} options.creatorUsername - Username создателя
   * @param {boolean} options.withFuki - Режим фуков
   * @param {boolean} options.randomColor - Случайный цвет
   * @param {string} options.source - 'group' или 'private'
   * @param {number} options.chatId - ID чата (для группы)
   * @returns {Object} { roomCode, inviteLink, gameId }
   */
  createRoom({ creatorTgId, creatorUsername, withFuki = true, randomColor = true, source = 'private', chatId = null }) {
    // Генерируем уникальный код комнаты
    const roomCode = this.generateRoomCode()
    
    // Создаем игру через существующий gameManager
    // Но нам нужен доступ к gameManager, поэтому передадим его через init
    if (!this.gameManager) {
      throw new Error('RoomManager не инициализирован. Вызовите init(gameManager)')
    }

    const gameId = roomCode // Используем roomCode как gameId
    const game = this.gameManager.createGame(creatorTgId, creatorUsername, gameId)
    
    // Устанавливаем режим фуков
    if (game.fukiMode !== withFuki) {
      game.toggleFukiMode()
    }

    const room = {
      roomCode,
      gameId,
      creator: {
        tgId: creatorTgId,
        username: creatorUsername,
        ready: false
      },
      joiner: null,
      status: 'WAITING', // WAITING, PLAYING, FINISHED
      gameConfig: {
        withFuki,
        randomColor
      },
      source,
      chatId,
      createdAt: Date.now(),
      lastActivityAt: Date.now()
    }

    this.rooms.set(roomCode, room)
    this.roomByGameId.set(gameId, roomCode)

    console.log(`✅ Создана комната ${roomCode} для игрока ${creatorUsername} (${creatorTgId})`)

    return {
      roomCode,
      gameId,
      inviteLink: this.generateInviteLink(roomCode)
    }
  }

  /**
   * Присоединяет игрока к комнате
   * @param {string} roomCode - Код комнаты
   * @param {number} playerTgId - Telegram ID игрока
   * @param {string} playerUsername - Username игрока
   * @returns {Object} Данные комнаты или null
   */
  joinRoom(roomCode, playerTgId, playerUsername) {
    const normalizedCode = String(roomCode).toUpperCase().trim()
    const room = this.rooms.get(normalizedCode)

    if (!room) {
      console.log(`❌ Комната ${normalizedCode} не найдена`)
      return null
    }

    if (room.status !== 'WAITING') {
      console.log(`❌ Комната ${normalizedCode} уже начата или завершена`)
      return null
    }

    // Проверяем, не пытается ли создатель присоединиться к своей комнате
    if (room.creator.tgId === playerTgId) {
      console.log(`⚠️ Создатель пытается присоединиться к своей комнате`)
      return this.getRoomData(room)
    }

    // Если уже есть второй игрок
    if (room.joiner) {
      if (room.joiner.tgId === playerTgId) {
        // Игрок уже присоединился, возвращаем данные
        return this.getRoomData(room)
      }
      console.log(`❌ Комната ${normalizedCode} уже заполнена`)
      return null
    }

    // Добавляем второго игрока
    room.joiner = {
      tgId: playerTgId,
      username: playerUsername,
      ready: false
    }

    // Добавляем игрока в игру
    try {
      const user = {
        id: playerTgId,
        username: playerUsername,
        first_name: playerUsername
      }
      this.gameManager.joinGame(room.gameId, user)
      room.lastActivityAt = Date.now()
      
      console.log(`✅ Игрок ${playerUsername} (${playerTgId}) присоединился к комнате ${normalizedCode}`)
    } catch (error) {
      console.error(`❌ Ошибка присоединения к игре:`, error)
      room.joiner = null
      return null
    }

    return this.getRoomData(room)
  }

  /**
   * Устанавливает готовность игрока
   * @param {string} roomCode - Код комнаты
   * @param {number} playerTgId - Telegram ID игрока
   * @returns {Object} Обновленные данные комнаты или null
   */
  setReady(roomCode, playerTgId) {
    const normalizedCode = String(roomCode).toUpperCase().trim()
    const room = this.rooms.get(normalizedCode)

    if (!room) {
      return null
    }

    // Определяем, кто готов
    if (room.creator.tgId === playerTgId) {
      room.creator.ready = true
    } else if (room.joiner && room.joiner.tgId === playerTgId) {
      room.joiner.ready = true
    } else {
      return null
    }

    room.lastActivityAt = Date.now()

    // Проверяем, готовы ли оба
    const bothReady = room.creator.ready && room.joiner && room.joiner.ready

    if (bothReady && room.status === 'WAITING') {
      // Назначаем цвета
      const game = this.gameManager.getGame(room.gameId)
      if (game) {
        // Цвета уже назначены при присоединении, но можем пересоздать если нужно
        if (room.gameConfig.randomColor) {
          // Цвета уже случайные при создании
        }
        
        // Стартуем игру
        game.status = 'active'
        room.status = 'PLAYING'
        room.lastActivityAt = Date.now()
        
        console.log(`🎮 Комната ${normalizedCode}: игра началась!`)
      }
    }

    return this.getRoomData(room)
  }

  /**
   * Получает данные комнаты
   * @param {string} roomCode - Код комнаты
   * @returns {Object} Данные комнаты или null
   */
  getRoom(roomCode) {
    const normalizedCode = String(roomCode).toUpperCase().trim()
    return this.rooms.get(normalizedCode) || null
  }

  /**
   * Получает комнату по gameId
   * @param {string} gameId - ID игры
   * @returns {Object} Комната или null
   */
  getRoomByGameId(gameId) {
    const normalizedGameId = String(gameId).toUpperCase().trim()
    const roomCode = this.roomByGameId.get(normalizedGameId)
    if (!roomCode) return null
    return this.rooms.get(roomCode) || null
  }

  /**
   * Форматирует данные комнаты для отправки клиенту
   */
  getRoomData(room) {
    if (!room) return null

    return {
      roomCode: room.roomCode,
      gameId: room.gameId,
      status: room.status,
      creator: {
        username: room.creator.username,
        ready: room.creator.ready
      },
      joiner: room.joiner ? {
        username: room.joiner.username,
        ready: room.joiner.ready
      } : null,
      gameConfig: room.gameConfig
    }
  }

  /**
   * Генерирует уникальный код комнаты
   */
  generateRoomCode() {
    let code
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase()
    } while (this.rooms.has(code))
    return code
  }

  /**
   * Генерирует ссылку-приглашение
   */
  generateInviteLink(roomCode) {
    const botUsername = process.env.BOT_USERNAME || 'your_bot'
    return `https://t.me/${botUsername}?startapp=room-${roomCode}`
  }

  /**
   * Инициализация с gameManager
   */
  init(gameManager) {
    this.gameManager = gameManager
    console.log('✅ RoomManager инициализирован')
  }

  /**
   * Очистка неактивных комнат
   */
  cleanupInactiveRooms() {
    const INACTIVE_TIMEOUT = 30 * 60 * 1000 // 30 минут
    const now = Date.now()
    let cleaned = 0

    for (const [roomCode, room] of this.rooms.entries()) {
      const timeSinceActivity = now - room.lastActivityAt
      
      // Удаляем комнаты, которые неактивны более 30 минут
      if (timeSinceActivity > INACTIVE_TIMEOUT) {
        // Удаляем игру из gameManager
        if (this.gameManager && room.gameId) {
          try {
            this.gameManager.games.delete(room.gameId)
          } catch (e) {
            console.error(`Ошибка удаления игры ${room.gameId}:`, e)
          }
        }
        
        this.rooms.delete(roomCode)
        this.roomByGameId.delete(room.gameId)
        cleaned++
        console.log(`🗑️ Удалена неактивная комната ${roomCode}`)
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Очищено ${cleaned} неактивных комнат`)
    }
  }

  /**
   * Запускает периодическую очистку
   */
  startCleanupInterval() {
    // Очистка каждые 10 минут
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveRooms()
    }, 10 * 60 * 1000)
  }

  /**
   * Останавливает очистку
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

export const roomManager = new RoomManager()

