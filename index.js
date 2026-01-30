if (text === '/show' || text?.toLowerCase() === 'показать датчики') {
  const response = await axios.get(`${FIREBASE_URL}/latest.json`);
  const sensorData = response.data;

  if (!sensorData || typeof sensorData.temperature === 'undefined') {
    await sendToTelegram(chatId, '❌ В Firebase нет данных');
    return res.sendStatus(200);
  }

  // Если timestamp есть
  let timeInfo = '';
  if (sensorData.timestamp) {
    const lastTime = new Date(sensorData.timestamp * 1000); // UNIX -> ms
    const now = new Date();
    const diffSec = Math.floor((now - lastTime) / 1000);
    const minutes = Math.floor(diffSec / 60);
    const seconds = diffSec % 60;
    const hh = lastTime.getHours().toString().padStart(2, '0');
    const mm = lastTime.getMinutes().toString().padStart(2, '0');
    const ss = lastTime.getSeconds().toString().padStart(2, '0');

    timeInfo = `⏱ Последний замер: ${hh}:${mm}:${ss} (${minutes}м ${seconds}с назад)\n`;
  }

  const msg = `📊 Последние данные:\n\n${timeInfo}🌡 Температура: ${sensorData.temperature} °C\n💧 Влажность: ${sensorData.humidity} %\n📈 Давление: ${sensorData.pressure} мм`;

  await sendToTelegram(chatId, msg);
}
