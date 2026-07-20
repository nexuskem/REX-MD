'use strict';

const { downloadVideo, cleanUp } = require('../features/downloader/ytdlp');
const logger = require('../lib/logger');

module.exports = {
  name: 'video',
  aliases: ['vid', 'ytv'],
  description: 'Search and download a YouTube video',
  usage: '.video <song name, movie title, or direct YouTube URL>',
  category: '🎵 Music',
  ownerOnly: false,

  async execute(sock, msg, args, { jid }) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text: '🎬 Please provide a video name or URL.\n\nUsage: `.video <title or URL>`\nExample: `.video despacito official video`',
      });
    }

    const query = args.join(' ');
    await sock.sendMessage(jid, { text: `🔍 Searching for *${query}*...` });

    let filePath = null;
    try {
      const result = await downloadVideo(query);
      filePath = result.filePath;

      await sock.sendMessage(jid, {
        video: { url: filePath },
        caption: `🎬 *${result.title}*\n⏱ Duration: ${result.duration}`,
        mimetype: 'video/mp4',
      });

      logger.info(`[video] Sent video: ${result.title}`);
    } catch (err) {
      logger.error({ err }, '[video] Download failed');
      await sock.sendMessage(jid, {
        text: `❌ Couldn't download that video.\n\n${err.message}`,
      });
    } finally {
      cleanUp(filePath);
    }
  },
};
