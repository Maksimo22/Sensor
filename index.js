require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();

// Переменные окружения
const BOT_TOKEN = process.env.BOT_TOKEN;
const SHEETS_URL = process.env.SHEETS_URL;
const SETTINGS_URL = process.env.SETTINGS_URL;

// Имя бота (без @)
const BOT_USERNAME = "TempSensorBot_bot";

app.use(express.json());

// Функция для очистки команды от упоминания бота
function cleanCommand(text) {
  if (!text) return "";
  
  // Удаляем @имя_бота из команды
  if (text.includes('@')) {
    return text.split('@')[0];
  }
  return text;
}

// ==================== ВЕБХУК ДЛЯ TELEGRAM ====================
app.post('/webhook', async (req, res) => {
  try {
    // Логируем ВСЁ, что приходит
    console.log('\n========== НОВЫЙ ЗАПРОС ==========');
    console.log('🔥 Полный запрос:', JSON.stringify(req.body, null, 2));
    console.log('🔥 Headers:', req.headers);
    
    const message = req.body.message;
    if (!message) {
      console.log('❌ НЕТ MESSAGE В ЗАПРОСЕ!');
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const rawText = message.text?.trim() || "";
    const text = cleanCommand(rawText);

    console.log('\n📨 ИНФОРМАЦИЯ О СООБЩЕНИИ:');
    console.log(`   Chat ID: ${chatId}`);
    console.log(`   Chat type: ${chatType}`);
    console.log(`   From: ${message.from?.username || 'unknown'}`);
    console.log(`   Raw text: "${rawText}"`);
    console.log(`   Clean text: "${text}"`);
    console.log(`   Text length: ${text.length}`);
    console.log(`   First char code: ${text.charCodeAt(0)}`);

    // Проверяем точное совпадение
    console.log('\n🔍 ПРОВЕРКА СОВПАДЕНИЙ:');
    console.log(`   text === '/help'? ${text === '/help'}`);
    console.log(`   text === '/show'? ${text === '/show'}`);
    console.log(`   text === '/settings'? ${text === '/settings'}`);

    // ===== HELP =====
    if (text === '/help') {
      console.log('✅ НАЙДЕНА КОМАНДА /help');
      const help = 
`📋 *Доступные команды:*

/show - последние данные с датчика
/settings - текущие настройки
/set_period [N] - установить период (мин)
/set_threshold [T] - установить порог (°C)
/help - это сообщение

*Примеры:*
/set_period 30 - замеры каждые 30 мин
/set_threshold 18 - предупреждение при <18°C`;

      await sendMessage(chatId, help);
    }
    
    // ===== ПОКАЗАТЬ ПОСЛЕДНИЕ ДАННЫЕ =====
    else if (text === '/show') {
      console.log('✅ НАЙДЕНА КОМАНДА /show');
      try {
        console.log('📤 Запрос к SHEETS_URL:', SHEETS_URL);
        const response = await axios.get(SHEETS_URL);
        console.log('📥 Ответ от Google Sheets:', response.data);
        
        const data = response.data;
        
        if (data.error) {
          await sendMessage(chatId, "❌ Нет данных в таблице");
          return res.sendStatus(200);
        }

        const msg = 
`📊 *Последние данные:*

📅 ${data.datetime || 'Нет даты'}
🌡 Температура: ${Number(data.temperature).toFixed(2)} °C
💧 Влажность: ${Number(data.humidity).toFixed(2)} %
📈 Давление: ${Number(data.pressure_mmHg).toFixed(1)} мм рт.ст.`;

        await sendMessage(chatId, msg);
      } catch (error) {
        console.error('❌ Ошибка получения данных:', error.message);
        if (error.response) {
          console.error('Статус ответа:', error.response.status);
          console.error('Данные ответа:', error.response.data);
        }
        await sendMessage(chatId, "❌ Ошибка получения данных из Google Sheets");
      }
    }
    
    // ===== ПОКАЗАТЬ НАСТРОЙКИ =====
    else if (text === '/settings') {
      console.log('✅ НАЙДЕНА КОМАНДА /settings');
      try {
        const url = `${SETTINGS_URL}?action=getSettings`;
        console.log('📤 Запрос к SETTINGS_URL:', url);
        const response = await axios.get(url);
        console.log('📥 Ответ от Google Sheets:', response.data);
        
        const settings = response.data;
        
        const msg = 
`⚙️ *Текущие настройки:*

⏱ Период замеров: ${settings.period || 60} мин
🌡 Порог температуры: < ${settings.threshold || 20.0} °C
🏔 Высота над уровнем моря: ${settings.altitude || 193} м

*Изменить:*
/set_period [минуты]
/set_threshold [градусы]`;

        await sendMessage(chatId, msg);
      } catch (error) {
        console.error('❌ Ошибка получения настроек:', error.message);
        await sendMessage(chatId, "❌ Ошибка получения настроек");
      }
    }
    
    // ===== УСТАНОВИТЬ ПЕРИОД =====
    else if (text.startsWith('/set_period')) {
      console.log('✅ НАЙДЕНА КОМАНДА /set_period');
      
      if (text === '/set_period') {
        await sendMessage(chatId, "❌ Укажите период в минутах. Например: /set_period 30");
        return res.sendStatus(200);
      }
      
      const parts = text.split(' ');
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Укажите период в минутах. Например: /set_period 30");
        return res.sendStatus(200);
      }
      
      const newPeriod = parseInt(parts[1]);
      console.log(`   Новый период: ${newPeriod}`);
      
      if (isNaN(newPeriod) || newPeriod < 1 || newPeriod > 1440) {
        await sendMessage(chatId, "❌ Период должен быть числом от 1 до 1440 минут");
        return res.sendStatus(200);
      }
      
      try {
        console.log('📤 Отправка POST на SETTINGS_URL');
        await axios.post(SETTINGS_URL, {
          action: 'set_period',
          value: newPeriod
        });
        
        await sendMessage(chatId, `✅ Период изменен на ${newPeriod} минут\nESP32 применит новые настройки при следующем замере.`);
      } catch (error) {
        console.error('❌ Ошибка сохранения периода:', error.message);
        await sendMessage(chatId, "❌ Ошибка сохранения настроек");
      }
    }
    
    // ===== УСТАНОВИТЬ ПОРОГ =====
    else if (text.startsWith('/set_threshold')) {
      console.log('✅ НАЙДЕНА КОМАНДА /set_threshold');
      
      if (text === '/set_threshold') {
        await sendMessage(chatId, "❌ Укажите порог температуры. Например: /set_threshold 18");
        return res.sendStatus(200);
      }
      
      const parts = text.split(' ');
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Укажите порог температуры. Например: /set_threshold 18");
        return res.sendStatus(200);
      }
      
      const newThreshold = parseFloat(parts[1]);
      console.log(`   Новый порог: ${newThreshold}`);
      
      if (isNaN(newThreshold) || newThreshold < -50 || newThreshold > 50) {
        await sendMessage(chatId, "❌ Порог должен быть числом от -50 до 50 °C");
        return res.sendStatus(200);
      }
      
      try {
        console.log('📤 Отправка POST на SETTINGS_URL');
        await axios.post(SETTINGS_URL, {
          action: 'set_threshold',
          value: newThreshold
        });
        
        await sendMessage(chatId, `✅ Порог изменен на ${newThreshold} °C\nПредупреждения будут приходить при температуре ниже ${newThreshold}°C.`);
      } catch (error) {
        console.error('❌ Ошибка сохранения порога:', error.message);
        await sendMessage(chatId, "❌ Ошибка сохранения настроек");
      }
    }
    
    // ===== НЕИЗВЕСТНАЯ КОМАНДА =====
    else {
      console.log('❌ НЕИЗВЕСТНАЯ КОМАНДА');
      await sendMessage(chatId, "❌ Неизвестная команда. Отправьте /help для списка команд.");
    }

  } catch (err) {
    console.error('❌ Общая ошибка:', err.message);
    console.error('Stack:', err.stack);
  }

  res.sendStatus(200);
});

