import TelegramBot from 'node-telegram-bot-api'
import { GameManager } from './gameManager.js'
import { validateAuth } from './auth.js'

// Токен бота из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE'
const MINI_APP_URL = process.env.MINI_APP_URL || 'http://localhost:5173'

// Создаём экземпляр бота только если токен указан
let bot = null
if (BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: true })
    console.log('🤖 Telegram бот создан')
  } catch (error) {
    console.error('❌ Ошибка создания Telegram бота:', error.message)
  }
} else {
  console.log('⚠️  Telegram бот не создан (BOT_TOKEN не указан)')
}

// Менеджер игр (используем тот же, что и в сервере)
let gameManager = null

// Хранилище приглашений: gameId -> { creator, invitedUserId, status }
const invitations = new Map()

// Хранилище готовности игроков: gameId -> { white: boolean, black: boolean }
const playerReady = new Map()

// Инициализация менеджера игр
export const initBot = (gm) => {
  gameManager = gm
  console.log('🤖 Telegram бот инициализирован')
}

// Команда /start
if (bot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id
    const userId = msg.from.id
    const username = msg.from.username || msg.from.first_name

    // Проверяем, есть ли параметр gameId в команде (для приглашений)
    const args = msg.text.split(' ')
    if (args.length > 1 && args[1]) {
      const gameId = args[1].trim().toUpperCase()
      await handleJoin(chatId, userId, username, gameId)
      return
    }

    const welcomeMessage = `
🎮 <b>Добро пожаловать в Шашки!</b>

Выберите действие:
    `
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎮 Создать игру', callback_data: 'create_game' },
          { text: '🔍 Найти игру', callback_data: 'find_game' }
        ],
        [
          { text: '📖 Правила', callback_data: 'rules' }
        ]
      ]
    }

    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  })

  // Обработка inline-запросов для приглашений
  bot.on('inline_query', async (query) => {
    const userId = query.from.id
    const username = query.from.username || query.from.first_name || `user_${userId}`
    const queryText = query.query

    // Если есть gameId в запросе
    if (queryText) {
      const gameId = queryText.trim().toUpperCase()
      const game = gameManager?.getGame(gameId)
      
      if (game) {
        const results = [{
          type: 'article',
          id: `join_${gameId}`,
          title: `🎮 Присоединиться к игре ${gameId}`,
          description: `Игра создана пользователем @${game.players.white?.username || game.players.black?.username || 'unknown'}`,
          message_text: `🎮 Приглашение в игру!\n\n🆔 ID игры: ${gameId}\n\nНажмите кнопку ниже, чтобы присоединиться:`,
          reply_markup: {
            inline_keyboard: [[
              { 
                text: '🎮 Присоединиться к игре', 
                web_app: { url: `${MINI_APP_URL}?gameId=${gameId}&userId=${userId}` }
              }
            ]]
          }
        }]

        await bot.answerInlineQuery(query.id, results, {
          cache_time: 0
        })
      } else {
        await bot.answerInlineQuery(query.id, [], {
          cache_time: 0
        })
      }
    } else {
      await bot.answerInlineQuery(query.id, [], {
        cache_time: 0
      })
    }
  })
}

// Обработка callback кнопок
if (bot) {
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id
    const userId = query.from.id
    const username = query.from.username || query.from.first_name
    const data = query.data

    try {
      if (data === 'create_game') {
        await handleCreateGame(chatId, userId, username, query.from.first_name)
      } else if (data === 'find_game') {
        await handleFindGame(chatId, userId)
      } else if (data === 'rules') {
        await handleRules(chatId)
      } else if (data === 'back_to_menu') {
        await bot.sendMessage(chatId, 'Выберите действие:', {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🎮 Создать игру', callback_data: 'create_game' },
                { text: '🔍 Найти игру', callback_data: 'find_game' }
              ],
              [
                { text: '📖 Правила', callback_data: 'rules' }
              ]
            ]
          }
        })
      } else if (data.startsWith('invite_')) {
        const gameId = data.replace('invite_', '')
        await handleInvite(chatId, userId, username, gameId)
      } else if (data.startsWith('join_')) {
        const gameId = data.replace('join_', '')
        await handleJoin(chatId, userId, username, gameId, query.from.first_name)
      } else if (data.startsWith('ready_')) {
        const gameId = data.replace('ready_', '')
        await handleReady(chatId, userId, gameId)
      } else if (data.startsWith('open_game_')) {
        const gameId = data.replace('open_game_', '')
        await handleOpenGame(chatId, userId, gameId)
      }

      await bot.answerCallbackQuery(query.id)
    } catch (error) {
      console.error('Ошибка обработки callback:', error)
      await bot.answerCallbackQuery(query.id, {
        text: 'Произошла ошибка. Попробуйте ещё раз.',
        show_alert: true
      })
    }
  })
}

