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
      console.log('🔥 Firebase raw:', response.data);
      
      // Поддержка обеих структур
      let sensorData;
      if (response.data && response.data.data) {
        // Структура: { data: { temp, hum, pres } }
        sensorData = response.data.data;
        console.log('📊 Using nested data structure');
      } else {
        // Структура: { temp, hum, pres }
        sensorData = response.data;
        console.log('📊 Using flat data structure');
      }
      
      if (!sensorData || typeof sensorData.temp === 'undefined') {
        console.log('❌ Нет данных в Firebase');
        await sendTelegram(chatId, '❌ В Firebase нет данных');
        return res.sendStatus(200);
      }

      // Форматируем время
      const now = new Date();
      const timeStr = now.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const msg = `📊 Данные на ${timeStr}:\n\n🌡 Температура: ${sensorData.temp} °C\n💧 Влажность: ${sensorData.hum} %\n📈 Давление: ${sensorData.pres} мм`;
      
      console.log('📤 Отправляю:', msg);
      await sendTelegram(chatId, msg);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }

  res.sendStatus(200);
});
