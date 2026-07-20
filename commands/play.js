'use strict';

const { downloadAudio, cleanUp } = require('../features/downloader/ytdlp');
const logger = require('../lib/logger');

module.exports = {
  name: 'play',
  aliases: ['music', 'song', 'p'],
  description: 'Search and play a YouTube song as an audio file',
  usage: '.play <song name or artist>',
  category: '🎵 Music',
  ownerOnly: false,

  async execute(sock, msg, args, { jid }) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text: '🎵 Please provide a song name.\n\nUsage: `.play <song name>`\nExample: `.play shape of you ed sheeran`',
      });
    }

    const query = args.join(' ');
    await sock.sendMessage(jid, { text: `🔍 Searching for *${query}*...` });

    let filePath = null;
    try {
      const result = await downloadAudio(query);
      filePath = result.filePath;

      await sock.sendMessage(jid, {
        audio: { url: filePath },
        mimetype: 'audio/mpeg',
        caption: `🎵 *${result.title}*\n⏱ Duration: ${result.duration}`,
        ptt: false, // Send as audio file, not a voice note
      });

      logger.info(`[play] Sent audio: ${result.title}`);
    } catch (err) {
      logger.error({ err }, '[play] Download failed');
      await sock.sendMessage(jid, {
        text: `❌ Couldn't download that song.\n\n${err.message}`,
      });
    } finally {
      cleanUp(filePath);
    }
  },
};
