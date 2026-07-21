'use strict';

/**
 * Thin wrapper — setprefix is handled inside settings.js.
 * This file exists so `.setprefix` is discoverable by name from commandHandler.
 */
const settings = require('./settings');

module.exports = {
  name: 'setprefix',
  aliases: [],
  description: 'Change the bot command prefix (owner only)',
  usage: '.setprefix <character>',
  category: '👑 Owner',
  ownerOnly: true,

  async execute(sock, msg, args, context) {
    // Delegate to settings command with action=setprefix
    return settings.execute(sock, msg, ['setprefix', ...args], context);
  },
};
