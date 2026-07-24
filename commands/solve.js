'use strict';

const { resolveAIResponse } = require('../features/ai/gemini');
const logger = require('../lib/logger');

module.exports = {
  name: 'solve',
  aliases: ['scan', 'ocr', 'read'],
  description: 'Solve a problem from an image — math, physics, diagrams, handwritten questions',
  usage: 'Send an image with caption `.solve` OR reply `.solve` to an image',
  category: '🤖 AI',
  ownerOnly: false,

  async execute(sock, msg, args, { jid, senderJid }) {
    // Find image: either the message itself is an image, or it quotes one
    const imageMsg =
      msg.message?.imageMessage ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (!imageMsg) {
      return sock.sendMessage(jid, {
        text:
          '📸 *Image Solver*\n\n' +
          'How to use:\n' +
          '1. Send an image with caption `.solve`\n' +
          '2. Or reply `.solve` to an image already in the chat\n\n' +
          'Works with: math problems, physics questions, chemistry, diagrams, handwritten notes.',
      });
    }

    const prompt =
      args.join(' ') ||
      'Please analyze this image carefully and solve or explain whatever problem, question, or content is shown. Provide a clear, step-by-step solution if applicable.';

    await sock.sendMessage(jid, { text: '🔍 Analyzing your image...' });
    await sock.sendPresenceUpdate('composing', jid);

    let response;
    try {
      // Download the image from WhatsApp's media server
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      const imageBase64 = buffer.toString('base64');

      // Pass image + prompt to Gemini multimodal
      response = await resolveAIResponse(prompt, imageBase64, null);
    } catch (err) {
      logger.error({ err }, '[solve] Failed to process image');
      response = "❌ I couldn't read that image. Make sure it's a clear photo and try again.";
    } finally {
      await sock.sendPresenceUpdate('paused', jid);
    }

    await sock.sendMessage(jid, { text: response });
    logger.info(`[solve] Responded to image from ${senderJid}`);
  },
};
