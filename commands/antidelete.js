'use strict';

const Settings = require('../database/models/Settings');
const logger = require('../lib/logger');

module.exports = {
  name: 'antidelete',
  aliases: ['antidel', 'ad'],
  description: 'Owner-only: toggle anti-delete (forwards deleted messages to owner DM)',
  usage: '.antidelete on|off',
  category: '👑 Owner',
  ownerOnly: true,

  async execute(sock, msg, args, { jid }) {
    const toggle = args[0]?.toLowerCase();
    if (!toggle || !['on', 'off'].includes(toggle)) {
      const settings = await Settings.getSettings();
      return sock.sendMessage(jid, {
        text:
          `🛡️ *Anti-Delete*\n\n` +
          `Current status: *${settings.antiDelete ? 'On' : 'Off'}*\n\n` +
          `Usage: \`.antidelete on|off\``,
      });
    }

    try {
      const settings = await Settings.getSettings();
      settings.antiDelete = toggle === 'on';
      await settings.save();
      await sock.sendMessage(jid, {
        text: `🛡️ Anti-Delete: *${toggle === 'on' ? 'Enabled' : 'Disabled'}*`,
      });
    } catch (err) {
      logger.error({ err }, '[antidelete] Failed to update setting');
      await sock.sendMessage(jid, { text: '❌ Failed to update anti-delete setting.' });
    }
  },
};
