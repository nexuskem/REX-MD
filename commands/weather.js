'use strict';

const axios = require('axios');
const config = require('../config/config');
const logger = require('../lib/logger');

const WEATHER_EMOJI = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️',
  Haze: '🌫️', Dust: '🌪️', Smoke: '🌫️',
};

module.exports = {
  name: 'weather',
  aliases: ['w', 'temp', 'forecast'],
  description: 'Get current weather for any city',
  usage: '.weather <city>',
  category: '🌍 Tools',
  ownerOnly: false,

  async execute(sock, msg, args, { jid }) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text: '🌤️ Usage: `.weather <city>`\n\nExamples:\n• `.weather Nairobi`\n• `.weather London`\n• `.weather New York`',
      });
    }

    if (!config.openWeatherApiKey) {
      return sock.sendMessage(jid, {
        text: '❌ Weather feature is not configured. Please set OPENWEATHER_API_KEY in .env.',
      });
    }

    const city = args.join(' ');

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${config.openWeatherApiKey}&units=metric`;
      const { data } = await axios.get(url, { timeout: 10000 });

      const { main, weather, wind, sys, name } = data;
      const condition = weather[0]?.main || 'Unknown';
      const emoji = WEATHER_EMOJI[condition] || '🌡️';
      const description = weather[0]?.description || condition;

      await sock.sendMessage(jid, {
        text:
          `${emoji} *Weather in ${name}, ${sys.country}*\n\n` +
          `🌡️ Temp: *${main.temp.toFixed(1)}°C* (feels like ${main.feels_like.toFixed(1)}°C)\n` +
          `📊 Min/Max: ${main.temp_min.toFixed(1)}°C / ${main.temp_max.toFixed(1)}°C\n` +
          `💧 Humidity: *${main.humidity}%*\n` +
          `💨 Wind: *${wind.speed} m/s*\n` +
          `☁️ Condition: *${description}*\n` +
          `👁️ Visibility: ${data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : 'N/A'}`,
      });
    } catch (err) {
      if (err.response?.status === 404) {
        await sock.sendMessage(jid, { text: `❌ City not found: *${city}*. Check the spelling and try again.` });
      } else {
        logger.error({ err }, '[weather] API error');
        await sock.sendMessage(jid, { text: '❌ Couldn\'t fetch weather. Please try again later.' });
      }
    }
  },
};
