'use strict';

// Load environment variables first, before any other imports
require('dotenv').config();

const config = require('./config/config');
const logger = require('./lib/logger');
const { connectDB } = require('./database/mongoose');
const { startConnection } = require('./core/connection');

// Ensure temp directory exists
const fs = require('fs');
const path = require('path');
const tempDir = path.resolve(__dirname, 'temp');
const logsDir = path.resolve(__dirname, 'logs');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

async function main() {
  logger.info(`🤖 Starting ${config.botName}...`);

  // 1. Connect to MongoDB
  try {
    await connectDB(config.mongoUri);
  } catch (err) {
    logger.fatal({ err }, '❌ Failed to connect to MongoDB. Cannot start bot.');
    process.exit(1);
  }

  // 2. Start WhatsApp connection
  try {
    await startConnection();
  } catch (err) {
    logger.fatal({ err }, '❌ Failed to start WhatsApp connection.');
    process.exit(1);
  }
}

// --- Global error guards ---
process.on('uncaughtException', (err) => {
  logger.error({ err }, '⚠️ Uncaught Exception');
  // Don't crash on uncaught errors — Baileys uses this path for some non-fatal socket errors
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '⚠️ Unhandled Promise Rejection');
});

process.on('SIGINT', () => {
  logger.info('👋 Received SIGINT — shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Received SIGTERM — shutting down gracefully');
  process.exit(0);
});

main();
