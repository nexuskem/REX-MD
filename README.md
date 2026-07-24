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

### 1. Node.js ≥ 20 LTS
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
node --version  # Should be v20.x.x
```

### 2. MongoDB URI
- **Recommended:** [MongoDB Atlas free tier](https://www.mongodb.com/atlas) — create a cluster and get your connection string
- **Local:** Install MongoDB and use `mongodb://localhost:27017/rexmd`

> **Note on ffmpeg & yt-dlp:** Both are bundled as npm packages (`ffmpeg-static`, `youtube-dl-exec`). **No system install of ffmpeg or yt-dlp is required** — `npm install` handles them automatically on every platform.

---

## 🚀 Installation

```bash
# Clone the repo
git clone https://github.com/your-nexuskem/REX-MD.git
cd REX-MD

# Install dependencies (also downloads ffmpeg and yt-dlp binaries)
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

> **Session persistence:** Your session is stored in MongoDB. Restarting or redeploying does **not** require re-pairing.

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

## 🖥️ Deployment

> ⚠️ **One session at a time.** REX-MD's WhatsApp session lives in MongoDB. Never point two deployments at the same `MONGODB_URI` simultaneously — they will fight each other, drop connections, and corrupt the stored session. Pick one primary host.

### Option A — Railway (~$5/mo, recommended)

**Primary platform.** Smooth deploy experience, zero config beyond env vars.

1. Push REX-MD to a GitHub repo (private is fine).
2. On Railway: **New Project → Deploy from GitHub repo** → select your repo.
3. Railway auto-detects Node via the `nixpacks.toml` in the repo root and runs `npm install` + `npm start`. ffmpeg and yt-dlp are installed automatically.
4. **Variables tab** → add every key from `.env.example`.
5. **Settings → Deploy** → confirm start command is `node index.js`.
6. No public domain needed — Baileys doesn't serve HTTP.

**Redeploy steps:** push a new commit, or click **Deploy** in the Railway dashboard.

---

### Option B — KataBump (free, 24/7, requires 4-day renewal)

**Best free option.** Hosts any Node app; marketed at Discord bots but works for any `npm start` service.

1. Create an account at [katabump.com](https://katabump.com), create a new server on the **Free** plan.
2. In **control.katabump.com → Startup tab**, select the Node.js runtime.
3. Upload the project via the web file manager or SFTP — skip uploading `node_modules`.
4. Set all env vars from `.env.example` in the panel's Variables/Startup tab.
5. Confirm the start command is `npm start`, then boot the server.
6. **Set a calendar reminder every 4 days** — free-tier servers suspend unless manually renewed. Don't rely solely on their email/Discord reminders.

**Resource note:** KataBump Free gives 308 MB RAM and 716 MB disk. Keep `MAX_DOWNLOAD_MB` at 20–25 (not 50) to stay within limits. The bundled ffmpeg/yt-dlp binaries count against disk space.

---

### Option C — GitHub Actions (free for public repos, backup use only)

**Free but imperfect.** GitHub caps jobs at 6 hours; the workflow in `.github/workflows/keepalive.yml` works around this by self-triggering at the 5.5-hour mark. Expect a 1–3 minute reconnect gap each cycle.

**Setup steps:**

1. **Make the repo public** (private repos only get 2,000 free minutes/month — burned in ~2 days running continuously).
2. Create a classic PAT: **GitHub → Settings → Developer settings → Personal access tokens → Classic** with `repo` + `workflow` scopes.
3. Add secrets at **Repo → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `GH_PAT` | The PAT you just created |
| `MONGODB_URI` | Your MongoDB Atlas URI |
| `OWNER_NUMBER` | Your WhatsApp number |
| `GEMINI_API_KEY` | Your Gemini key |
| `GROQ_API_KEY` | Your Groq key (optional) |
| `OPENWEATHER_API_KEY` | Weather key (optional) |

4. **First-time pairing:** GitHub Actions has no interactive TTY — pairing code won't work there. Pair your number **locally first** (`USE_PAIRING_CODE=true`, run `node index.js`, complete the pairing), then stop the local bot. The session is now in MongoDB; GitHub Actions will pick it up on first run.
5. Trigger the workflow: **Actions → REX-MD Keep-Alive Runner → Run workflow**.

**Redeploy steps:** push a commit (the schedule triggers automatically) or manually run the workflow.

---

### Option D — VPS with pm2 (local/self-hosted)

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

# Restart / Stop
pm2 restart rex-md
pm2 stop rex-md
```

```bash
# Live logs
pm2 logs rex-md --lines 100

# Error logs
tail -f logs/rex-err.log
```

---

## 🔐 Where Secrets Go, Per Platform

| Platform | Secret storage location |
|---|---|
| Railway | Project → **Variables** tab |
| KataBump | control.katabump.com → server → **Variables/Startup** tab |
| GitHub Actions | Repo → **Settings → Secrets and variables → Actions** |
| VPS / Local | `.env` file (never commit it) |

---

## 📁 Project Structure

```
REX-MD/
├── index.js                    # Entry point
├── ecosystem.config.js         # pm2 config
├── nixpacks.toml               # Railway deployment config
├── .github/workflows/
│   └── keepalive.yml           # GitHub Actions self-restarting runner
├── /config
│   └── config.js               # Environment config loader
├── /core
│   ├── connection.js           # WhatsApp socket + pairing
│   ├── commandHandler.js       # Message parsing + routing
│   └── eventHandler.js         # Status, anti-delete, groups
├── /commands/                  # One file per command
├── /features
│   ├── ai/                     # Gemini + Groq clients
│   ├── downloader/             # yt-dlp + platform detection
│   └── status/                 # Auto status viewer
├── /database
│   ├── mongoose.js             # Connection singleton
│   └── models/                 # User, ChatContext, Settings
├── /lib
│   ├── binaries.js             # Resolves npm-bundled ffmpeg + yt-dlp paths
│   ├── logger.js               # pino logger
│   └── cooldown.js             # Per-user cooldown tracker
├── /temp                       # Gitignored: in-flight downloads
└── /session                    # Gitignored: local auth fallback
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
| `execa` | Run yt-dlp binary as child process |
| `axios` | HTTP client for weather API |
| `pino` + `pino-pretty` | Structured logging |
| `dotenv` | Environment variable loading |
| `sharp` | Image processing |
| `qrcode-terminal` | QR code display fallback |
| `ffmpeg-static` | Bundled ffmpeg binary — no system install needed |
| `youtube-dl-exec` | Bundled yt-dlp binary — no system install needed |

---

## 📄 License

MIT
