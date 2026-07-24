# REX-MD — WhatsApp Assistant Bot

A production-ready WhatsApp assistant bot built with [Baileys](https://github.com/WhiskeySockets/Baileys). Features YouTube music/video downloads, universal media downloader, AI-powered Q&A (text + images), auto status viewing, and full group management tools.

---

## ✨ Features

| Feature | Command | Description |
|---|---|---|
| 🎵 YouTube Audio | `.play <song>` | Search YouTube and send as MP3 |
| 🎬 YouTube Video | `.video <title>` | Search YouTube and send as MP4 |
| ⬇️ Universal Download | `.dl <url> [audio]` | YouTube, TikTok, Instagram, Facebook, X, SoundCloud, Pinterest |
| 🤖 AI Chat | `.ai <question>` | Gemini-powered Q&A with conversation memory |
| 📸 Image Solver | `.solve` | Solve math, physics, or any problem from a photo |
| 🔄 Reset Chat | `.newchat` | Clear your AI conversation history |
| 📋 Menu | `.menu` | Auto-generated command list |
| 🏓 Ping | `.ping` | Check bot status and latency |
| 🎨 Sticker | `.sticker` | Convert image or short video to a WhatsApp sticker |
| 👥 Tag All | `.tagall [msg]` | Mention all group members (admins only) |
| ⬆️ Promote | `.promote @user` | Give admin rights in a group |
| ⬇️ Demote | `.demote @user` | Remove admin rights |
| 🔗 Anti-Link | `.antilink on\|off` | Auto-remove invite link senders |
| 🗑️ Anti-Delete | `.antidelete on\|off` | Forward deleted messages to owner |
| 🌍 Translate | `.tr <lang> <text>` | Translate to any language |
| 🌤️ Weather | `.weather <city>` | Current weather conditions |
| 👑 Owner Info | `.owner` | Send owner contact card |
| 📋 Report Bug | `.report <msg>` | Send feedback to owner |
| ⚙️ Settings | `.settings` | View or change runtime settings |
| 🚫 Ban/Unban | `.ban @user` / `.unban @user` | Block or unblock bot users |

---

## 🔧 Prerequisites

### Node.js ≥ 20 LTS

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
node --version   # Should print v20.x.x
```

### MongoDB URI

- **Free cloud:** [MongoDB Atlas](https://www.mongodb.com/atlas) — create a free cluster and copy the connection string.
- **Local:** `mongodb://localhost:27017/rexmd`

> **ffmpeg & yt-dlp are bundled as npm packages.** No system installation needed — `npm install` downloads them automatically on every platform.

---

## 🚀 Installation

```bash
git clone https://github.com/nexuskem/REX-MD.git
cd REX-MD
npm install
cp .env.example .env
nano .env     # Fill in the required values
```

---

## ⚙️ Configuration

Open `.env` and set at minimum:

| Variable | Required | Description |
|---|---|---|
| `OWNER_NUMBER` | ✅ | Your WhatsApp number — no `+` sign, e.g. `254712345678` |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/app/apikey) API key |
| `GROQ_API_KEY` | Optional | [Groq](https://console.groq.com/keys) key — used as AI fallback |
| `OPENWEATHER_API_KEY` | Optional | [OpenWeatherMap](https://openweathermap.org/api) key for `.weather` |

All other variables have sensible defaults — see `.env.example` for the full list.

---

## 🔑 First Run — Pairing Your Number

```bash
node index.js
```

With `USE_PAIRING_CODE=true` (default):

1. The bot prints: `📱 Enter your WhatsApp number (with country code, no +):`
2. Enter your number (e.g. `254712345678`)
3. After a few seconds it prints: `🔑 Pairing code: ABCD-1234`
4. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device → Enter code manually**
5. The bot confirms: `✅ Connected as <Your Name>`

> **Session persistence:** Your session is saved to MongoDB. Restarting or switching platforms does **not** require re-pairing.

> ⚠️ **GitHub Actions does not support pairing codes** (no interactive terminal). Pair locally first, then deploy. The saved MongoDB session is used automatically.

---

## 📱 Command Reference

### 🎵 Music & Video

| Command | Description |
|---|---|
| `.play <song name>` | Search YouTube and send as MP3 audio |
| `.video <title or URL>` | Search YouTube and send as MP4 video |
| `.dl <url>` | Download from any supported platform |
| `.dl <url> audio` | Download audio-only from any platform |

**Aliases:** `.play` → `.music`, `.song`, `.p` | `.video` → `.vid`, `.ytv` | `.dl` → `.download`, `.get`

### 🤖 AI

| Command | Description |
|---|---|
| `.ai <question>` | Ask anything — supports multi-turn conversations |
| `.solve` | Reply `.solve` to an image for AI analysis |
| `.newchat` | Clear your current conversation history |
| `.tr <lang> <text>` | Translate text (e.g. `.tr sw Hello`) |

**Aliases:** `.ai` → `.ask`, `.rex`, `.chat`, `.q` | `.tr` → `.translate`, `.trans`

Common language codes: `en`, `sw`, `fr`, `de`, `es`, `pt`, `ar`, `zh`, `ja`, `ko`, `ru`, `hi`

### 👥 Group Tools

| Command | Description |
|---|---|
| `.tagall [msg]` | Mention all members (group admins only) |
| `.promote @user` | Give admin rights (bot must be admin) |
| `.demote @user` | Remove admin rights (bot must be admin) |
| `.antilink on\|off` | Auto-remove members who post WhatsApp invite links |

### 🌍 Utilities

| Command | Description |
|---|---|
| `.weather <city>` | Current weather for any city |
| `.sticker` | Convert image or video to a WhatsApp sticker |
| `.ping` | Check bot latency and uptime |
| `.owner` | Get owner's contact card |
| `.report <msg>` | Send feedback to owner |

### 👑 Owner Only

| Command | Description |
|---|---|
| `.settings` | View all current settings |
| `.setprefix <char>` | Change command prefix |
| `.autostatus on\|off` | Toggle auto status view |
| `.autoreact on\|off` | Toggle status reactions |
| `.antidelete on\|off` | Toggle anti-delete forwarding |
| `.ban @user` | Ban a user from the bot |
| `.unban @user` | Unban a user |

---

## 🖥️ Deployment

> ⚠️ **One session at a time.** REX-MD stores its WhatsApp session in MongoDB. Never run two deployments pointing at the same `MONGODB_URI` simultaneously — they will fight over the session, causing disconnects and potential session corruption.

---

### Option A — Railway (~$5/mo, recommended)

Smooth deploy experience with zero platform-specific config needed.

1. Push REX-MD to a GitHub repo (private is fine).
2. On Railway: **New Project → Deploy from GitHub repo** → select your repo.
3. Railway detects Node.js via the `nixpacks.toml` in the repo root and runs `npm install` + `npm start`. ffmpeg and yt-dlp install automatically.
4. **Variables tab** → add every key from `.env.example`.
5. **Settings → Deploy** → confirm start command is `node index.js`.
6. No public domain needed — Baileys doesn't serve HTTP.

**Redeploy:** push a new commit, or click **Redeploy** in the Railway dashboard.

---

### Option B — KataBump (free, 24/7, requires 4-day renewal)

Best free option. Hosts any Node.js app with a `package.json` start script.

1. Create an account at [katabump.com](https://katabump.com) and create a new server on the **Free** plan.
2. In **control.katabump.com → Startup tab**, select the Node.js runtime.
3. Upload the project via the web file manager or SFTP — skip uploading `node_modules`.
4. Set all env vars from `.env.example` in the panel's Variables/Startup tab.
5. Confirm the start command is `npm start`, then boot the server.
6. **Set a calendar reminder every 4 days** — free-tier servers suspend if not renewed. Don't rely solely on their email/Discord notifications.

**Resource limits:** 308 MB RAM and 716 MB disk. Keep `MAX_DOWNLOAD_MB` at 20–25 (not 50) to stay within limits.

---

### Option C — GitHub Actions (free for public repos, backup only)

Free but imperfect. GitHub caps jobs at 6 hours. The workflow in `.github/workflows/keepalive.yml` works around this by self-triggering at the 5.5-hour mark. Expect a 1–3 minute reconnect gap each cycle.

**Setup steps:**

1. **Make the repo public** — private repos only get 2,000 free minutes/month, burned in ~2 days running continuously.
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

4. **Pair your number locally first** — pairing code requires an interactive terminal that GitHub Actions doesn't have. Run `node index.js` locally, complete pairing, then stop the local bot. The session is now in MongoDB and will be picked up automatically.
5. Trigger the workflow: **Actions → REX-MD Keep-Alive Runner → Run workflow**.

**Redeploy:** push a commit, or manually run the workflow.

---

### Option D — VPS with pm2 (local or self-hosted)

```bash
# Install pm2 globally
npm install -g pm2

# Start the bot
pm2 start ecosystem.config.js

# Auto-restart on system reboot
pm2 startup
pm2 save

# Useful commands
pm2 logs rex-md           # Live logs
pm2 restart rex-md        # Restart
pm2 stop rex-md           # Stop
pm2 logs rex-md --lines 100
tail -f logs/rex-err.log  # Error log
```

---

## 🔐 Where Secrets Go, Per Platform

| Platform | Secret storage location |
|---|---|
| Railway | Project → **Variables** tab |
| KataBump | control.katabump.com → server → **Variables/Startup** tab |
| GitHub Actions | Repo → **Settings → Secrets and variables → Actions** |
| VPS / Local | `.env` file (never commit this file) |

---

## 📁 Project Structure

```
REX-MD/
├── index.js                    # Entry point
├── ecosystem.config.js         # pm2 config
├── nixpacks.toml               # Railway build config
├── .github/workflows/
│   └── keepalive.yml           # GitHub Actions self-restarting runner
├── config/
│   └── config.js               # Environment config loader with validation
├── core/
│   ├── connection.js           # WhatsApp socket + pairing + reconnect logic
│   ├── commandHandler.js       # Message parsing, routing, cooldowns
│   └── eventHandler.js        # Status, anti-delete, anti-link, group events
├── commands/                   # One file per command (auto-loaded)
├── features/
│   ├── ai/                     # Gemini + Groq clients with fallback chain
│   ├── downloader/             # yt-dlp + platform detection
│   └── status/                 # Auto status viewer
├── database/
│   ├── mongoose.js             # Connection singleton
│   └── models/                 # User, ChatContext, Settings schemas
├── lib/
│   ├── binaries.js             # Resolves npm-bundled ffmpeg + yt-dlp paths
│   ├── logger.js               # pino logger
│   └── cooldown.js             # Per-user cooldown tracker
├── images/
│   └── menu_picture.jpeg       # Menu banner image
├── temp/                       # Gitignored: in-flight downloads
└── session/                    # Gitignored: local auth fallback
```

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `@whiskeysockets/baileys` | WhatsApp multi-device WebSocket client |
| `mongoose` | MongoDB ODM |
| `@google/generative-ai` | Gemini AI SDK |
| `groq-sdk` | Groq AI SDK (AI fallback) |
| `execa` | Run yt-dlp binary as a child process |
| `axios` | HTTP client for weather API |
| `pino` + `pino-pretty` | Structured logging |
| `dotenv` | Environment variable loading |
| `sharp` | Image processing |
| `qrcode-terminal` | QR code display fallback |
| `ffmpeg-static` | Bundled ffmpeg binary — no system install needed |
| `youtube-dl-exec` | Bundled yt-dlp binary — no system install needed |

---

## 🛡️ Notes on Usage

- REX-MD uses Baileys, which connects via WhatsApp's consumer protocol. Use a **secondary/dedicated number** rather than your primary — this is the standard precaution for any WhatsApp bot.
- The bot only responds to users who message it; it never sends unsolicited messages.
- Free AI tiers are shared across all users. The built-in cooldown and fallback chain are designed to make the shared quota stretch further.
- Download features are for personal and group use.

---

## 📄 License

MIT
