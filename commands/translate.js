'use strict';

const { resolveAIResponse } = require('../features/ai/gemini');
const logger = require('../lib/logger');

// Common language codes → full names for the prompt
const LANGUAGE_NAMES = {
  en: 'English', sw: 'Swahili', fr: 'French', de: 'German', es: 'Spanish',
  pt: 'Portuguese', it: 'Italian', ar: 'Arabic', zh: 'Chinese', ja: 'Japanese',
  ko: 'Korean', ru: 'Russian', hi: 'Hindi', nl: 'Dutch', tr: 'Turkish',
};

module.exports = {
  name: 'tr',
  aliases: ['translate', 'trans'],
  description: 'Translate text to any language using AI',
  usage: '.tr <language code> <text>',
  category: '🌍 Tools',
  ownerOnly: false,

  async execute(sock, msg, args, { jid }) {
    if (args.length < 2) {
      return sock.sendMessage(jid, {
        text:
          '🌍 *Translator*\n\n' +
          'Usage: `.tr <lang> <text>`\n\n' +
          'Examples:\n' +
          '• `.tr sw Hello, how are you?`\n' +
          '• `.tr fr I love programming`\n' +
          '• `.tr zh Good morning`\n\n' +
          'Common codes: en, sw, fr, de, es, pt, ar, zh, ja, ko, ru, hi',
      });
    }

    const langCode = args[0].toLowerCase();
    const text = args.slice(1).join(' ');
    const langName = LANGUAGE_NAMES[langCode] || langCode.toUpperCase();

    await sock.sendPresenceUpdate('composing', jid);

    try {
      const prompt = `Translate the following text to ${langName}. Reply with ONLY the translated text, no explanations or extra formatting:\n\n${text}`;
      const response = await resolveAIResponse(prompt, null, null);

      await sock.sendMessage(jid, {
        text: `🌍 *Translation to ${langName}*\n\n${response}`,
      });
    } catch (err) {
      logger.error({ err }, '[tr] Translation failed');
      await sock.sendMessage(jid, { text: '❌ Translation failed. Please try again.' });
    } finally {
      await sock.sendPresenceUpdate('paused', jid);
    }
  },
};
