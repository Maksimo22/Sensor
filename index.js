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
    console.log('🔥 Получен запрос:', JSON.stringify(req.body, null, 2));
    
    const message = req.body.message;
    if (!message) {
      console.log('❌ Нет message в запросе');
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const rawText = message.text?.trim() || "";
    const text = cleanCommand(rawText); // Очищаем команду

    console.log(`📨 Команда от ${chatId}: raw="${rawText}", clean="${text}"`);

    // ===== HELP =====
    if (text === '/help') {
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
      try {
        const response = await axios.get(SHEETS_URL);
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
        console.error('Ошибка получения данных:', error.message);
        await sendMessage(chatId, "❌ Ошибка получения данных из Google Sheets");
      }
    }
    
    // ===== ПОКАЗАТЬ НАСТРОЙКИ =====
    else if (text === '/settings') {
      try {
        const response = await axios.get(`${SETTINGS_URL}?action=getSettings`);
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
        console.error('Ошибка получения настроек:', error.message);
        await sendMessage(chatId, "❌ Ошибка получения настроек");
      }
    }
    
    // ===== УСТАНОВИТЬ ПЕРИОД =====
    else if (text === '/set_period' || text.startsWith('/set_period ')) {
      let newPeriod;
      
      if (text === '/set_period') {
        await sendMessage(chatId, "❌ Укажите период в минутах. Например: /set_period 30");
        return res.sendStatus(200);
      } else {
        newPeriod = parseInt(text.substring(12).trim());
      }
      
      if (isNaN(newPeriod) || newPeriod < 1 || newPeriod > 1440) {
        await sendMessage(chatId, "❌ Период должен быть числом от 1 до 1440 минут");
        return res.sendStatus(200);
      }
      
      try {
        await axios.post(SETTINGS_URL, {
          action: 'set_period',
          value: newPeriod
        });
        
        await sendMessage(chatId, `✅ Период изменен на ${newPeriod} минут\nESP32 применит новые настройки при следующем замере.`);
      } catch (error) {
        console.error('Ошибка сохранения периода:', error.message);
        await sendMessage(chatId, "❌ Ошибка сохранения настроек");
      }
    }
    
    // ===== УСТАНОВИТЬ ПОРОГ =====
    else if (text === '/set_threshold' || text.startsWith('/set_threshold ')) {
      let newThreshold;
      
      if (text === '/set_threshold') {
        await sendMessage(chatId, "❌ Укажите порог температуры. Например: /set_threshold 18");
        return res.sendStatus(200);
      } else {
        newThreshold = parseFloat(text.substring(15).trim());
      }
      
      if (isNaN(newThreshold) || newThreshold < -50 || newThreshold > 50) {
        await sendMessage(chatId, "❌ Порог должен быть числом от -50 до 50 °C");
        return res.sendStatus(200);
      }
      
      try {
        await axios.post(SETTINGS_URL, {
          action: 'set_threshold',
          value: newThreshold
        });
        
        await sendMessage(chatId, `✅ Порог изменен на ${newThreshold} °C\nПредупреждения будут приходить при температуре ниже ${newThreshold}°C.`);
      } catch (error) {
        console.error('Ошибка сохранения порога:', error.message);
        await sendMessage(chatId, "❌ Ошибка сохранения настроек");
      }
    }
    
    // ===== НЕИЗВЕСТНАЯ КОМАНДА =====
    else {
      await sendMessage(chatId, "❌ Неизвестная команда. Отправьте /help для списка команд.");
    }

  } catch (err) {
    console.error('Общая ошибка:', err.message);
  }

  res.sendStatus(200);
});

// ==================== ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЙ ====================
async function sendMessage(chatId, text) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }
    );
    console.log('✅ Сообщение отправлено');
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error.message);
  }
}

// ==================== ПРОВЕРКА РАБОТОСПОСОБНОСТИ ====================
app.get('/', (req, res) => {
  res.send('Telegram Bot is running!');
});

// ==================== ЗАПУСК СЕРВЕРА ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📌 BOT_TOKEN: ${BOT_TOKEN ? 'установлен' : 'НЕ УСТАНОВЛЕН!'}`);
  console.log(`📌 SHEETS_URL: ${SHEETS_URL ? 'установлен' : 'НЕ УСТАНОВЛЕН!'}`);
  console.log(`📌 SETTINGS_URL: ${SETTINGS_URL ? 'установлен' : 'НЕ УСТАНОВЛЕН!'}`);
  console.log(`📌 Bot username: ${BOT_USERNAME}`);
});
