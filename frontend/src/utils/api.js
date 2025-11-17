// Утилита для получения базового URL API
export const getApiUrl = () => {
  if (import.meta.env.PROD) {
    // В production используем переменную окружения
    return import.meta.env.VITE_API_URL || ''
  }
  // В development используем относительный путь (работает через proxy)
  return ''
}

// Утилита для получения WebSocket URL
export const getWsUrl = () => {
  if (import.meta.env.PROD) {
    // В production используем переменную окружения
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL
    }
    // Если VITE_WS_URL не указан, формируем из VITE_API_URL
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
    }
    // Fallback на текущий origin
    return window.location.origin.replace(/^http/, 'ws')
  }
  return 'http://localhost:3000'
}

