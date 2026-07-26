'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrTerminal = require('qrcode-terminal');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const config = require('../config/config');
const logger = require('../lib/logger');
const { handleMessages } = require('./commandHandler');
const { handleEvents } = require('./eventHandler');

// Session directory for local fallback (Mongo adapter used in production)
const SESSION_DIR = path.resolve(__dirname, '../session');

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;

/**
 * Prompts the user to enter their phone number for pairing code auth.
 * @returns {Promise<string>}
 */
function promptPhoneNumber() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(
      `\n📱 Enter your WhatsApp number (with country code, no +): `,
      (answer) => {
        rl.close();
        resolve(answer.trim());
      }
    );
  });
}

/**
 * Creates and starts the WhatsApp socket connection.
 * Handles auth, reconnect logic, and wires up all event handlers.
 */
async function startConnection() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`[conn] Baileys v${version.join('.')}${isLatest ? '' : ' (update available)'}`);

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    browser: Browsers.ubuntu('REX-MD'),
    logger: logger.child({ module: 'baileys' }),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    getMessage: async () => undefined,
  });

  // --- Pairing Code Auth ---
  if (config.usePairingCode && !sock.authState.creds.registered) {
    let phoneNumber = config.ownerNumber;
    if (!phoneNumber || phoneNumber.includes('X')) {
      phoneNumber = await promptPhoneNumber();
    }
    // Strip any non-digit characters
    phoneNumber = phoneNumber.replace(/\D/g, '');

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        logger.info(`\n🔑 Pairing code: ${code}\n   → Open WhatsApp > Linked Devices > Link a Device > Enter Code\n`);
      } catch (err) {
        logger.error({ err }, '[conn] Failed to request pairing code');
      }
    }, 3000);
  }

  // --- Connection State ---
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('[conn] QR code generated — scan with WhatsApp');
      // Render QR in terminal
      qrTerminal.generate(qr, { small: true }, (qrString) => {
        console.log('\n\n' + qrString + '\n');
        console.log('📱 Scan the QR code above with WhatsApp to link REX-MD\n');
      });
      // Also write raw QR data to file so pair-server can display it in browser
      try {
        const qrFile = path.resolve(__dirname, '../session/.qr_pending');
        fs.writeFileSync(qrFile, qr, 'utf8');
      } catch {}
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      logger.warn(`[conn] Connection closed. Reason: ${reason} — Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          logger.error('[conn] Max reconnect attempts reached. Exiting.');
          process.exit(1);
        }
        reconnectAttempts++;
        const delay = Math.min(5000 * reconnectAttempts, 60000); // exponential backoff, max 60s
        logger.info(`[conn] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => startConnection(), delay);
      } else {
        logger.error('[conn] Logged out — clear session and re-run to re-pair.');
        // Clean up session so next run starts fresh
        try {
          fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        } catch {}
        process.exit(0);
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      logger.info(`[conn] ✅ Connected as ${sock.user?.name || sock.user?.id}`);
    }
  });

  // --- Credentials Save ---
  sock.ev.on('creds.update', saveCreds);

  // --- Route events to handlers ---
  handleMessages(sock);
  handleEvents(sock);

  return sock;
}

function getSock() {
  return sock;
}

module.exports = { startConnection, getSock };
