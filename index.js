require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const SHEETS_URL = process.env.SHEETS_URL;

app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {

    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text?.trim();

    if (text === '/show') {

      const response = await axios.get(SHEETS_URL);
      const data = response.data;

      if (data.error) {
        await send(chatId, "❌ Нет данных");
        return res.sendStatus(200);
      }

      const date = new Date(data.timestamp);

      const formatted =
        date.toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

      const msg =
`📊 Последние данные:

📅 ${formatted}
🌡 Температура: ${Number(data.temperature).toFixed(2)} °C
💧 Влажность: ${Number(data.humidity).toFixed(2)} %
📈 Давление: ${Number(data.pressure_mmHg).toFixed(1)} мм рт. ст.`;

      await send(chatId, msg);
    }

  } catch (err) {
    console.error(err.message);
  }

  res.sendStatus(200);
});

async function send(chatId, text) {
  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      chat_id: chatId,
      text: text
    }
  );
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started");
});