// Создание игры
async function handleCreateGame(chatId, userId, username, firstName) {
  try {
    const user = {
      id: userId,
      username: username,
      first_name: firstName || username
    }

    const gameId = gameManager.createGame(user)
    
    // Инициализируем готовность
    playerReady.set(gameId, { white: false, black: false })

    const message = `
✅ <b>Игра создана!</b>

🆔 <b>ID игры:</b> <code>${gameId}</code>

Отправьте этот ID другу или используйте кнопку ниже для приглашения.
    `

    // Создаём ссылку для приглашения
    // Получаем username бота
    const botInfo = await bot.getMe()
    const botUsername = botInfo.username
    const inviteLink = `https://t.me/${botUsername}?start=${gameId}`
    
    const keyboard = {
      inline_keyboard: [
        [
          { 
            text: '📤 Пригласить друга', 
            switch_inline_query: gameId 
          }
        ],
        [
          { 
            text: '🔗 Поделиться ссылкой', 
            url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`🎮 Присоединяйся к игре в шашки! ID: ${gameId}`)}`
          }
        ],
        [
          { 
            text: '🎮 Открыть игру', 
            web_app: { url: `${MINI_APP_URL}?gameId=${gameId}&userId=${userId}` }
          }
        ],
        [
          { text: '🔙 Назад', callback_data: 'back_to_menu' }
        ]
      ]
    }

    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  } catch (error) {
    console.error('Ошибка создания игры:', error)
    await bot.sendMessage(chatId, '❌ Не удалось создать игру. Попробуйте ещё раз.')
  }
}

// Поиск игры
async function handleFindGame(chatId, userId) {
  const message = `
🔍 <b>Найти игру</b>

Введите ID игры, к которой хотите присоединиться:
  `

  await bot.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Введите ID игры'
    }
  })

  // Сохраняем состояние ожидания ID
  const messageHandler = async (msg) => {
    if (msg.chat.id === chatId && msg.text && !msg.text.startsWith('/')) {
      const gameId = msg.text.trim().toUpperCase()
      await handleJoin(chatId, userId, msg.from.username || msg.from.first_name, gameId, msg.from.first_name)
      bot.removeListener('message', messageHandler)
    }
  }
  
  bot.on('message', messageHandler)
  
  // Удаляем обработчик через 60 секунд
  setTimeout(() => {
    bot.removeListener('message', messageHandler)
  }, 60000)
}

// Приглашение друга (заглушка, можно расширить)
async function handleInvite(chatId, userId, username, gameId) {
  const message = `
📤 <b>Пригласить друга</b>

🆔 <b>ID игры:</b> <code>${gameId}</b>

Отправьте этот ID другу, чтобы он мог присоединиться к игре.
  `

  await bot.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { 
          text: '🎮 Открыть игру', 
          web_app: { url: `${MINI_APP_URL}?gameId=${gameId}&userId=${userId}` }
        }
      ]]
    }
  })
}

// Присоединение к игре
async function handleJoin(chatId, userId, username, gameId, firstName) {
  try {
    const game = gameManager.getGame(gameId)
    if (!game) {
      await bot.sendMessage(chatId, '❌ Игра не найдена. Проверьте ID.')
      return
    }

    // Получаем username из Telegram, если доступен
    let userUsername = username
    if (!userUsername || userUsername === `user_${userId}`) {
      // Пытаемся получить информацию о пользователе через API бота
      try {
        const chatMember = await bot.getChatMember(chatId, userId)
        userUsername = chatMember.user?.username || chatMember.user?.first_name || `user_${userId}`
      } catch (e) {
        userUsername = username || `user_${userId}`
      }
    }

    const user = {
      id: userId,
      username: userUsername,
      first_name: firstName || userUsername
    }

    // Присоединяемся к игре
    gameManager.joinGame(gameId, user)

    // Инициализируем готовность, если ещё не инициализирована
    if (!playerReady.has(gameId)) {
      playerReady.set(gameId, { white: false, black: false })
    }

    // Получаем информацию о создателе игры
    const creator = game.players.white?.id === game.players.white?.id 
      ? game.players.white 
      : game.players.black
    const creatorName = creator?.username 
      ? `@${creator.username}` 
      : creator?.first_name || 'Неизвестный игрок'

    const message = `
✅ <b>Вы присоединились к игре!</b>

🆔 <b>ID:</b> <code>${gameId}</code>
👤 <b>Создатель:</b> ${creatorName}

Нажмите кнопку ниже, чтобы открыть игру и нажать "Готов".
    `

    const keyboard = {
      inline_keyboard: [
        [
          { 
            text: '🎮 Открыть игру', 
            web_app: { url: `${MINI_APP_URL}?gameId=${gameId}&userId=${userId}` }
          }
        ]
      ]
    }

    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    })

    // Уведомляем создателя игры
    if (creator && creator.id !== userId) {
      const creatorChatId = await getChatIdByUserId(creator.id)
      if (creatorChatId) {
        const playerName = userUsername ? `@${userUsername}` : user.first_name
        await bot.sendMessage(creatorChatId, `
👤 <b>К вам присоединился игрок!</b>

🆔 <b>ID игры:</b> <code>${gameId}</code>
👤 <b>Игрок:</b> ${playerName}

Откройте игру и нажмите "Готов", когда будете готовы начать!
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { 
                text: '🎮 Открыть игру', 
                web_app: { url: `${MINI_APP_URL}?gameId=${gameId}&userId=${creator.id}` }
              }
            ]]
          }
        })
      }
    }
  } catch (error) {
    console.error('Ошибка присоединения:', error)
    await bot.sendMessage(chatId, `❌ ${error.message || 'Не удалось присоединиться к игре.'}`)
  }
}

