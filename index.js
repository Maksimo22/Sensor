require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL || 'https://sensor-temp-3dbc5-default-rtdb.firebaseio.com/data.json';

app.use(express.json());

// 1. ГЛАВНАЯ СТРАНИЦА
app.get('/', (req, res) => {
  res.json({
    status: '✅ Сервер работает',
    endpoints: {
      home: 'GET /',
      test: 'GET /test',
      firebase: 'GET /firebase',
      telegram: 'GET /telegram?text=Hello',
      webhook: 'POST /webhook (Telegram)'
    },
    env: {
      has_bot_token: !!BOT_TOKEN,
      firebase_url: FIREBASE_URL
    }
  });
});

// 2. ПРОСТОЙ ТЕСТ
app.get('/test', (req, res) => {
  res.json({ 
    message: '✅ Тест работает!',
    timestamp: new Date().toISOString(),
    server: 'Render.com'
  });
});

// 3. ПРОВЕРКА FIREBASE
app.get('/firebase', async (req, res) => {
  try {
    const response = await axios.get(FIREBASE_URL);
    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// 4. ТЕСТ TELEGRAM
app.get('/telegram', async (req, res) => {
  const chatId = req.query.chat_id || '-1003618355884';
  const text = req.query.text || 'Тест от сервера';
  
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: `📡 ${text}`
    });
    res.json({ success: true, sent_to: chatId });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 5. WEBHOOK TELEGRAM (ОСНОВНОЙ)
app.post('/webhook', async (req, res) => {
  console.log('📨 Telegram webhook вызван');
  
  try {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim();
    
    console.log(`💬 Chat: ${chatId}, Text: "${text}"`);

    if (text === '/show' || text?.toLowerCase() === 'показать датчики') {
      // Получаем данные из Firebase
      const response = await axios.get(FIREBASE_URL);
      const data = response.data.data || response.data;
      
      if (!data || !data.temp) {
        await sendTelegram(chatId, '❌ Нет данных');
        return res.sendStatus(200);
      }

      const msg = `📊 Данные:\n🌡 ${data.temp}°C\n💧 ${data.hum}%\n📈 ${data.pres} мм`;
      await sendTelegram(chatId, msg);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
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
  console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? 'есть' : 'НЕТ!'}`);
  console.log(`🔥 Firebase: ${FIREBASE_URL}`);
});
