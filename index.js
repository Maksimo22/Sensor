require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL; // https://sensor-temp-3dbc5-default-rtdb.firebaseio.com/data.json

app.use(express.json());

// Вебхук от Telegram
app.post('/webhook', async (req, res) => {
  console.log('📨 Получен запрос от Telegram');
  
  try {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim();

    // Обработка команды /show или "Показать датчики"
    if (text === '/show' || text?.toLowerCase() === 'показать датчики') {
      // Получаем данные из Firebase
      const response = await axios.get(FIREBASE_URL);
      console.log('🔥 Данные из Firebase:', response.data);
      
      // Твои данные в response.data.data !!!
      const sensorData = response.data?.data;
      
      if (!sensorData || typeof sensorData.temp === 'undefined') {
        await sendToTelegram(chatId, '❌ В Firebase нет данных');
        return res.sendStatus(200);
      }

      const msg = `📊 Последние данные:\n\n🌡 Температура: ${sensorData.temp} °C\n💧 Влажность: ${sensorData.hum} %\n📈 Давление: ${sensorData.pres} мм`;
      await sendToTelegram(chatId, msg);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }

  res.sendStatus(200);
});

// Проверка работы сервера
app.get('/', (req, res) => {
  res.send('✅ Сервер работает! Используй POST /webhook для Telegram');
});

// Функция отправки в Telegram
async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await axios.post(url, { 
    chat_id: chatId, 
    text: text,
    parse_mode: 'HTML'
  });
}

// Новый endpoint для теста Firebase
app.get('/test-firebase', async (req, res) => {
  try {
    const response = await axios.get(FIREBASE_URL);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase URL: ${FIREBASE_URL}`);
});