// Обработка готовности
async function handleReady(chatId, userId, gameId) {
  try {
    const game = gameManager.getGame(gameId)
    if (!game) {
      await bot.sendMessage(chatId, '❌ Игра не найдена.')
      return
    }

    // Определяем, какой игрок готов
    let playerColor = null
    if (game.players.white?.id === userId) {
      playerColor = 'white'
    } else if (game.players.black?.id === userId) {
      playerColor = 'black'
    } else {
      await bot.sendMessage(chatId, '❌ Вы не участник этой игры.')
      return
    }

    // Обновляем готовность
    const ready = playerReady.get(gameId) || { white: false, black: false }
    ready[playerColor] = true
    playerReady.set(gameId, ready)

    // Проверяем, готовы ли оба игрока
    if (ready.white && ready.black) {
      // Оба готовы - начинаем игру
      game.status = 'active'
      
      // Уведомляем обоих игроков
      const whiteChatId = await getChatIdByUserId(game.players.white.id)
      const blackChatId = await getChatIdByUserId(game.players.black.id)

      const startMessage = `
🎮 <b>Игра началась!</b>

Оба игрока готовы. Откройте игру и начинайте играть!
      `

      if (whiteChatId) {
        await bot.sendMessage(whiteChatId, startMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { 
                text: '🎮 Открыть игру', 
                web_app: { url: `${MINI_APP_URL}?gameId=${gameId}&userId=${game.players.white.id}` }
              }
            ]]
          }
        })
      }

      if (blackChatId) {
        await bot.sendMessage(blackChatId, startMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { 
                text: '🎮 Открыть игру', 
                web_app: { url: `${MINI_APP_URL}?gameId=${gameId}&userId=${game.players.black.id}` }
              }
            ]]
          }
        })
      }
    } else {
      await bot.sendMessage(chatId, '✅ Вы готовы! Ожидаем второго игрока...')
    }
  } catch (error) {
    console.error('Ошибка обработки готовности:', error)
    await bot.sendMessage(chatId, '❌ Произошла ошибка.')
  }
}

