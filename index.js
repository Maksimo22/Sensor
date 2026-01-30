require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL; // пример: https://sensor-temp-3dbc5-default-rtdb.firebaseio.com/latest.json

app.use(express.json());

// Вебхук Telegram
app.post('/webhook', async (req, res) => {
  try {
    console.log('📨 Получен запрос от Telegram');

    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim();

    // Команда /show или "Показать датчики"
    if (text === '/show' || text?.toLowerCase() === 'показать датчики') {
      const response = await axios.get(FIREBASE_URL);
      const latest = response.data;

      if (!latest || typeof latest.temperature === 'undefined') {
        await sendToTelegram(chatId, '❌ В Firebase нет данных');
        return res.sendStatus(200);
      }

      const timestamp = new Date(latest.timestamp);
      const now = new Date();
      const diffSec = Math.floor((now - timestamp) / 1000);
      const diffMin = Math.floor(diffSec / 60);

      const msg = `📊 Последние данные:\n\n🌡 Температура: ${latest.temperature.toFixed(2)} °C\n💧 Влажность: ${latest.humidity.toFixed(2)} %\n⏱ Последний замер: ${diffMin} мин. назад`;

      await sendToTelegram(chatId, msg);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }

  res.sendStatus(200);
});

// Проверка работы сервера
app.get('/', (req, res) => {
  res.send('✅ Сервер работает! POST /webhook для Telegram.');
});

// Тест Firebase
app.get('/test-firebase', async (req, res) => {
  try {
    const response = await axios.get(FIREBASE_URL);
    res.json({
      success: true,
      data: response.data,
      message: '✅ Данные из Firebase получены'
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Отправка сообщений в Telegram
async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase URL: ${FIREBASE_URL}`);
});