// ==================== ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЙ ====================
async function sendMessage(chatId, text) {
  try {
    console.log(`📤 Отправка сообщения в чат ${chatId}:`, text.substring(0, 50) + '...');
    
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }
    );
    
    console.log('✅ Сообщение отправлено, статус:', response.status);
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error.message);
    if (error.response) {
      console.error('Статус ответа:', error.response.status);
      console.error('Данные ответа:', error.response.data);
    }
  }
}

// ==================== ПРОВЕРКА РАБОТОСПОСОБНОСТИ ====================
app.get('/', (req, res) => {
  res.send('Telegram Bot is running!');
});

// ==================== ТЕСТОВЫЙ ЭНДПОИНТ ====================
app.get('/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Bot is running',
    botToken: BOT_TOKEN ? 'set' : 'not set',
    sheetsUrl: SHEETS_URL ? 'set' : 'not set',
    settingsUrl: SETTINGS_URL ? 'set' : 'not set'
  });
});

// ==================== ЗАПУСК СЕРВЕРА ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n========== СЕРВЕР ЗАПУЩЕН ==========');
  console.log(`🚀 Порт: ${PORT}`);
  console.log(`📌 BOT_TOKEN: ${BOT_TOKEN ? 'установлен' : 'НЕ УСТАНОВЛЕН!'}`);
  console.log(`📌 SHEETS_URL: ${SHEETS_URL ? 'установлен' : 'НЕ УСТАНОВЛЕН!'}`);
  console.log(`📌 SETTINGS_URL: ${SETTINGS_URL ? 'установлен' : 'НЕ УСТАНОВЛЕН!'}`);
  console.log(`📌 Bot username: ${BOT_USERNAME}`);
  console.log('=====================================\n');
});
