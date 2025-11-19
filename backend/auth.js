import crypto from 'crypto'

/**
 * Валидация initData от Telegram Web App
 * @param {string} initData - Строка initData от Telegram
 * @param {string} botToken - Токен бота
 * @returns {boolean} - true если данные валидны
 */
export function validateTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) return false

  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    if (!hash) return false

    urlParams.delete('hash')
    
    // Создаем строку для проверки
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    
    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()
    
    // Вычисляем хеш
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')
    
    return calculatedHash === hash
  } catch (error) {
    console.error('Ошибка валидации initData:', error)
    return false
  }
}

/**
 * Извлекает данные пользователя из initData
 * @param {string} initData - Строка initData от Telegram
 * @returns {Object|null} - Данные пользователя или null
 */
export function extractUserFromInitData(initData) {
  if (!initData) return null

  try {
    const urlParams = new URLSearchParams(initData)
    const userStr = urlParams.get('user')
    if (!userStr) return null

    const user = JSON.parse(decodeURIComponent(userStr))
    return {
      id: user.id,
      username: user.username || `user_${user.id}`,
      first_name: user.first_name || user.username || `user_${user.id}`,
      last_name: user.last_name || null
    }
  } catch (error) {
    console.error('Ошибка извлечения пользователя из initData:', error)
    return null
  }
}

/**
 * Валидация и извлечение пользователя из initData
 * @param {string} initData - Строка initData от Telegram
 * @param {string} botToken - Токен бота (опционально, для строгой валидации)
 * @returns {Object} - Данные пользователя
 * @throws {Error} - Если данные невалидны
 */
export const validateAuth = (initData, botToken = null) => {
  // Для разработки (если initData = 'dev')
  if (initData === 'dev' || !initData) {
    console.warn('⚠️ Используется режим разработки (dev auth)')
    return {
      id: 12345,
      username: 'dev_user',
      first_name: 'Dev User'
    }
  }

  // Если передан botToken, выполняем строгую валидацию
  if (botToken) {
    const isValid = validateTelegramWebAppData(initData, botToken)
    if (!isValid) {
      throw new Error('Неверные данные авторизации: подпись не совпадает')
    }
  }

  // Извлекаем данные пользователя
  const user = extractUserFromInitData(initData)
  if (!user) {
    throw new Error('Неверные данные авторизации: пользователь не найден')
  }

  return user
}
