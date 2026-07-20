'use strict';

const config = require('../config/config');
const logger = require('../lib/logger');

module.exports = {
  name: 'report',
  aliases: ['bug', 'feedback'],
  description: 'Send a bug report or feedback message to the owner',
  usage: '.report <your message>',
  category: '⚙️ System',
  ownerOnly: false,

  async execute(sock, msg, args, { jid, senderJid, pushName }) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text: '💬 Usage: `.report <your message>`\n\nExample: `.report The .play command gives an error`',
      });
    }

    const reportText = args.join(' ');
    const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;

    try {
      await sock.sendMessage(ownerJid, {
        text:
          `📋 *Bug Report / Feedback*\n\n` +
          `👤 From: ${pushName || 'Unknown'} (${senderJid.split('@')[0]})\n` +
          `💬 Message: ${reportText}`,
      });

      await sock.sendMessage(jid, {
        text: '✅ Your report has been sent to the owner. Thank you!',
      });

      logger.info(`[report] Received from ${senderJid}: ${reportText.slice(0, 80)}`);
    } catch (err) {
      logger.error({ err }, '[report] Failed to forward report');
      await sock.sendMessage(jid, { text: '❌ Failed to send report. Please try again.' });
    }
  },
};
