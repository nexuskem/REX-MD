'use strict';

const config = require('../config/config');

module.exports = {
  name: 'ping',
  aliases: ['status', 'speed', 'alive'],
  description: 'Check if REX-MD is online and measure response time',
  usage: '.ping',
  category: '⚙️ System',
  ownerOnly: false,

  async execute(sock, msg, args, { jid }) {
    const start = Date.now();
    await sock.sendMessage(jid, { text: '🏓 Pinging...' });
    const latency = Date.now() - start;

    const uptime = process.uptime();
    const uptimeStr = formatUptime(uptime);

    await sock.sendMessage(jid, {
      text:
        `🤖 *${config.botName} Status*\n\n` +
        `🏓 Latency: *${latency}ms*\n` +
        `⏱ Uptime: *${uptimeStr}*\n` +
        `💾 Memory: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB*\n` +
        `🟢 Status: Online`,
    });
  },
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
