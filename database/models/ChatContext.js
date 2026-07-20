'use strict';

const { Schema, model } = require('mongoose');

/**
 * Rolling AI conversation history per chat JID.
 * Capped at 6 message pairs to keep context manageable.
 * Auto-expires after 24 hours of inactivity via TTL index on updatedAt.
 */
const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'model'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatContextSchema = new Schema(
  {
    jid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours in seconds — MongoDB TTL index
    },
  },
  { versionKey: false }
);

const MAX_HISTORY = 12; // 6 user + 6 model turns

/**
 * Appends a message to the chat history, trimming to MAX_HISTORY.
 * Touches updatedAt so the TTL timer resets on active conversations.
 */
chatContextSchema.methods.addMessage = async function (role, content) {
  this.messages.push({ role, content, timestamp: new Date() });
  if (this.messages.length > MAX_HISTORY) {
    this.messages = this.messages.slice(this.messages.length - MAX_HISTORY);
  }
  this.updatedAt = new Date();
  await this.save();
};

/**
 * Returns history in Gemini's content format: [{role, parts:[{text}]}]
 */
chatContextSchema.methods.toGeminiHistory = function () {
  return this.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));
};

/**
 * Clears conversation history for a chat.
 */
chatContextSchema.methods.clear = async function () {
  this.messages = [];
  this.updatedAt = new Date();
  await this.save();
};

/**
 * Finds or creates a context document for the given JID.
 */
chatContextSchema.statics.findOrCreate = async function (jid) {
  let ctx = await this.findOne({ jid });
  if (!ctx) {
    ctx = await this.create({ jid });
  }
  return ctx;
};

module.exports = model('ChatContext', chatContextSchema);
