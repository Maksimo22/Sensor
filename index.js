require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL || 'https://sensor-temp-3dbc5-default-rtdb.firebaseio.com/latest.json';

app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
  res.send(`
    <h1>✅ Сервер работает</h1>
    <p><a href="/check">Проверить конфигурацию</a></p>
    <p><a href="/firebase">Данные Firebase</a></p>
    <p>Webhook: POST /webhook</p>
  `);
});

// Проверка конфигурации
app.get('/check', (req, res) => {
  res.json({
    bot_token: BOT_TOKEN ? '✅ Есть' : '❌ Нет',
    firebase_url: FIREBASE_URL,
    server_time: new Date().toISOString()
  });
});

// Данные из Firebase
app.get('/firebase', async (req, res) => {
  try {
    const response = await axios.get(FIREBASE_URL);
    res.json({
      success: true,
      data: response.data,
      structure: Object.keys(response.data)
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Webhook Telegram
app.post('/webhook', async (req, res) => {
  console.log('📨 Telegram webhook получен');
  
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim();
    
    console.log(`Chat: ${chatId}, Text: "${text}"`);

    if (text === '/show' || text?.toLowerCase() === 'показать датчики') {
      // Получаем данные
      const response = await axios.get(FIREBASE_URL);
      const data = response.data;
      
      // Проверяем структуру
      const sensorData = data.data || data;
      
      if (!sensorData.temp) {
        await sendTelegram(chatId, '❌ Нет данных');
        return res.sendStatus(200);
      }

      // Формируем сообщение
      const now = new Date();
      const timeStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth()+1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const msg = `📊 Данные на ${timeStr}:\n\n🌡 ${sensorData.temp}°C\n💧 ${sensorData.hum}%\n📈 ${sensorData.pres} мм`;
      
      await sendTelegram(chatId, msg);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  res.sendStatus(200);
});

// Функция отправки в Telegram
async function sendTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: chatId, text });
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase: ${FIREBASE_URL}`);
});
