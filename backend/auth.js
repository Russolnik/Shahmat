// Упрощённая валидация для разработки
// В продакшене используйте официальную библиотеку Telegram для проверки initData
// 
// Для валидации через BOT_TOKEN используйте:
// import crypto from 'crypto'
// const BOT_TOKEN = process.env.BOT_TOKEN
// 
// function validateTelegramWebAppData(initData, botToken) {
//   const urlParams = new URLSearchParams(initData)
//   const hash = urlParams.get('hash')
//   urlParams.delete('hash')
//   
//   const dataCheckString = Array.from(urlParams.entries())
//     .sort(([a], [b]) => a.localeCompare(b))
//     .map(([key, value]) => `${key}=${value}`)
//     .join('\n')
//   
//   const secretKey = crypto
//     .createHmac('sha256', 'WebAppData')
//     .update(botToken)
//     .digest()
//   
//   const calculatedHash = crypto
//     .createHmac('sha256', secretKey)
//     .update(dataCheckString)
//     .digest('hex')
//   
//   return calculatedHash === hash
// }

export const validateAuth = (initData) => {
  if (!initData || initData === 'dev') {
    // Для разработки
    return {
      id: 12345,
      username: 'dev_user',
      first_name: 'Dev User'
    }
  }

  // В реальном приложении здесь должна быть проверка подписи через секретный ключ Telegram
  // Используйте библиотеку типа node-telegram-bot-api или crypto для проверки
  
  try {
    // Парсинг initData (пример)
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      return user
    }
  } catch (error) {
    throw new Error('Неверные данные авторизации')
  }

  throw new Error('Неверные данные авторизации')
}

