'use strict';

const config = require('../config/config');
const logger = require('../lib/logger');
const { handleStatusUpdate } = require('../features/status/autoView');
const Settings = require('../database/models/Settings');

// In-memory store for recent messages (for anti-delete feature)
// Map of msgId -> { jid, sender, content, timestamp }
const recentMessages = new Map();
const ANTI_DELETE_TTL_MS = 5 * 60 * 1000; // Keep for 5 minutes

/**
 * Registers all non-command event listeners on the sock.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
function handleEvents(sock) {
  // --- Status Updates ---
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      // Status@broadcast messages
      if (msg.key.remoteJid === 'status@broadcast') {
        await handleStatusUpdate(sock, msg);
      }

      // Store recent messages for anti-delete (only store non-bot messages)
      if (!msg.key.fromMe && msg.message) {
        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';

        if (body) {
          recentMessages.set(msg.key.id, {
            jid: msg.key.remoteJid,
            sender: msg.key.participant || msg.key.remoteJid,
            senderName: msg.pushName || 'Unknown',
            content: body,
            timestamp: Date.now(),
          });

          // Prune stale entries
          const now = Date.now();
          for (const [id, data] of recentMessages) {
            if (now - data.timestamp > ANTI_DELETE_TTL_MS) {
              recentMessages.delete(id);
            }
          }
        }
      }
    }
  });

  // --- Anti-Delete ---
  sock.ev.on('messages.delete', async (info) => {
    try {
      const settings = await Settings.getSettings();
      if (!settings.antiDelete) return;

      const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;

      // Baileys emits either a keys array or an individual message
      const keys = info.keys || (info.key ? [info.key] : []);

      for (const key of keys) {
        const stored = recentMessages.get(key.id);
        if (!stored) continue;

        const forwardText =
          `🗑️ *Anti-Delete Alert*\n\n` +
          `*From:* ${stored.senderName} (${stored.sender.split('@')[0]})\n` +
          `*In:* ${stored.jid.endsWith('@g.us') ? 'Group' : 'DM'} (${stored.jid})\n` +
          `*Message:*\n${stored.content}`;

        await sock.sendMessage(ownerJid, { text: forwardText });
        logger.info(`[events] Anti-delete forwarded message from ${stored.sender}`);
        recentMessages.delete(key.id);
      }
    } catch (err) {
      logger.error({ err }, '[events] Anti-delete handler error');
    }
  });

  // --- Group Participant Updates ---
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      logger.debug(`[events] Group ${id}: ${action} → ${participants.join(', ')}`);
      // Hook point for future welcome/goodbye messages
    } catch (err) {
      logger.error({ err }, '[events] Group participant update error');
    }
  });

  // --- Messages Update (read receipts, etc.) ---
  sock.ev.on('messages.update', (updates) => {
    // Placeholder: could be used for delivery/read tracking
  });

  logger.info('[events] Event handlers registered');
}

module.exports = { handleEvents };
