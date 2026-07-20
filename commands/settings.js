'use strict';

const Settings = require('../database/models/Settings');
const User = require('../database/models/User');
const config = require('../config/config');
const logger = require('../lib/logger');

module.exports = {
  name: 'settings',
  aliases: ['set'],
  description: 'Owner-only: configure REX-MD runtime settings',
  usage: '.settings <action> [value]',
  category: '👑 Owner',
  ownerOnly: true,

  async execute(sock, msg, args, { jid, prefix }) {
    const [action, ...rest] = args;
    const value = rest.join(' ');

    if (!action) {
      const settings = await Settings.getSettings();
      return sock.sendMessage(jid, {
        text:
          `⚙️ *REX-MD Settings*\n\n` +
          `*Prefix:* ${settings.prefix}\n` +
          `*Auto Status View:* ${settings.autoStatusView ? '✅ On' : '❌ Off'}\n` +
          `*Auto Status React:* ${settings.autoStatusReact ? '✅ On' : '❌ Off'}\n` +
          `*Status Emoji:* ${settings.statusReactEmoji}\n` +
          `*Max Download:* ${settings.maxDownloadMb} MB\n` +
          `*Anti-Delete:* ${settings.antiDelete ? '✅ On' : '❌ Off'}\n` +
          `*Anti-Link:* ${settings.antiLink ? '✅ On' : '❌ Off'}\n\n` +
          `Commands:\n` +
          `${prefix}setprefix <char>\n` +
          `${prefix}autostatus on|off\n` +
          `${prefix}autoreact on|off\n` +
          `${prefix}antidelete on|off\n` +
          `${prefix}ban <@user>\n` +
          `${prefix}unban <@user>`,
      });
    }

    const settings = await Settings.getSettings();

    switch (action.toLowerCase()) {
      case 'prefix':
      case 'setprefix': {
        const newPrefix = value.trim().slice(0, 5);
        if (!newPrefix) return sock.sendMessage(jid, { text: '❌ Please provide a prefix character.' });
        settings.prefix = newPrefix;
        await settings.save();
        return sock.sendMessage(jid, { text: `✅ Prefix changed to: *${newPrefix}*` });
      }

      case 'autostatus': {
        const on = value.toLowerCase() === 'on';
        settings.autoStatusView = on;
        await settings.save();
        return sock.sendMessage(jid, { text: `✅ Auto Status View: *${on ? 'On' : 'Off'}*` });
      }

      case 'autoreact': {
        const on = value.toLowerCase() === 'on';
        settings.autoStatusReact = on;
        await settings.save();
        return sock.sendMessage(jid, { text: `✅ Auto Status React: *${on ? 'On' : 'Off'}*` });
      }

      case 'antidelete': {
        const on = value.toLowerCase() === 'on';
        settings.antiDelete = on;
        await settings.save();
        return sock.sendMessage(jid, { text: `✅ Anti-Delete: *${on ? 'On' : 'Off'}*` });
      }

      case 'antilink': {
        const on = value.toLowerCase() === 'on';
        settings.antiLink = on;
        await settings.save();
        return sock.sendMessage(jid, { text: `✅ Anti-Link: *${on ? 'On' : 'Off'}*` });
      }

      default:
        return sock.sendMessage(jid, {
          text: `❌ Unknown setting: *${action}*\nUse ${prefix}settings to see all options.`,
        });
    }
  },
};
