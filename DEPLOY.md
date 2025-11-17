# 🚀 Инструкция по развёртыванию

## Локальная разработка

### 1. Установка зависимостей

```bash
npm run install:all
```

### 2. Запуск в режиме разработки

```bash
npm run dev
```

Это запустит:
- **Frontend** на `http://localhost:5173`
- **Backend** на `http://localhost:3000`

## Развёртывание в продакшене

### Frontend (Netlify / Vercel)

1. Перейдите в директорию `frontend`
2. Соберите проект:
   ```bash
   npm run build
   ```
3. Загрузите папку `dist` на Netlify или Vercel
4. Настройте переменные окружения:
   - `VITE_API_URL` - URL вашего бэкенда

### Backend (Render / Railway)

1. Подключите репозиторий к Render/Railway
2. Укажите:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Настройте переменные окружения:
   - `PORT` - порт сервера (обычно 3000)
   - `NODE_ENV=production`

### Настройка Telegram Mini App

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Используйте команду `/newapp` для создания Mini App
3. Укажите URL вашего фронтенда (например, `https://your-app.netlify.app`)
4. Добавьте кнопку в группу:
   ```json
   {
     "text": "🎮 Играть в шашки",
     "web_app": {
       "url": "https://your-app.netlify.app"
     }
   }
   ```

## Проверка безопасности

⚠️ **Важно**: В продакшене обязательно реализуйте валидацию `initData` через секретный ключ Telegram!

Используйте библиотеку для проверки подписи:
- Node.js: `node-telegram-bot-api` или `crypto`
- Python: `python-telegram-bot`

Пример для Node.js:
```javascript
import crypto from 'crypto'

function validateTelegramWebAppData(initData, botToken) {
  const urlParams = new URLSearchParams(initData)
  const hash = urlParams.get('hash')
  urlParams.delete('hash')
  
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()
  
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
  
  return calculatedHash === hash
}
```

## Мониторинг

Рекомендуется добавить:
- Логирование ошибок (Sentry, LogRocket)
- Мониторинг производительности
- Аналитику использования

