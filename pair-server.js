'use strict';

/**
 * REX-MD Pairing Server (Bridge Mode)
 * 
 * Launches index.js as a child process, captures its QR/status output,
 * and streams it to the browser via WebSocket.
 * 
 * ONE WhatsApp connection only — no 401 conflicts.
 * Usage: node pair-server.js
 */

require('dotenv').config();

const express         = require('express');
const http            = require('http');
const path            = require('path');
const { WebSocketServer } = require('ws');
const QRCode          = require('qrcode');
const { spawn }       = require('child_process');
const logger          = require('./lib/logger');

const PORT = parseInt(process.env.PAIR_PORT || process.env.PORT || '3000', 10);

// ─── Express + WS ────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

app.use(express.json());
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'pair.html')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── Broadcast to all WS clients ─────────────────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

// ─── State ────────────────────────────────────────────────────────────────────
let botProcess  = null;
let isConnected = false;

// ─── Launch index.js and pipe its stdout ─────────────────────────────────────
function startBot() {
  if (botProcess) return; // already running

  logger.info('[pair-server] 🚀 Launching REX-MD bot...');

  botProcess = spawn('node', ['index.js'], {
    cwd: __dirname,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let buffer = '';

  function processOutput(chunk) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      handleBotLine(line);
    }
  }

  botProcess.stdout.on('data', processOutput);
  botProcess.stderr.on('data', processOutput);

  botProcess.on('exit', (code) => {
    logger.warn(`[pair-server] Bot process exited (code ${code})`);
    botProcess = null;
    isConnected = false;
    if (code !== 0) {
      broadcast({ type: 'disconnected', reason: code });
    }
  });
}

// ─── Parse bot output lines for QR / status ──────────────────────────────────
let qrBuffer = [];
let inQrBlock = false;

function handleBotLine(line) {
  // Detect QR block: lines made of block-drawing chars
  const isQrLine = /^[█▄▀ ]+$/.test(line) && line.length > 10;

  if (isQrLine) {
    inQrBlock = true;
    qrBuffer.push(line);
    return;
  }

  if (inQrBlock && line.trim() === '') {
    // End of QR block — ignore (the raw ASCII QR isn't useful for browser)
    inQrBlock = false;
    qrBuffer = [];
    return;
  }

  inQrBlock = false;
  qrBuffer  = [];

  // Detect connected
  if (line.includes('✅ Connected as') || line.includes('connection: open')) {
    const nameMatch = line.match(/Connected as (.+)/);
    isConnected = true;
    broadcast({ type: 'connected', name: nameMatch ? nameMatch[1].trim() : 'REX-MD' });
    return;
  }

  // Detect logged out
  if (line.includes('Logged out')) {
    broadcast({ type: 'logged_out' });
    return;
  }

  // Detect error
  if (line.includes('FATAL') || line.includes('Cannot start')) {
    broadcast({ type: 'error', message: line.replace(/\[.*?\]\s*\w+:\s*/, '') });
    return;
  }
}

// ─── Intercept QR at the Baileys level via IPC file ──────────────────────────
// We write QR data to a temp file from connection.js, then pick it up here
const QR_FILE = path.resolve(__dirname, 'session', '.qr_pending');
const fs = require('fs');

async function pollQRFile() {
  try {
    if (fs.existsSync(QR_FILE)) {
      const qrData = fs.readFileSync(QR_FILE, 'utf8').trim();
      if (qrData) {
        fs.unlinkSync(QR_FILE); // consume it
        const dataUrl = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'H',
          margin: 1,
          color: { dark: '#111827', light: '#ffffff' },
          width: 320,
        });
        broadcast({ type: 'qr', image: dataUrl });
        logger.info('[pair-server] QR sent to browser');
      }
    }
  } catch {}
}

// Poll every 500ms for a new QR file
setInterval(pollQRFile, 500);

// ─── REST endpoints ───────────────────────────────────────────────────────────
app.post('/api/start', (req, res) => {
  try {
    // Clear old session so we get a fresh QR
    const sessionDir = path.resolve(__dirname, 'session');
    if (fs.existsSync(sessionDir)) {
      fs.readdirSync(sessionDir)
        .filter(f => f !== '.gitkeep')
        .forEach(f => { try { fs.unlinkSync(path.join(sessionDir, f)); } catch {} });
    }
    startBot();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Keep legacy endpoints so pair.html still works
app.post('/api/start-qr', (req, res) => {
  try { startBot(); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/reset', (req, res) => {
  try {
    if (botProcess) { botProcess.kill(); botProcess = null; }
    const sessionDir = path.resolve(__dirname, 'session');
    if (fs.existsSync(sessionDir)) {
      fs.readdirSync(sessionDir)
        .filter(f => f !== '.gitkeep')
        .forEach(f => { try { fs.unlinkSync(path.join(sessionDir, f)); } catch {} });
    }
    isConnected = false;
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
    message : isConnected ? 'Already connected' : 'Click "Generate QR Code" to begin',
  }));
});

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`[pair-server] 🌐 Pairing UI → http://localhost:${PORT}`);
  logger.info(`[pair-server] Click "Generate QR Code" in the browser to start`);
});
