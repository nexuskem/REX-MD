'use strict';

const logger = require('../lib/logger');

module.exports = {
  name: 'demote',
  aliases: ['unadmin', 'removeadmin'],
  description: 'Remove admin rights from a group member',
  usage: '.demote @user',
  category: '👥 Group',
  ownerOnly: false,

  async execute(sock, msg, args, { jid, isGroup, isOwner, senderJid }) {
    if (!isGroup) return sock.sendMessage(jid, { text: '❌ This command only works in groups.' });

    try {
      const groupMeta = await sock.groupMetadata(jid);
      const admins = groupMeta.participants.filter((p) => p.admin).map((p) => p.id);
      const botJid = sock.user?.id?.replace(/:.*@/, '@') || '';
      const isBotAdmin = admins.includes(botJid);
      const isAdmin = isOwner || admins.includes(senderJid);

      if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Only admins can demote members.' });
      if (!isBotAdmin) return sock.sendMessage(jid, { text: '❌ I need to be a group admin to demote members.' });

      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return sock.sendMessage(jid, { text: '❌ Please mention someone to demote: `.demote @user`' });

      await sock.groupParticipantsUpdate(jid, mentioned, 'demote');
      const names = mentioned.map((j) => `@${j.split('@')[0]}`).join(', ');
      await sock.sendMessage(jid, {
        text: `✅ Removed admin rights from ${names}.`,
        mentions: mentioned,
      });
    } catch (err) {
      logger.error({ err }, '[demote] Failed');
      await sock.sendMessage(jid, { text: '❌ Failed to demote member.' });
    }
  },
};
