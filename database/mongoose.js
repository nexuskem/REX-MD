'use strict';

const mongoose = require('mongoose');
const logger = require('../lib/logger');

let isConnected = false;

/**
 * Connects to MongoDB using the URI from config.
 * Singleton — safe to call multiple times; only connects once.
 * @param {string} uri - MongoDB connection URI
 */
async function connectDB(uri) {
  if (isConnected) {
    logger.debug('[db] Already connected to MongoDB');
    return;
  }

  mongoose.set('strictQuery', false);

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('[db] ✅ Connected to MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, '[db] MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('[db] Disconnected from MongoDB — will attempt to reconnect');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  });
}

module.exports = { connectDB, mongoose };
