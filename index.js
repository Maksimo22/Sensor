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
      keys: Object.keys(response.data || {})
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
    if (!message) {
      console.log('⚠️ Нет message в запросе');
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text ? message.text.trim() : '';
    
    console.log(`💬 Chat: ${chatId}, Text: "${text}"`);

    // Команда /show или "Показать датчики"
    if (text === '/show' || text.toLowerCase() === 'показать датчики') {
      console.log('🔍 Запрашиваю Firebase...');
      
      // Получаем данные
      const response = await axios.get(FIREBASE_URL);
      console.log('📦 Firebase ответ:', JSON.stringify(response.data));
      
      const sensorData = response.data;
      
      // Поддержка разных названий полей
      const temp = sensorData.temperature || sensorData.temp;
      const hum = sensorData.humidity || sensorData.hum;
      const pres = sensorData.pressure || sensorData.pres;
      const timestamp = sensorData.timestamp;
      
      // Проверка данных
      if (typeof temp === 'undefined') {
        console.log('❌ Нет данных температуры');
        await sendTelegram(chatId, '❌ В Firebase нет данных температуры');
        return res.sendStatus(200);
      }

      // Формируем время
      let timeDisplay;
      if (timestamp && typeof timestamp === 'string') {
        try {
          // Парсим время из ESP32 (формат: "2026-01-30T20:15:00")
          const espTime = new Date(timestamp);
          if (!isNaN(espTime.getTime())) {
            const hours = espTime.getHours().toString().padStart(2, '0');
            const minutes = espTime.getMinutes().toString().padStart(2, '0');
            timeDisplay = `${hours}:${minutes}`;
          }
        } catch (e) {
          console.log('⚠️ Ошибка парсинга времени:', e.message);
        }
      }
      
      // Если время из ESP32 некорректно, используем серверное
      if (!timeDisplay) {
        const now = new Date();
        timeDisplay = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      }

      // Формируем сообщение
      let msg = `📊 Данные на ${timeDisplay}:\n\n🌡 Температура: ${temp} °C\n💧 Влажность: ${hum} %`;
      
      // Добавляем давление, если есть
      if (typeof pres !== 'undefined') {
        msg += `\n📈 Давление: ${pres} мм`;
      }
      
      console.log('📤 Отправляю сообщение:', msg);
      await sendTelegram(chatId, msg);
      console.log('✅ Сообщение отправлено');
    } else {
      console.log(`🚫 Неизвестная команда: "${text}"`);
    }
  } catch (error) {
    console.error('❌ Ошибка в webhook:', error.message);
  }

  res.sendStatus(200);
});

// Функция отправки в Telegram
async function sendTelegram(chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await axios.post(url, { 
      chat_id: chatId, 
      text: text 
    });
    console.log('📡 Telegram ответ:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка отправки в Telegram:', error.response?.data || error.message);
    throw error;
  }
}

// Тест отправки в Telegram
app.get('/telegram', async (req, res) => {
  const chatId = req.query.chat_id || '-1003618355884';
  const text = req.query.text || 'Тест от сервера';
  
  try {
    await sendTelegram(chatId, `✅ ${text}`);
    res.json({ success: true, sent_to: chatId });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Firebase URL: ${FIREBASE_URL}`);
  console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? 'установлен' : 'НЕТ!'}`);
});
