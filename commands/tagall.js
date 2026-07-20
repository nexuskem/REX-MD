'use strict';

const logger = require('../lib/logger');

module.exports = {
  name: 'tagall',
  aliases: ['mentionall', 'everyone', 'all'],
  description: 'Tag all members of the group (group admins only)',
  usage: '.tagall [message]',
  category: '👥 Group',
  ownerOnly: false,

  async execute(sock, msg, args, { jid, isGroup, isOwner, senderJid }) {
    if (!isGroup) {
      return sock.sendMessage(jid, { text: '❌ This command only works in groups.' });
    }

    try {
      const groupMeta = await sock.groupMetadata(jid);
      const admins = groupMeta.participants
        .filter((p) => p.admin)
        .map((p) => p.id);

      const isAdmin = isOwner || admins.includes(senderJid);
      if (!isAdmin) {
        return sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' });
      }

      const members = groupMeta.participants.map((p) => p.id);
      const mentions = members;
      const customMsg = args.join(' ') || '📢 Attention everyone!';

      const mentionText = members.map((m) => `@${m.split('@')[0]}`).join(' ');

      await sock.sendMessage(jid, {
        text: `${customMsg}\n\n${mentionText}`,
        mentions,
      });

      logger.info(`[tagall] Tagged ${members.length} members in ${jid}`);
    } catch (err) {
      logger.error({ err }, '[tagall] Failed');
      await sock.sendMessage(jid, { text: '❌ Failed to tag all members.' });
    }
  },
};
