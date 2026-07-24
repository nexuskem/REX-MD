# REX-MD — WhatsApp Assistant Bot

A modern, production-ready WhatsApp assistant bot with YouTube music/video playback, universal media downloading, AI-powered Q&A (text + images), and auto status viewing.

---

## ✨ Features

| Feature | Command(s) | Description |
|---|---|---|
| 🎵 YouTube Audio | `.play <song>` | Search & send as MP3 |
| 🎬 YouTube Video | `.video <title>` | Search & send as MP4 |
| ⬇️ Universal Download | `.dl <url> [audio]` | YouTube, TikTok, Instagram, Facebook, X, SoundCloud, Pinterest |
| 🤖 AI Chat | `.ai <question>` | Gemini-powered Q&A with memory |
| 📸 Image Solver | `.solve` | Solve math/physics/diagrams from a photo |
| 🔄 Reset Chat | `.newchat` | Clear your AI conversation history |
| 📋 Menu | `.menu` / `.help` | Auto-generated command list |
| 🏓 Ping | `.ping` | Check bot status & latency |
| 🎨 Sticker | `.sticker` | Convert image/video to WhatsApp sticker |
| 👥 Tag All | `.tagall [msg]` | Mention all group members (admin only) |
| ⬆️ Promote | `.promote @user` | Give admin rights in a group |
| ⬇️ Demote | `.demote @user` | Remove admin rights |
| 🔗 Anti-Link | `.antilink on\|off` | Auto-remove invite link senders |
| 🗑️ Anti-Delete | `.antidelete on\|off` | Forward deleted messages to owner |
| 🌍 Translate | `.tr <lang> <text>` | Translate to any language |
| 🌤️ Weather | `.weather <city>` | Current weather conditions |
| 👑 Owner Info | `.owner` | Send owner contact card |
| 📋 Report Bug | `.report <msg>` | Send feedback to owner |
| ⚙️ Settings | `.settings` | View/change runtime settings |
| 🚫 Ban/Unban | `.ban @user` / `.unban @user` | Block/unblock bot users |

---

## 🔧 Prerequisites

Before installing, make sure you have the following on your system:

### 1. Node.js ≥ 20 LTS
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
node --version  # Should be v20.x.x
```

### 2. ffmpeg
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg -y

# Verify
ffmpeg -version
```

### 3. yt-dlp
```bash
# Official install (installs to /usr/local/bin)
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Verify
yt-dlp --version
```