// Открытие игры
async function handleOpenGame(chatId, userId, gameId) {
  const message = `
🎮 <b>Открыть игру</b>

Нажмите кнопку ниже, чтобы открыть игру в Mini App.
  `

  const keyboard = {
    inline_keyboard: [[
      { 
        text: '🎮 Открыть игру', 
        web_app: { url: `${MINI_APP_URL}?gameId=${gameId}&userId=${userId}` }
      }
    ]]
  }

  await bot.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  })
}

// Правила
async function handleRules(chatId) {
  const rules = `
📖 <b>Правила игры в шашки:</b>

• Игра ведётся на доске 8×8, используются только тёмные клетки
• Белые фишки начинают игру
• Простая фишка ходит по диагонали вперёд на одну клетку
• Дамка ходит по диагонали на любое расстояние
• Взятие обязательно, если возможно
• Цепочки взятий продолжаются автоматически
• Фишка становится дамкой, достигнув противоположного края доски

🎯 <b>Цель:</b> Захватить все фишки противника или лишить его возможности хода.
  `

  await bot.sendMessage(chatId, rules, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '🔙 Назад', callback_data: 'back_to_menu' }
      ]]
    }
  })
}

// Хранилище chatId по userId (для отправки уведомлений)
const userChatIds = new Map()

// Сохранение chatId при взаимодействии
if (bot) {
  bot.on('message', (msg) => {
    if (msg.from) {
      userChatIds.set(msg.from.id, msg.chat.id)
    }
  })

  bot.on('callback_query', (query) => {
    if (query.from) {
      userChatIds.set(query.from.id, query.message.chat.id)
    }
  })
}

// Получение chatId по userId
async function getChatIdByUserId(userId) {
  return userChatIds.get(userId)
}

// Экспортируемые функции для работы с готовностью
export const getPlayerReady = (gameId) => {
  return playerReady.get(gameId) || { white: false, black: false }
}

export const setPlayerReady = (gameId, playerColor) => {
  const ready = playerReady.get(gameId) || { white: false, black: false }
  ready[playerColor] = true
  playerReady.set(gameId, ready)
  return ready
}

export const checkGameStart = (gameId) => {
  const ready = playerReady.get(gameId) || { white: false, black: false }
  return ready.white && ready.black
}

// Функция для отправки уведомления о победе
export const notifyGameFinished = async (gameId, winner, loser) => {
  if (!bot) return
  
  try {
    const winnerChatId = await getChatIdByUserId(winner.id)
    const loserChatId = await getChatIdByUserId(loser.id)

    if (winnerChatId) {
      await bot.sendMessage(winnerChatId, `
🎉 <b>Поздравляем! Вы выиграли!</b>

🆔 ID игры: <code>${gameId}</code>
👤 Соперник: @${loser.username || 'unknown'}

Спасибо за игру! 🎮
      `, {
        parse_mode: 'HTML'
      })
    }

    if (loserChatId) {
      await bot.sendMessage(loserChatId, `
😔 <b>Вы проиграли</b>

🆔 ID игры: <code>${gameId}</code>
👤 Соперник: @${winner.username || 'unknown'}

Не расстраивайтесь, попробуйте ещё раз! 🎮
      `, {
        parse_mode: 'HTML'
      })
    }
  } catch (error) {
    console.error('Ошибка отправки уведомления о победе:', error)
  }
}

// Обработка ничьей
export const notifyDraw = async (gameId, player1, player2) => {
  if (!bot) return
  
  try {
    const chatId1 = await getChatIdByUserId(player1.id)
    const chatId2 = await getChatIdByUserId(player2.id)

    const message = `
🤝 <b>Ничья!</b>

🆔 ID игры: <code>${gameId}</code>

Отличная игра! 🎮
    `

    if (chatId1) {
      await bot.sendMessage(chatId1, message, { parse_mode: 'HTML' })
    }
    if (chatId2) {
      await bot.sendMessage(chatId2, message, { parse_mode: 'HTML' })
    }
  } catch (error) {
    console.error('Ошибка отправки уведомления о ничьей:', error)
  }
}

if (bot) {
  console.log('🤖 Telegram бот запущен и готов к работе')
}

export default bot

