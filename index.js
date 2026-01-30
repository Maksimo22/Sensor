app.post('/webhook', async (req, res) => {
  console.log('📨 Telegram webhook получен');
  
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim();
    
    console.log(`Chat: ${chatId}, Text: "${text}"`);

    if (text === '/show' || text?.toLowerCase() === 'показать датчики') {
      console.log('🔍 Запрашиваю Firebase...');
      
      const response = await axios.get(FIREBASE_URL);
      console.log('📦 Firebase ответ:', JSON.stringify(response.data));
      
      const sensorData = response.data;
      console.log('📊 SensorData:', sensorData);
      
      // Поддержка разных названий полей
      const temp = sensorData.temperature || sensorData.temp;
      const hum = sensorData.humidity || sensorData.hum;
      const timestamp = sensorData.timestamp;
      
      if (typeof temp === 'undefined') {
        console.log('❌ Нет данных температуры');
        await sendTelegram(chatId, '❌ В Firebase нет данных температуры');
        return res.sendStatus(200);
      }

      // Формируем время
      let timeInfo;
      if (timestamp) {
        // Парсим время из ESP32 (формат: "2026-01-30T20:15:00")
        const espTime = new Date(timestamp);
        if (!isNaN(espTime.getTime())) {
          const hours = espTime.getHours().toString().padStart(2, '0');
          const minutes = espTime.getMinutes().toString().padStart(2, '0');
          timeInfo = `${hours}:${minutes}`;
        }
      }
      
      // Если время из ESP32 некорректно, используем серверное
      if (!timeInfo) {
        const now = new Date();
        timeInfo = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      }

      const msg = `📊 Данные на ${timeInfo}:\n\n🌡 Температура: ${temp} °C\n💧 Влажность: ${hum} %`;
      
      console.log('📤 Отправляю сообщение:', msg);
      await sendTelegram(chatId, msg);
      console.log('✅ Сообщение отправлено');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }

  res.sendStatus(200);
});
