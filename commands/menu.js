'use strict';

const config = require('../config/config');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands', 'h', 'cmds'],
  description: 'Show all available commands',
  usage: '.menu',
  category: '⚙️ System',
  ownerOnly: false,

  async execute(sock, msg, args, { jid, prefix, commands, isOwner }) {
    const allCommands = commands();

    // Group commands by category
    const grouped = {};
    for (const cmd of allCommands) {
      const cat = cmd.category || '🔧 Misc';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(cmd);
    }

    const now = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

    let text = `╔══════════════════╗\n`;
    text += `║   🤖 *${config.botName}*   ║\n`;
    text += `╚══════════════════╝\n\n`;
    text += `👤 Commands available to you\n`;
    text += `🕐 ${now}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const [category, cmds] of Object.entries(grouped)) {
      // Filter owner-only commands for non-owners
      const visible = cmds.filter((c) => isOwner || !c.ownerOnly);
      if (!visible.length) continue;

      text += `${category}\n`;
      for (const cmd of visible) {
        text += `  ${prefix}${cmd.name}`;
        if (cmd.aliases?.length) {
          text += ` (${cmd.aliases.map((a) => `${prefix}${a}`).join(', ')})`;
        }
        text += `\n`;
      }
      text += '\n';
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 Use \`${prefix}help <command>\` for detailed info\n`;
    text += `📌 Prefix: \`${prefix}\``;

    await sock.sendMessage(jid, { 
      image: { url: './images/menu_picture.jpeg' },
      caption: text 
    });
  },
};
