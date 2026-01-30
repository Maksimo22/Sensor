require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL; // корень Realtime DB

app.use(express.json());

// Отправка сообщения в Telegram
async function sendToTelegram(chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error('❌ Ошибка при отправке в Telegram:', err.message);
  }
}

// Вебхук Telegram
app.post('/webhook', async (req, res) => {
  console.log('📨 Получен запрос от Telegram');

  try {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim().toLowerCase();

    if (text === '/show' || text === 'показать датчики') {
      const response = await axios.get(`${FIREBASE_URL}/latest.json`);
      const sensorData = response.data;

      if (!sensorData || typeof sensorData.temperature === 'undefined') {
        await sendToTelegram(chatId, '❌ В Firebase нет данных latest');
        return res.sendStatus(200);
      }

      // Время последнего замера
      let intervalText = '';
      if (sensorData.timestamp) {
        const lastTime = new Date(sensorData.timestamp).getTime();
        const diffMs = Date.now() - lastTime;
        const diffMin = Math.floor(diffMs / 60000);
        intervalText = `⏱ Прошло с последнего замера: ${diffMin} мин\n`;
      }

      const msg = `📊 Последние данные:\n\n🌡 Температура: ${sensorData.temperature.toFixed(2)} °C\n💧 Влажность: ${sensorData.humidity.toFixed(2)} %\n${intervalText}`;
      await sendToTelegram(chatId, msg);
    }
  } catch (err) {
    console.error('❌ Ошибка вебхука:', err.message);
  }

  res.sendStatus(200);
});

// Проверка сервера
app.get('/', (req, res) => {
  res.send('✅ Сервер работает! Используй POST /webhook для Telegram');
});

// Endpoint для теста Firebase
app.get('/test-firebase', async (req, res) => {
  try {
    const response = await axios.get(`${FIREBASE_URL}/latest.json`);
    res.json({
      success: true,
      data: response.data,
      message: '✅ Данные latest из Firebase получены'
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase URL: ${FIREBASE_URL}`);
});
