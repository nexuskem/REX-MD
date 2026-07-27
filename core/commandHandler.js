'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../lib/logger');
const Settings = require('../database/models/Settings');
const User = require('../database/models/User');
const { isOnCooldown, setCooldown, getRemainingCooldown } = require('../lib/cooldown');

// Auto-load all command files from /commands directory
const commands = new Map();
const aliases = new Map();

function loadCommands() {
  const commandsDir = path.resolve(__dirname, '../commands');
  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    try {
      const command = require(path.join(commandsDir, file));
      if (!command.name || typeof command.execute !== 'function') {
        logger.warn(`[cmd] Skipping ${file} — missing name or execute()`);
        continue;
      }
      commands.set(command.name.toLowerCase(), command);
      if (Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          aliases.set(alias.toLowerCase(), command.name.toLowerCase());
        }
      }
      logger.debug(`[cmd] Loaded: ${command.name}`);
    } catch (err) {
      logger.error({ err }, `[cmd] Failed to load ${file}`);
    }
  }
  logger.info(`[cmd] Loaded ${commands.size} commands, ${aliases.size} aliases`);
}

/**
 * Returns all loaded commands as an array (for menu generation).
 */
function getCommands() {
  return Array.from(commands.values());
}

/**
 * Registers message event listeners on the sock.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
function handleMessages(sock) {
  loadCommands();

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    logger.debug(`[cmd] messages.upsert fired — type=${type}, count=${messages.length}`);
    // Accept both 'notify' (new msgs) and 'append' (history sync)
    // Previously, only 'notify' was accepted — but after an init-query
    // timeout Baileys may deliver messages under a different type.
    for (const msg of messages) {
      try {
        await processMessage(sock, msg);
      } catch (err) {
        logger.error({ err }, '[cmd] Unhandled error in message processing');
      }
    }
  });
}

/**
 * Core message processor — parses, validates, routes, and dispatches commands.
 */
async function processMessage(sock, msg) {
  // Ignore messages with no content or from broadcast
  if (!msg.message) return;
  // Allow fromMe only if it starts with the prefix (owner sending commands)
  // but ignore status@broadcast self-messages
  const jid = msg.key.remoteJid;
  if (!jid) return;
  if (jid === 'status@broadcast') return;

  // Get settings (prefix may have been changed at runtime)
  const settings = await Settings.getSettings();
  const prefix = settings.prefix || config.prefix;

  // Extract the text content from various message types
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    msg.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message?.templateButtonReplyMessage?.selectedId ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    '';

  if (!body) return;
  if (!body.startsWith(prefix)) return;
  logger.info(`[cmd] Incoming command from ${msg.pushName || jid}: ${body}`);

  const senderJid = msg.key.participant || jid;
  const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;
  const isOwner = senderJid === ownerJid || senderJid.split('@')[0] === config.ownerNumber;

  // Find or create user
  const pushName = msg.pushName || '';
  const user = await User.findOrCreate(senderJid, pushName);

  // Check if banned
  if (user.isBanned) {
    logger.debug(`[cmd] Ignored banned user: ${senderJid}`);
    return;
  }

  // Parse command and args
  const input = body.slice(prefix.length).trim();
  const [rawCommand, ...args] = input.split(/\s+/);
  const commandName = rawCommand.toLowerCase();

  // Resolve alias → command name
  const resolvedName = aliases.get(commandName) || commandName;
  const command = commands.get(resolvedName);

  if (!command) return; // Unknown command — silent ignore

  // Owner-only gate
  if (command.ownerOnly && !isOwner) {
    await sock.sendMessage(jid, { text: '🚫 This command is for the bot owner only.' });
    return;
  }

  // Cooldown check (owner bypasses cooldown)
  if (!isOwner && isOnCooldown(senderJid, config.commandCooldownMs)) {
    const remaining = getRemainingCooldown(senderJid, config.commandCooldownMs);
    await sock.sendMessage(jid, {
      text: `⏳ Slow down! Wait ${remaining}s before using another command.`,
    });
    return;
  }

  setCooldown(senderJid);

  // Build context object passed to every command
  const context = {
    jid,
    senderJid,
    isOwner,
    isGroup: jid.endsWith('@g.us'),
    prefix,
    pushName,
    settings,
    user,
    commands: getCommands,
  };

  logger.info(`[cmd] ${pushName || senderJid} → ${prefix}${command.name} ${args.join(' ')}`);

  try {
    await command.execute(sock, msg, args, context);
  } catch (err) {
    logger.error({ err }, `[cmd] Error in ${command.name}`);
    await sock.sendMessage(jid, {
      text: `❌ Something went wrong with \`${prefix}${command.name}\`. Please try again.`,
    });
  }
}

module.exports = { handleMessages, getCommands };
