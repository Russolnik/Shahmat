# 🚀 Быстрый старт

## Настройка переменных окружения

### Backend (Render.com)

В настройках Web Service на Render.com добавьте:

```
NODE_ENV=production
PORT=10000
BOT_TOKEN=7979569244:AAHipIWh9H0tp2y7f0gLurCPYXcTtMPIR4M
MINI_APP_URL=https://your-app-name.netlify.app
```

### Frontend (Netlify)

В настройках Site → Environment variables добавьте:

```
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

## Порядок деплоя

1. **Сначала деплой Backend на Render.com**
   - Получите URL (например: `https://checkers-backend.onrender.com`)
   
2. **Затем деплой Frontend на Netlify**
   - Получите URL (например: `https://checkers-app.netlify.app`)
   
3. **Обновите переменные окружения**
   - На Render.com обновите `MINI_APP_URL` на URL Netlify
   - Перезапустите сервис

4. **Настройте Mini App в BotFather**
   - `/newapp` → выберите бота
   - Укажите URL: `https://checkers-app.netlify.app`

## Проверка

1. Откройте бота в Telegram
2. Отправьте `/start`
3. Создайте игру
4. Проверьте, что всё работает