### 4. MongoDB URI
- **Recommended:** [MongoDB Atlas free tier](https://www.mongodb.com/atlas) — create a cluster and get your connection string
- **Local:** Install MongoDB and use `mongodb://localhost:27017/rexmd`

---

## 🚀 Installation

```bash
# Clone the repo
git clone https://github.com/your-nexuskem/REX-MD.git
cd REX-MD

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
nano .env   # Fill in all the required values
```

---

## ⚙️ Configuration

Open `.env` and fill in at minimum:

| Variable | Required | Description |
|---|---|---|
| `OWNER_NUMBER` | ✅ | Your WhatsApp number (no + sign, e.g. `2547XXXXXXXX`) |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key ([get it here](https://aistudio.google.com/app/apikey)) |
| `GROQ_API_KEY` | ☑️ Optional | Groq API key — acts as AI fallback ([get it here](https://console.groq.com/keys)) |
| `OPENWEATHER_API_KEY` | ☑️ Optional | For `.weather` command ([get it here](https://openweathermap.org/api)) |

---

## 🔑 First Run — Pairing Your Number

```bash
node index.js
```

With `USE_PAIRING_CODE=true` (the default):
1. The bot will print: `📱 Enter your WhatsApp number (with country code, no +):`
2. Enter your number (e.g. `2547XXXXXXXX`)
3. Wait a few seconds — it will print an 8-character code like: `🔑 Pairing code: ABCD-1234`
4. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device → Enter code manually**
5. The bot will show `✅ Connected as <Your Name>`

> **Session persistence:** Your session is stored in the `./session/` folder locally (or MongoDB in production). Restarting the bot does **not** require re-pairing.

---

## 📱 Command Reference

### 🎵 Music & Video
| Command | Description |
|---|---|
| `.play <song name>` | Search YouTube and send as MP3 audio |
| `.video <title or URL>` | Search YouTube and send as MP4 video |
| `.dl <url>` | Download from any supported platform |
| `.dl <url> audio` | Download audio-only from any platform |

### 🤖 AI
| Command | Description |
|---|---|
| `.ai <question>` | Ask anything — supports multi-turn conversation |
| `.solve` | Reply `.solve` to an image to get AI analysis |
| `.newchat` | Clear your conversation history |
| `.tr <lang> <text>` | Translate text (e.g. `.tr sw Hello`) |

### 👥 Group Tools
| Command | Description |
|---|---|
| `.tagall [msg]` | Mention all members (admin only) |
| `.promote @user` | Give admin (bot must be admin) |
| `.demote @user` | Remove admin (bot must be admin) |
| `.antilink on\|off` | Auto-remove invite link senders |

### 🌍 Utilities
| Command | Description |
|---|---|
| `.weather <city>` | Current weather for any city |
| `.sticker` | Convert image/video to WhatsApp sticker |
| `.ping` | Check bot latency and uptime |
| `.owner` | Get owner's contact card |
| `.report <msg>` | Send feedback to owner |

### 👑 Owner Only
| Command | Description |
|---|---|
| `.settings` | View all settings |
| `.setprefix <char>` | Change command prefix |
| `.autostatus on\|off` | Toggle auto status view |
| `.autoreact on\|off` | Toggle status reactions |
| `.antidelete on\|off` | Toggle anti-delete forwarding |
| `.ban @user` | Ban a user |
| `.unban @user` | Unban a user |

---

## 🖥️ Deployment (VPS)

### Using pm2 (Recommended)

```bash
# Install pm2 globally
npm install -g pm2

# Start the bot
pm2 start ecosystem.config.js

# Auto-restart on system reboot
pm2 startup
pm2 save

# View logs
pm2 logs rex-md

# Restart
pm2 restart rex-md

# Stop
pm2 stop rex-md
```

### Checking Logs

```bash
# Live logs
pm2 logs rex-md --lines 100

# Error logs
tail -f logs/rex-err.log
```

---

## 📁 Project Structure

```
REX-MD/
├── index.js               # Entry point
├── ecosystem.config.js    # pm2 config
├── /config
│   └── config.js          # Environment config loader
├── /core
│   ├── connection.js      # WhatsApp socket + pairing
│   ├── commandHandler.js  # Message parsing + routing
│   └── eventHandler.js    # Status, anti-delete, groups
├── /commands/             # One file per command
├── /features
│   ├── ai/                # Gemini + Groq clients
│   ├── downloader/        # yt-dlp + platform detection
│   └── status/            # Auto status viewer
├── /database
│   ├── mongoose.js        # Connection singleton
│   └── models/            # User, ChatContext, Settings
├── /lib
│   ├── logger.js          # pino logger
│   └── cooldown.js        # Per-user cooldown tracker
├── /temp                  # Gitignored: in-flight downloads
└── /session               # Gitignored: local auth fallback
```

---

## 🛡️ Notes on Usage

- REX-MD uses [Baileys](https://github.com/WhiskeySockets/Baileys), which connects via WhatsApp's consumer protocol. Using a **secondary/dedicated number** rather than your primary number is the standard precaution.
- The bot only responds to people who message it — it does not blast unsolicited messages.
- Free AI tiers are shared across all users. The built-in cooldown and fallback chain are specifically designed to make the shared quota stretch further.
- Download features are for personal/group use — treat them the same as any personal media tool.

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `@whiskeysockets/baileys` | WhatsApp multi-device WebSocket client |
| `mongoose` | MongoDB ODM |
| `@google/generative-ai` | Gemini AI SDK |
| `groq-sdk` | Groq AI SDK (fallback) |
| `execa` | Run yt-dlp as child process |
| `axios` | HTTP client for weather API |
| `pino` + `pino-pretty` | Structured logging |
| `dotenv` | Environment variable loading |
| `sharp` | Image processing |
| `qrcode-terminal` | QR code display fallback |

**System dependencies:** `ffmpeg`, `yt-dlp`

---

## 📄 License

MIT
