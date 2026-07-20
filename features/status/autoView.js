'use strict';

const Settings = require('../../database/models/Settings');
const logger = require('../../lib/logger');

/**
 * Handles incoming status@broadcast messages.
 * Reads (views) each status and optionally reacts to it.
 *
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {object} message - A Baileys message object
 */
async function handleStatusUpdate(sock, message) {
  try {
    const settings = await Settings.getSettings();

    if (!settings.autoStatusView) return;

    const key = message.key;
    if (!key) return;

    // Mark as read — this is the "view" action
    await sock.readMessages([key]);
    logger.debug(`[status] Viewed status from ${key.participant || key.remoteJid}`);

    // Optional reaction
    if (settings.autoStatusReact) {
      try {
        await sock.sendMessage(key.remoteJid, {
          react: {
            text: settings.statusReactEmoji || '👀',
            key,
          },
        });
        logger.debug(`[status] Reacted with ${settings.statusReactEmoji}`);
      } catch (reactErr) {
        // Reactions on statuses sometimes fail silently — this is fine
        logger.debug({ reactErr }, '[status] Reaction failed (non-critical)');
      }
    }
  } catch (err) {
    logger.error({ err }, '[status] Error handling status update');
  }
}

module.exports = { handleStatusUpdate };
