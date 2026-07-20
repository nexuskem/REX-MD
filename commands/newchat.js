'use strict';

const ChatContext = require('../database/models/ChatContext');
const logger = require('../lib/logger');

module.exports = {
  name: 'newchat',
  aliases: ['clearchat', 'reset', 'clear'],
  description: 'Start a fresh AI conversation — clears your chat history with REX-MD',
  usage: '.newchat',
  category: '🤖 AI',
  ownerOnly: false,

  async execute(sock, msg, args, { jid, senderJid }) {
    try {
      const ctx = await ChatContext.findOne({ jid: senderJid });
      if (ctx) {
        await ctx.clear();
      }
      await sock.sendMessage(jid, {
        text: '🔄 Chat history cleared! Let\'s start fresh — ask me anything.',
      });
      logger.info(`[newchat] Cleared context for ${senderJid}`);
    } catch (err) {
      logger.error({ err }, '[newchat] Failed to clear context');
      await sock.sendMessage(jid, {
        text: '❌ Failed to clear chat history. Please try again.',
      });
    }
  },
};
