'use strict';

const { spawn } = require('child_process');

/**
 * REX-MD Pairing Server
 * Serves the pairing web UI and bridges Baileys QR / pairing-code events
 * to the browser via WebSocket.
 *
 * Usage:  node pair-server.js [--port 3000]
 */

require('dotenv').config();

const express  = require('express');
const http     = require('http');
const path     = require('path');
const fs       = require('fs');
const { WebSocketServer } = require('ws');
const QRCode   = require('qrcode');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const logger   = require('./lib/logger');

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT        = parseInt(process.env.PAIR_PORT || process.env.PORT || '3000', 10);
const SESSION_DIR = path.resolve(__dirname, 'session');

// ─── App ─────────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

app.use(express.json());

// Serve the pairing UI
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'pair.html'));
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── WebSocket broadcast helper ───────────────────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

// ─── Baileys session ──────────────────────────────────────────────────────────
let sock             = null;
let pairingMode      = 'qr';   // 'qr' | 'code'
let pendingPhone     = null;
let isConnected      = false;

async function startSession(mode = 'qr', phone = null) {
  // Tear down any existing socket
  if (sock) {
    try { sock.ev.removeAllListeners(); sock.ws.close(); } catch {}
    sock = null;
  }

  pairingMode  = mode;
  pendingPhone = phone;
  isConnected  = false;

  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal : mode === 'qr',
    browser           : Browsers.ubuntu('REX-MD'),
    logger            : logger.child({ module: 'baileys' }),
    syncFullHistory   : false,
    markOnlineOnConnect: false,
  });

  // ── Pairing-code flow ────────────────────────────────────────────────────
  if (mode === 'code' && phone && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phone.replace(/\D/g, ''));
        broadcast({ type: 'pairing_code', code });
        logger.info(`[pair-server] Pairing code: ${code}`);
      } catch (err) {
        broadcast({ type: 'error', message: err.message });
        logger.error({ err }, '[pair-server] Pairing code request failed');
      }
    }, 3000);
  }

  // ── Connection events ────────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && mode === 'qr') {
      try {
        const dataUrl = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: 'H',
          margin: 1,
          color: { dark: '#111827', light: '#ffffff' },
          width: 320,
        });
        broadcast({ type: 'qr', image: dataUrl });
      } catch (e) {
        logger.error({ e }, '[pair-server] QR encode failed');
      }
    }

    if (connection === 'open') {
      isConnected = true;
      broadcast({ type: 'connected', name: sock.user?.name || sock.user?.id });
      logger.info('[pair-server] ✅ WhatsApp connected — handing off to main bot in 3s...');

      // Close WS connection so main bot can take over the session cleanly
      setTimeout(() => {
        try { sock.ev.removeAllListeners(); sock.ws.close(); } catch {}
        sock = null;

        // Launch the main bot
        const bot = spawn('node', ['index.js'], {
          cwd: __dirname,
          stdio: 'inherit',
          detached: true,
        });
        bot.unref();
        logger.info('[pair-server] 🚀 Main bot launched (index.js)');

        // Give browser a moment to show success, then exit pair server
        setTimeout(() => {
          logger.info('[pair-server] Pair server exiting — bot is running.');
          process.exit(0);
        }, 2000);
      }, 3000);
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        broadcast({ type: 'logged_out' });
        try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
      } else if (!isConnected) {
        broadcast({ type: 'disconnected', reason });
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// ─── REST endpoints used by the UI ───────────────────────────────────────────

// Start QR session
app.post('/api/start-qr', async (req, res) => {
  try {
    await startSession('qr');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Request pairing code
app.post('/api/request-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{7,15}$/.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({ ok: false, error: 'Invalid phone number' });
  }
  try {
    await startSession('code', phone);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Reset / logout
app.post('/api/reset', async (req, res) => {
  try {
    if (sock) { try { sock.ev.removeAllListeners(); sock.ws.close(); } catch {} sock = null; }
    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── WebSocket handshake ──────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type    : 'info',
    connected: isConnected,
    mode    : pairingMode,
    message : isConnected ? 'Already connected' : 'Choose a pairing method to begin',
  }));
});

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`[pair-server] 🌐 Pairing UI running at http://localhost:${PORT}`);
});
