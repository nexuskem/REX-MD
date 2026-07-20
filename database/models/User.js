'use strict';

const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    jid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
    },
    isOwner: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    // User's preferred download quality: 'audio' | 'video'
    preferredQuality: {
      type: String,
      enum: ['audio', 'video'],
      default: 'audio',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

/**
 * Finds or creates a user record by JID.
 * @param {string} jid
 * @param {string} [name]
 */
userSchema.statics.findOrCreate = async function (jid, name = '') {
  let user = await this.findOne({ jid });
  if (!user) {
    user = await this.create({ jid, name });
  } else if (name && user.name !== name) {
    user.name = name;
    await user.save();
  }
  return user;
};

module.exports = model('User', userSchema);
