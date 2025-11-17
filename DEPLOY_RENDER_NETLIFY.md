# 🚀 Деплой на Render.com (Backend) и Netlify (Frontend)

## 📋 Подготовка

### 1. Получение токена бота
1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте полученный токен

### 2. Настройка репозитория
Убедитесь, что ваш код загружен в GitHub/GitLab/Bitbucket

---

## 🔧 Деплой Backend на Render.com

### Шаг 1: Создание Web Service

1. Зайдите на [render.com](https://render.com) и войдите
2. Нажмите **"New +"** → **"Web Service"**
3. Подключите ваш репозиторий

### Шаг 2: Настройка сервиса

**Basic Settings:**
- **Name**: `checkers-backend` (или любое другое имя)
- **Region**: Выберите ближайший регион
- **Branch**: `main` (или ваша основная ветка)
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Advanced Settings (опционально):**
- **Health Check Path**: `/health` (Render.com будет проверять этот endpoint)
- **Auto-Deploy**: `Yes` (автоматический деплой при push в репозиторий)

### Шаг 3: Переменные окружения

Добавьте следующие переменные в разделе **Environment**:

```env
NODE_ENV=production
PORT=10000
BOT_TOKEN=7979569244:AAHipIWh9H0tp2y7f0gLurCPYXcTtMPIR4M
MINI_APP_URL=https://your-app-name.netlify.app
```

⚠️ **Важно**: 
- `PORT` должен быть `10000` для Render.com (или используйте переменную `$PORT`)
- `BOT_TOKEN` - ваш токен от BotFather (указан выше)
- `MINI_APP_URL` будет указан после деплоя фронтенда на Netlify

### Шаг 4: Деплой

1. Нажмите **"Create Web Service"**
2. Дождитесь завершения деплоя
3. Скопируйте URL вашего сервиса (например: `https://checkers-backend.onrender.com`)

### Шаг 5: Обновление Start Command (если нужно)

Если Render использует другой порт, обновите `backend/server.js`:

```javascript
const PORT = process.env.PORT || 10000
```

---

## 🎨 Деплой Frontend на Netlify

### Шаг 1: Подготовка проекта

1. Убедитесь, что в `frontend/vite.config.js` правильно настроен proxy:

```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://your-backend.onrender.com',
        changeOrigin: true
      },
      '/ws': {
        target: 'wss://your-backend.onrender.com',
        ws: true,
        changeOrigin: true
      }
    }
  }
}
```

### Шаг 2: Создание файла конфигурации Netlify

Создайте файл `netlify.toml` в корне проекта:

```toml
[build]
  base = "frontend"
  publish = "frontend/dist"
  command = "cd frontend && npm install && npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "ALLOWALL"
    X-Content-Type-Options = "nosniff"
```

### Шаг 3: Создание файла переменных окружения

Создайте файл `frontend/.env.production`:

```env
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

### Шаг 4: Деплой на Netlify

#### Вариант A: Через Netlify Dashboard

1. Зайдите на [netlify.com](https://netlify.com) и войдите
2. Нажмите **"Add new site"** → **"Import an existing project"**
3. Подключите ваш репозиторий
4. Настройте:
   - **Base directory**: `frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `frontend/dist`
5. Добавьте переменные окружения в **Site settings** → **Environment variables**:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   VITE_WS_URL=wss://your-backend.onrender.com
   ```
6. Нажмите **"Deploy site"**

#### Вариант B: Через Netlify CLI

```bash
npm install -g netlify-cli
cd frontend
npm run build
netlify deploy --prod
```

### Шаг 5: Получение URL

После деплоя Netlify предоставит URL вида: `https://your-app-name.netlify.app`

---

## 🔗 Настройка связи между сервисами

### 1. Обновите переменные окружения на Render.com

Вернитесь в Render.com и обновите переменную `MINI_APP_URL`:

```env
MINI_APP_URL=https://your-app-name.netlify.app
```

Перезапустите сервис.

### 2. Обновите конфигурацию фронтенда

Обновите `frontend/vite.config.js` с реальным URL бэкенда:

```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://your-backend.onrender.com',
        changeOrigin: true
      },
      '/ws': {
        target: 'wss://your-backend.onrender.com',
        ws: true,
        changeOrigin: true
      }
    }
  }
}
```

И обновите `frontend/src/hooks/useGameSocket.js` для production:

```javascript
const WS_URL = import.meta.env.VITE_WS_URL || 
  (import.meta.env.PROD 
    ? 'wss://your-backend.onrender.com/ws'
    : 'ws://localhost:3000/ws')
```

---

## 🤖 Настройка Telegram Mini App

### 1. Настройка Mini App в BotFather

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/newapp`
3. Выберите вашего бота
4. Укажите:
   - **Title**: Шашки
   - **Description**: Игра в шашки для Telegram
   - **Photo**: Загрузите иконку (опционально)
   - **Web App URL**: `https://your-app-name.netlify.app`
   - **Short name**: `checkers` (или другое)

### 2. Проверка работы

1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Создайте игру
4. Нажмите "Открыть игру"
5. Проверьте, что Mini App открывается и работает

---

## 🔒 Безопасность

### Валидация initData (важно для production!)

Обновите `backend/auth.js` для валидации данных Telegram:

```javascript
import crypto from 'crypto'

export function validateAuth(initData) {
  if (!initData || initData === 'dev') {
    // Для разработки
    return {
      id: 12345,
      username: 'dev_user',
      first_name: 'Dev User'
    }
  }

  // Валидация через BOT_TOKEN
  const BOT_TOKEN = process.env.BOT_TOKEN
  if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN не настроен')
  }

  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash')
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest()
    
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')
    
    if (calculatedHash !== hash) {
      throw new Error('Неверная подпись данных')
    }

    // Парсим user данные
    const userStr = urlParams.get('user')
    if (!userStr) {
      throw new Error('Данные пользователя не найдены')
    }

    const user = JSON.parse(userStr)
    return {
      id: user.id,
      username: user.username || `user_${user.id}`,
      first_name: user.first_name
    }
  } catch (error) {
    console.error('Ошибка валидации:', error)
    throw new Error('Неверные данные авторизации')
  }
}
```

---

## 🐛 Решение проблем

### Backend не запускается на Render.com

1. Проверьте логи в Render Dashboard
2. Убедитесь, что `PORT` установлен правильно
3. Проверьте, что все зависимости установлены

### Frontend не подключается к Backend

1. Проверьте CORS настройки в `backend/server.js`
2. Убедитесь, что URL бэкенда правильный в переменных окружения
3. Проверьте, что WebSocket URL использует `wss://` для HTTPS

### Бот не отвечает

1. Проверьте, что `BOT_TOKEN` правильный
2. Проверьте логи на Render.com
3. Убедитесь, что бот запущен (должно быть сообщение "🤖 Telegram бот запущен")

---

## 📝 Чеклист деплоя

- [ ] Backend задеплоен на Render.com
- [ ] Переменные окружения настроены на Render.com
- [ ] Frontend задеплоен на Netlify
- [ ] Переменные окружения настроены на Netlify
- [ ] `MINI_APP_URL` обновлён на Render.com
- [ ] Mini App настроен в BotFather
- [ ] Бот отвечает на `/start`
- [ ] Игра создаётся и работает
- [ ] WebSocket подключение работает

---

## 🔄 Обновление после изменений

### Backend
1. Закоммитьте изменения
2. Запушьте в репозиторий
3. Render.com автоматически перезапустит сервис

### Frontend
1. Закоммитьте изменения
2. Запушьте в репозиторий
3. Netlify автоматически пересоберёт и задеплоит

---

## 💰 Стоимость

- **Render.com**: Бесплатный план доступен (с ограничениями)
- **Netlify**: Бесплатный план доступен (с ограничениями)

Для production рекомендуется использовать платные планы.

