'use strict';

const config = require('../config/config');
const logger = require('../lib/logger');

module.exports = {
  name: 'owner',
  aliases: ['creator', 'dev', 'contact'],
  description: "Show the bot owner's contact info",
  usage: '.owner',
  category: '⚙️ System',
  ownerOnly: false,

  async execute(sock, msg, args, { jid }) {
    const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, {
        text:
          `👑 *${config.botName} Owner*\n\n` +
          `📱 Number: +${config.ownerNumber}\n\n` +
          `To report a bug or get help, use:\n` +
          `\`.report <your message>\``,
      });

      // Send contact card
      await sock.sendMessage(jid, {
        contacts: {
          displayName: `${config.botName} Owner`,
          contacts: [
            {
              vcard:
                `BEGIN:VCARD\n` +
                `VERSION:3.0\n` +
                `FN:${config.botName} Owner\n` +
                `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:+${config.ownerNumber}\n` +
                `END:VCARD`,
            },
          ],
        },
      });
    } catch (err) {
      logger.error({ err }, '[owner] Failed to send contact');
      await sock.sendMessage(jid, {
        text: `👑 Bot owner: +${config.ownerNumber}`,
      });
    }
  },
};
