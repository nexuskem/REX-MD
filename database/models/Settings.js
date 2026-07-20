'use strict';

const { Schema, model } = require('mongoose');

/**
 * Bot-wide runtime settings — singleton document (one per bot instance).
 * These values can be changed at runtime by the owner and persist across restarts.
 */
const settingsSchema = new Schema(
  {
    // Unique key to identify this bot's settings document
    instanceId: {
      type: String,
      default: 'default',
      unique: true,
    },
    prefix: {
      type: String,
      default: '.',
    },
    autoStatusView: {
      type: Boolean,
      default: true,
    },
    autoStatusReact: {
      type: Boolean,
      default: false,
    },
    statusReactEmoji: {
      type: String,
      default: '👀',
    },
    maxDownloadMb: {
      type: Number,
      default: 50,
    },
    antiDelete: {
      type: Boolean,
      default: false,
    },
    antiLink: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false, timestamps: true }
);

/**
 * Returns the singleton settings document, creating it with defaults if it doesn't exist.
 */
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ instanceId: 'default' });
  if (!settings) {
    settings = await this.create({ instanceId: 'default' });
  }
  return settings;
};

module.exports = model('Settings', settingsSchema);
