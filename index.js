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

      // Формируем время с ДАТОЙ
      let timeDisplay;
      if (timestamp && typeof timestamp === 'string') {
        try {
          // Парсим время из ESP32 (формат: "2026-01-30T20:15:00")
          const espTime = new Date(timestamp);
          if (!isNaN(espTime.getTime())) {
            // Форматируем: "30.01.2026 20:15"
            const day = espTime.getDate().toString().padStart(2, '0');
            const month = (espTime.getMonth() + 1).toString().padStart(2, '0');
            const year = espTime.getFullYear();
            const hours = espTime.getHours().toString().padStart(2, '0');
            const minutes = espTime.getMinutes().toString().padStart(2, '0');
            timeDisplay = `${day}.${month}.${year} ${hours}:${minutes}`;
          }
        } catch (e) {
          console.log('⚠️ Ошибка парсинга времени:', e.message);
        }
      }
      
      // Если время из ESP32 некорректно, используем серверное
      if (!timeDisplay) {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timeDisplay = `${day}.${month}.${year} ${hours}:${minutes}`;
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
