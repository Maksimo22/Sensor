require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL; // https://sensor-temp-3dbc5-default-rtdb.firebaseio.com/latest.json

app.use(express.json());

// Проверка сервера
app.get('/', (req, res) => {
  res.send('✅ Сервер работает! POST /webhook для Telegram');
});

// Webhook от Telegram
app.post('/webhook', async (req, res) => {
  console.log('📨 Получен запрос от Telegram');

  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim().toLowerCase();

    if (text === '/show' || text === 'показать датчики') {
      // Получаем latest
      const response = await axios.get(FIREBASE_URL);
      const sensorData = response.data;

      if (!sensorData || !sensorData.temperature) {
        await sendToTelegram(chatId, '❌ В Firebase нет данных');
        return res.sendStatus(200);
      }

      // Время последнего измерения
      const timestamp = new Date(sensorData.timestamp);
      const now = new Date();
      const diffSec = Math.floor((now - timestamp) / 1000);
      const diffMin = Math.floor(diffSec / 60);

      const msg = `📊 Последние данные:\n\n🌡 Температура: ${sensorData.temperature.toFixed(2)} °C\n💧 Влажность: ${sensorData.humidity.toFixed(2)} %\n⏱ Последнее измерение: ${diffMin} мин назад`;
      await sendToTelegram(chatId, msg);
    }
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }

  res.sendStatus(200);
});

// Отправка сообщений в Telegram
async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: chatId, text, parse_mode: 'HTML' });
}

// Тест Firebase
app.get('/test-firebase', async (req, res) => {
  try {
    const response = await axios.get(FIREBASE_URL);
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase URL: ${FIREBASE_URL}`);
});
