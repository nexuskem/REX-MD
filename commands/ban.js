'use strict';

const User = require('../database/models/User');
const logger = require('../lib/logger');

module.exports = {
  name: 'ban',
  aliases: ['block'],
  description: 'Owner-only: ban a user from using the bot',
  usage: '.ban @user',
  category: '👑 Owner',
  ownerOnly: true,

  async execute(sock, msg, args, { jid }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) {
      return sock.sendMessage(jid, { text: '❌ Please mention the user to ban: `.ban @user`' });
    }

    try {
      const results = [];
      for (const targetJid of mentioned) {
        const user = await User.findOrCreate(targetJid);
        user.isBanned = true;
        await user.save();
        results.push(`@${targetJid.split('@')[0]}`);
      }
      await sock.sendMessage(jid, {
        text: `🚫 Banned: ${results.join(', ')}`,
        mentions: mentioned,
      });
      logger.info(`[ban] Banned: ${mentioned.join(', ')}`);
    } catch (err) {
      logger.error({ err }, '[ban] Failed');
      await sock.sendMessage(jid, { text: '❌ Failed to ban user.' });
    }
  },
};
