'use strict';

const { downloadMedia, cleanUp } = require('../features/downloader/ytdlp');
const { detectPlatform, isValidUrl } = require('../features/downloader/platformDetect');
const logger = require('../lib/logger');
const path = require('path');
const fs = require('fs');

module.exports = {
  name: 'dl',
  aliases: ['download', 'get'],
  description: 'Download media from any supported platform (YouTube, TikTok, Instagram, Facebook, X, SoundCloud, Pinterest)',
  usage: '.dl <url> [audio]',
  category: '⬇️ Downloader',
  ownerOnly: false,

  async execute(sock, msg, args, { jid }) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          '⬇️ *Universal Downloader*\n\n' +
          'Usage: `.dl <url> [audio]`\n\n' +
          'Supported: YouTube, TikTok, Instagram, Facebook, X/Twitter, SoundCloud, Pinterest, and more.\n\n' +
          'Add `audio` at the end to download audio-only:\n' +
          '`.dl https://tiktok.com/... audio`',
      });
    }

    const url = args[0];
    const audioOnly = args[1]?.toLowerCase() === 'audio';

    if (!isValidUrl(url)) {
      return sock.sendMessage(jid, {
        text: '❌ That doesn\'t look like a valid URL. Please paste a full link starting with https://',
      });
    }

    const platform = detectPlatform(url);
    await sock.sendMessage(jid, {
      text: `⬇️ Downloading from *${platform}*${audioOnly ? ' (audio only)' : ''}...`,
    });

    let filePath = null;
    try {
      const result = await downloadMedia(url, audioOnly);
      filePath = result.filePath;
      const ext = result.ext.toLowerCase();

      const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
      const isAudio = ['mp3', 'aac', 'ogg', 'm4a', 'flac', 'wav'].includes(ext);

      if (isVideo) {
        await sock.sendMessage(jid, {
          video: { url: filePath },
          caption: `✅ *${result.title}*\nDownloaded from ${platform}`,
          mimetype: 'video/mp4',
        });
      } else if (isAudio) {
        await sock.sendMessage(jid, {
          audio: { url: filePath },
          mimetype: 'audio/mpeg',
          caption: `✅ *${result.title}*\nDownloaded from ${platform}`,
          ptt: false,
        });
      } else {
        // Generic file (PDF, image, etc.)
        await sock.sendMessage(jid, {
          document: { url: filePath },
          fileName: path.basename(filePath),
          caption: `✅ Downloaded from ${platform}`,
        });
      }

      logger.info(`[dl] Sent ${ext} from ${platform}`);
    } catch (err) {
      logger.error({ err }, '[dl] Download failed');
      await sock.sendMessage(jid, {
        text: `❌ Download failed.\n\n${err.message}`,
      });
    } finally {
      cleanUp(filePath);
    }
  },
};
