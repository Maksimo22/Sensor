require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL; // https://your-project.firebaseio.com/data

app.use(express.json());

// Вебхук от Telegram
app.post('/webhook', async (req, res) => {
  console.log('📨 Получен запрос от Telegram');

  try {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim();

    if (text === '/show' || text?.toLowerCase() === 'показать датчики') {
      // Берём только последний замер
      const response = await axios.get(`${FIREBASE_URL}/latest.json`);
      const sensorData = response.data;

      console.log('🔥 Последние данные из Firebase:', sensorData);

      if (!sensorData || typeof sensorData.temp === 'undefined') {
        await sendToTelegram(chatId, '❌ В Firebase нет данных');
        return res.sendStatus(200);
      }

      // Время последнего замера
      const lastTimestamp = sensorData.timestamp; // Unix timestamp в секундах
      const lastDate = new Date(lastTimestamp * 1000);
      const now = new Date();
      const diffMs = now - lastDate;
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffSeconds = Math.floor((diffMs % 60000) / 1000);

      const msg = `📊 Последние данные:\n\n` +
                  `🌡 Температура: ${sensorData.temp} °C\n` +
                  `💧 Влажность: ${sensorData.hum} %\n` +
                  `📈 Давление: ${sensorData.pres} мм\n\n` +
                  `⏱ Последний замер: ${lastDate.toLocaleTimeString()}\n` +
                  `🕒 Прошло с последнего замера: ${diffMinutes} мин ${diffSeconds} сек`;

      await sendToTelegram(chatId, msg);
    }
  } catch (error) {
    console.error('❌ Ошибка webhook:', error.message);
  }

  res.sendStatus(200);
});

// Проверка сервера
app.get('/', (req, res) => {
  res.send('✅ Сервер работает! Используй POST /webhook для Telegram');
});

// Тест Firebase
app.get('/test-firebase', async (req, res) => {
  try {
    const response = await axios.get(`${FIREBASE_URL}/latest.json`);
    res.json({
      success: true,
      data: response.data,
      message: '✅ Данные из Firebase получены'
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Отправка сообщения в Telegram
async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { 
      chat_id: chatId, 
      text: text,
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error('❌ Ошибка отправки в Telegram:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase URL: ${FIREBASE_URL}`);
});
