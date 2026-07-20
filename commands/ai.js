'use strict';

const { resolveAIResponse } = require('../features/ai/gemini');
const logger = require('../lib/logger');

module.exports = {
  name: 'ai',
  aliases: ['ask', 'rex', 'chat', 'q'],
  description: 'Ask REX-MD anything — schoolwork, coding, general knowledge, and more',
  usage: '.ai <your question>',
  category: '🤖 AI',
  ownerOnly: false,

  async execute(sock, msg, args, { jid, senderJid, pushName }) {
    // Support: .ai <question> OR direct reply to bot's previous message
    let prompt = args.join(' ');

    if (!prompt) {
      // Check if this is a reply to a previous message
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        prompt = quoted.conversation || quoted.extendedTextMessage?.text || '';
      }
    }

    if (!prompt) {
      return sock.sendMessage(jid, {
        text:
          '🤖 *REX-MD AI Assistant*\n\n' +
          'Usage: `.ai <your question>`\n\n' +
          'Examples:\n' +
          '• `.ai explain photosynthesis`\n' +
          '• `.ai write a Python function to sort a list`\n' +
          '• `.ai what is the capital of Kenya`\n\n' +
          'You can also reply to any of my messages to continue the conversation.',
      });
    }

    // Show typing indicator
    await sock.sendPresenceUpdate('composing', jid);

    let response;
    try {
      response = await resolveAIResponse(prompt, null, senderJid);
    } catch (err) {
      logger.error({ err }, '[ai] resolveAIResponse failed');
      response = "🤖 I ran into an issue. Please try again in a moment.";
    } finally {
      await sock.sendPresenceUpdate('paused', jid);
    }

    await sock.sendMessage(jid, { text: response });
    logger.info(`[ai] Responded to ${pushName || senderJid}`);
  },
};
