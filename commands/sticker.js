'use strict';

const { execa } = require('execa');
const path = require('path');
const fs = require('fs');
const logger = require('../lib/logger');
const { cleanUp } = require('../features/downloader/ytdlp');
const { ffmpegPath } = require('../lib/binaries');

const TEMP_DIR = path.resolve(__dirname, '../temp');

module.exports = {
  name: 'sticker',
  aliases: ['s', 'stiker', 'sticke'],
  description: 'Convert an image or short video to a WhatsApp sticker',
  usage: 'Send image/video with caption `.sticker` OR reply `.sticker` to a media message',
  category: '🎨 Fun',
  ownerOnly: false,

  async execute(sock, msg, args, { jid }) {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');

    // Find media: current message or quoted
    const imageMsg = msg.message?.imageMessage ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    const videoMsg = msg.message?.videoMessage ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (!imageMsg && !videoMsg) {
      return sock.sendMessage(jid, {
        text:
          '🎨 *Sticker Maker*\n\n' +
          'Send an image or short video with caption `.sticker`\n' +
          'OR reply `.sticker` to a media message.',
      });
    }

    await sock.sendMessage(jid, { text: '🎨 Making sticker...' });

    let inputPath = null;
    let outputPath = null;

    try {
      if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

      const id = `sticker-${Date.now()}`;
      const isVideo = !!videoMsg;
      const ext = isVideo ? 'mp4' : 'jpg';
      inputPath = path.join(TEMP_DIR, `${id}.${ext}`);
      outputPath = path.join(TEMP_DIR, `${id}.webp`);

      // Determine which message holds the media
      const targetMsg = imageMsg
        ? { ...msg, message: { imageMessage: imageMsg } }
        : { ...msg, message: { videoMessage: videoMsg } };

      const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});
      fs.writeFileSync(inputPath, buffer);

      if (isVideo) {
        // Convert video to animated WebP sticker (max 3 seconds, 512x512)
        await execa(ffmpegPath, [
          '-i', inputPath,
          '-t', '3',
          '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=00000000,fps=15',
          '-loop', '0',
          '-ss', '00:00:00',
          '-an',
          '-vsync', '0',
          outputPath,
        ]);
      } else {
        // Convert image to WebP sticker
        await execa(ffmpegPath, [
          '-i', inputPath,
          '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=00000000',
          outputPath,
        ]);
      }

      const stickerBuffer = fs.readFileSync(outputPath);

      await sock.sendMessage(jid, {
        sticker: stickerBuffer,
      });

      logger.info(`[sticker] Sent ${isVideo ? 'animated' : 'static'} sticker`);
    } catch (err) {
      logger.error({ err }, '[sticker] Failed to create sticker');
      await sock.sendMessage(jid, {
        text: '❌ Failed to create sticker. The media may be invalid or too large — try a different image or a shorter video clip.',
      });
    } finally {
      cleanUp(inputPath);
      cleanUp(outputPath);
    }
  },
};
