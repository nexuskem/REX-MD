'use strict';

const Settings = require('../database/models/Settings');
const logger = require('../lib/logger');

// Regex to detect WhatsApp invite links
const INVITE_LINK_PATTERN = /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i;
// Regex for any URL (general anti-link mode)
const URL_PATTERN = /https?:\/\/[^\s]+/i;

/**
 * Checks an incoming group message for invite links and removes the sender if antiLink is on.
 * Called from eventHandler, not as a command.
 */
async function checkAntiLink(sock, msg, senderJid, jid) {
  try {
    const settings = await Settings.getSettings();
    if (!settings.antiLink) return;

    const body =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    if (!INVITE_LINK_PATTERN.test(body)) return;

    const groupMeta = await sock.groupMetadata(jid);
    const admins = groupMeta.participants.filter((p) => p.admin).map((p) => p.id);
    const botJid = sock.user?.id?.replace(/:.*@/, '@') || '';
    const isBotAdmin = admins.includes(botJid);
    const senderIsAdmin = admins.includes(senderJid);

    // Don't remove admins
    if (senderIsAdmin || !isBotAdmin) return;

    await sock.sendMessage(jid, {
      text: `🚫 @${senderJid.split('@')[0]} — Invite links are not allowed in this group!`,
      mentions: [senderJid],
    });

    // Delete the message and remove the sender
    await sock.sendMessage(jid, { delete: msg.key });
    await sock.groupParticipantsUpdate(jid, [senderJid], 'remove');

    logger.info(`[antilink] Removed ${senderJid} for posting an invite link`);
  } catch (err) {
    logger.error({ err }, '[antilink] Error');
  }
}

module.exports = {
  name: 'antilink',
  aliases: ['antispam', 'nolinks'],
  description: 'Owner-only: toggle anti-link (auto-removes members who post WhatsApp invite links)',
  usage: '.antilink on|off',
  category: '👥 Group',
  ownerOnly: true,
  checkAntiLink, // Exported for use in eventHandler

  async execute(sock, msg, args, { jid }) {
    const toggle = args[0]?.toLowerCase();
    if (!toggle || !['on', 'off'].includes(toggle)) {
      const settings = await Settings.getSettings();
      return sock.sendMessage(jid, {
        text:
          `🔗 *Anti-Link*\n\n` +
          `Status: *${settings.antiLink ? 'On' : 'Off'}*\n\n` +
          `Usage: \`.antilink on|off\`\n` +
          `When enabled, members who post WhatsApp invite links are removed.`,
      });
    }

    try {
      const settings = await Settings.getSettings();
      settings.antiLink = toggle === 'on';
      await settings.save();
      await sock.sendMessage(jid, {
        text: `🔗 Anti-Link: *${toggle === 'on' ? 'Enabled' : 'Disabled'}*`,
      });
    } catch (err) {
      logger.error({ err }, '[antilink] Failed to update setting');
      await sock.sendMessage(jid, { text: '❌ Failed to update anti-link setting.' });
    }
  },
};
