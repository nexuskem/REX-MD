'use strict';

const User = require('../database/models/User');
const logger = require('../lib/logger');

module.exports = {
  name: 'unban',
  aliases: ['unblock'],
  description: 'Owner-only: unban a previously banned user',
  usage: '.unban @user',
  category: '👑 Owner',
  ownerOnly: true,

  async execute(sock, msg, args, { jid }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) {
      return sock.sendMessage(jid, { text: '❌ Please mention the user to unban: `.unban @user`' });
    }

    try {
      const results = [];
      for (const targetJid of mentioned) {
        const user = await User.findOne({ jid: targetJid });
        if (user) {
          user.isBanned = false;
          await user.save();
          results.push(`@${targetJid.split('@')[0]}`);
        }
      }
      if (results.length) {
        await sock.sendMessage(jid, {
          text: `✅ Unbanned: ${results.join(', ')}`,
          mentions: mentioned,
        });
      } else {
        await sock.sendMessage(jid, { text: '⚠️ No banned users found from the mentioned accounts.' });
      }
    } catch (err) {
      logger.error({ err }, '[unban] Failed');
      await sock.sendMessage(jid, { text: '❌ Failed to unban user.' });
    }
  },
};
