require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL;

app.use(express.json());

// Вебхук от Telegram
app.post('/webhook', async (req, res) => {
  console.log('📨 Получен ВЕСЬ запрос от Telegram:', JSON.stringify(req.body, null, 2));
  
  try {
    const { message } = req.body;
    
    if (!message) {
      console.log('⚠️ В запросе нет message, выходим');
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text?.trim();
    
    console.log('📝 Text:', text);
    console.log('💬 Chat ID:', chatId);
    console.log('👤 Chat type:', message.chat.type);

    // Обработка команды
    if (text === '/show' || (text && text.toLowerCase() === 'показать датчики')) {
      console.log('📊 Запрос данных из Firebase...');
      
      const response = await axios.get(FIREBASE_URL);
      console.log('🔥 Firebase response:', response.data);
      
      // Ключевое исправление тут:
      const sensorData = response.data.data || response.data;
      console.log('📈 Sensor data:', sensorData);
      
      if (!sensorData || typeof sensorData.temp === 'undefined') {
        console.log('❌ Нет данных в Firebase');
        await sendToTelegram(chatId, '❌ В Firebase нет данных');
        return res.sendStatus(200);
      }

      const msg = `📊 Последние данные:\n\n🌡 Температура: ${sensorData.temp} °C\n💧 Влажность: ${sensorData.hum} %\n📈 Давление: ${sensorData.pres} мм`;
      console.log('📤 Отправляю сообщение:', msg);
      await sendToTelegram(chatId, msg);
    } else {
      console.log('🚫 Неизвестная команда или пустой текст:', text);
    }
  } catch (error) {
    console.error('❌ Ошибка в /webhook:', error.message);
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
  console.log('📡 Отправка в Telegram, chatId:', chatId);
  try {
    const response = await axios.post(url, { 
      chat_id: chatId, 
      text: text
    });
    console.log('✅ Telegram response:', response.data);
  } catch (error) {
    console.error('❌ Telegram error:', error.response?.data || error.message);
  }
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

// Тестовый endpoint для отправки сообщения в Telegram
app.get('/test-telegram', async (req, res) => {
  const chatId = req.query.chat_id || '-1003618355884';
  const text = req.query.text || 'Тестовое сообщение от сервера';
  
  try {
    await sendToTelegram(chatId, `✅ Тест: ${text}`);
    res.send(`Сообщение отправлено в чат ${chatId}`);
  } catch (error) {
    res.send(`Ошибка: ${error.message}`);
  }
});

// Проверка работы вебхука
app.get('/webhook-info', (req, res) => {
  res.json({
    bot_token: BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует',
    firebase_url: FIREBASE_URL,
    webhook_url: `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://${req.headers.host}/webhook`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase URL: ${FIREBASE_URL}`);
  console.log(`🤖 Bot token: ${BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует'}`);
});
