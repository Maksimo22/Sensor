require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL;

app.use(express.json());

// Проверка работы сервера
app.get('/', (req, res) => res.send('✅ Сервер работает'));

// Telegram Webhook
app.post('/webhook', async (req, res) => {
  console.log('📨 Получен запрос от Telegram', req.body);

  try {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim()?.toLowerCase();

    if (text === '/show' || text === 'показать датчики') {
      // Получаем latest данные
      const response = await axios.get(FIREBASE_URL);
      const data = response.data;

      if (!data || typeof data.temperature === 'undefined') {
        await sendToTelegram(chatId, '❌ В Firebase нет данных');
        return res.sendStatus(200);
      }

      const timestamp = new Date(data.timestamp);
      const now = new Date();
      const minutesAgo = Math.round((now - timestamp) / 60000);

      const msg = `📊 Последние данные:\n\n🌡 Температура: ${data.temperature.toFixed(2)} °C\n💧 Влажность: ${data.humidity.toFixed(2)} %\n⏱ Последний замер: ${minutesAgo} мин назад`;
      await sendToTelegram(chatId, msg);
    }
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }

  res.sendStatus(200);
});

async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: chatId, text, parse_mode: 'HTML' });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase URL: ${FIREBASE_URL}`);
});
