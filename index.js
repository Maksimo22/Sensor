app.post('/webhook', async (req, res) => {
  console.log('📨 Получен запрос от Telegram:', JSON.stringify(req.body, null, 2));
  // ... остальной код


require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_URL = process.env.FIREBASE_URL;

app.use(express.json());

// Вебхук от Telegram
app.post('/webhook', async (req, res) => {
  console.log('📨 Получен запрос от Telegram');
  
  try {
    const { message } = req.body;
    console.log('Message:', message);
    
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim();
    console.log('Text:', text);
    console.log('Chat ID:', chatId);

    // Обработка команды
    if (text === '/show' || text?.toLowerCase() === 'показать датчики') {
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
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }

  res.sendStatus(200);
});

// Остальной код оставь как был...

async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  console.log('📡 Отправка в Telegram:', url);
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

// ... остальной код без изменений
