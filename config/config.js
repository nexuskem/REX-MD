'use strict';

require('dotenv').config();

/**
 * Validates that a required environment variable is set.
 * Throws a descriptive error on missing values so the bot fails fast at startup
 * rather than crashing with a confusing error deep in a handler.
 */
function required(key) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[config] Missing required environment variable: ${key}\n` +
        `  → Copy .env.example to .env and fill in the value.`
    );
  }
  return value.trim();
}

function optional(key, defaultValue) {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

function optionalBool(key, defaultValue) {
  const value = process.env[key];
  if (!value || value.trim() === '') return defaultValue;
  return value.trim().toLowerCase() === 'true';
}

function optionalInt(key, defaultValue) {
  const value = process.env[key];
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

const config = Object.freeze({
  // WhatsApp
  sessionId: optional('SESSION_ID', 'REX-MD'),
  ownerNumber: required('OWNER_NUMBER'),
  usePairingCode: optionalBool('USE_PAIRING_CODE', true),
  prefix: optional('PREFIX', '.'),
  botName: optional('BOT_NAME', 'REX-MD'),

  // MongoDB
  mongoUri: required('MONGODB_URI'),

  // Gemini
  geminiApiKey: required('GEMINI_API_KEY'),
  geminiModelPrimary: optional('GEMINI_MODEL_PRIMARY', 'gemini-2.5-flash-lite'),
  geminiModelFallback: optional('GEMINI_MODEL_FALLBACK', 'gemini-2.5-flash'),

  // Groq
  groqApiKey: optional('GROQ_API_KEY', ''),
  groqModel: optional('GROQ_MODEL', 'llama-3.3-70b-versatile'),

  // Downloads
  maxDownloadMb: optionalInt('MAX_DOWNLOAD_MB', 50),

  // Status
  autoStatusView: optionalBool('AUTO_STATUS_VIEW', true),
  autoStatusReact: optionalBool('AUTO_STATUS_REACT', false),
  statusReactEmoji: optional('STATUS_REACT_EMOJI', '👀'),

  // Anti-spam
  commandCooldownMs: optionalInt('COMMAND_COOLDOWN_MS', 2000),

  // Weather
  openWeatherApiKey: optional('OPENWEATHER_API_KEY', ''),

  // Anti-delete
  antiDelete: optionalBool('ANTI_DELETE', false),

  // Logging
  logLevel: optional('LOG_LEVEL', 'info'),

  // Runtime
  isDev: process.env.NODE_ENV !== 'production',
});

module.exports = config;
