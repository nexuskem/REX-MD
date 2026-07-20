'use strict';

const logger = require('../lib/logger');

module.exports = {
  name: 'promote',
  aliases: ['admin', 'makeadmin'],
  description: 'Promote a member to group admin',
  usage: '.promote @user',
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

      if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Only admins can promote members.' });
      if (!isBotAdmin) return sock.sendMessage(jid, { text: '❌ I need to be a group admin to promote members.' });

      // Get mentioned users
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return sock.sendMessage(jid, { text: '❌ Please mention someone to promote: `.promote @user`' });

      await sock.groupParticipantsUpdate(jid, mentioned, 'promote');
      const names = mentioned.map((j) => `@${j.split('@')[0]}`).join(', ');
      await sock.sendMessage(jid, {
        text: `✅ Promoted ${names} to admin.`,
        mentions: mentioned,
      });
    } catch (err) {
      logger.error({ err }, '[promote] Failed');
      await sock.sendMessage(jid, { text: '❌ Failed to promote member.' });
    }
  },
};
