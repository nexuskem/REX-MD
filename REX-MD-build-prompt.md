# REX-MD — Agent Build Prompt (Modern WhatsApp Assistant Bot)



## 1. Role & Mission

You are a senior Node.js backend engineer. Build **REX-MD**, a modern, production-ready WhatsApp assistant bot with four core capabilities:

1. Play/search YouTube songs on request
2. Download media from a link pasted from any of several platforms (YouTube, TikTok, Instagram, Facebook, X/Twitter, SoundCloud, Pinterest)
3. Solve problems and answer questions via a free AI model (text and photo input)
4. Automatically view contacts' WhatsApp Status updates

Every feature must work end-to-end: receive command → do the work → send the result back to the chat → clean up any temp files → handle failures with a clear, friendly error message. Treat this as shippable code, not a prototype.

---

## 2. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Runtime | Node.js ≥ 20 LTS | Required by the current major version of Baileys |
| WhatsApp connection | `baileys` (npm package, formerly published as `@whiskeysockets/baileys`) | WebSocket-based multi-device client — no Chromium/Selenium, ~500MB lighter than browser-based libraries |
| Session/auth storage | MongoDB, via a Mongo auth-state adapter (`baileys-auth-states`'s `useMongoAuthState`, or `mongo-baileys`) | Keeps the bot logged in across restarts/redeploys — no re-scanning a pairing code every time the process restarts |
| App database | MongoDB via Mongoose | Reuses the same cluster REX-MD already runs on |
| Primary AI | Google Gemini API (`@google/generative-ai`) | Free tier, multimodal — handles both text questions and photographed problems |
| Fallback AI | Groq API (`groq-sdk`, OpenAI-compatible endpoint) | Fast inference, generous free tier, absorbs traffic when Gemini's quota is hit |
| Universal downloader engine | `yt-dlp` binary, invoked via `child_process`/`execa` | Actively maintained, covers 1,700+ sites in one dependency instead of stitching together a separate library per platform |
| Audio/video processing | `ffmpeg` | Format conversion, audio extraction for `.play` |
| Process manager | `pm2` | Keeps the persistent socket connection alive, auto-restarts on crash |
| Logging | `pino` | Structured, leveled logs |
| Config | `dotenv` | Environment-based configuration, nothing hardcoded |

**Note on AI model names:** Google and Groq both rotate their free-tier model lineup every few months. Don't hardcode a single model string deep in the logic — read it from an environment variable (`GEMINI_MODEL_PRIMARY`, etc., see §7) so REX can update it in one place as models change. At implementation time, check Google AI Studio's current free-tier model list and set the default to whichever "Flash-Lite" or equivalent lightweight tier model has the highest free daily request cap — that's the one that will hold up best under real usage from a group of people, not just one user.

---

## 3. Folder Structure

```
REX-MD/
├── index.js                     # entry point — boots DB, then WA connection
├── package.json
├── .env.example
├── ecosystem.config.js          # pm2 process config
├── README.md
├── /config
│   └── config.js                # loads & validates env vars, exports single config object
├── /core
│   ├── connection.js            # makeWASocket, pairing/QR auth, reconnect logic
│   ├── commandHandler.js        # parses incoming messages, routes to /commands
│   └── eventHandler.js          # status@broadcast, group-participants-update, etc.
├── /commands
│   ├── play.js
│   ├── video.js
│   ├── download.js              # .dl
│   ├── ai.js
│   ├── solve.js                 # image-based problem solving
│   ├── newchat.js               # reset AI context
│   ├── menu.js                  # auto-generated help/command list
│   ├── ping.js
│   └── settings.js              # owner-only runtime config (prefix, toggles)
├── /features
│   ├── ai/
│   │   ├── gemini.js            # Gemini client + fallback chain entry point
│   │   └── groq.js              # Groq client
│   ├── downloader/
│   │   ├── ytdlp.js             # wraps yt-dlp exec calls, format/size selection
│   │   └── platformDetect.js    # URL → platform regex matcher
│   └── status/
│       └── autoView.js          # status@broadcast auto-read logic
├── /database
│   ├── mongoose.js              # connection singleton
│   └── models/
│       ├── User.js
│       ├── ChatContext.js       # rolling AI conversation history per chat
│       └── Settings.js          # runtime-configurable bot settings
├── /lib
│   ├── logger.js                # pino instance
│   └── cooldown.js              # per-user command cooldown / anti-spam
├── /temp                        # gitignored scratch space for in-flight downloads
└── /session                     # gitignored — only used if Mongo auth isn't wired up yet
```

Each file in `/commands` exports a single object: `{ name, aliases: [], description, category, ownerOnly: boolean, execute(sock, msg, args, context) }`. `commandHandler.js` auto-loads every file in `/commands` at boot — adding a new command should never require touching the handler itself.

---

## 4. Core Features (must-have)

### 4.1 Connection & Session Management
- Use `baileys`'s `makeWASocket`, authenticated via the Mongo-backed auth state adapter pointed at the existing MongoDB URI (collection e.g. `wa_sessions`).
- Support **pairing code** login as the default flow (`USE_PAIRING_CODE=true` — user enters their phone number, gets an 8-character code to type into WhatsApp, no QR scanning needed). Fall back to printing a QR code in the terminal if pairing code is disabled or fails.
- On `connection.update`, handle reconnection automatically for any `DisconnectReason` except `loggedOut` — a logged-out session must prompt for re-pairing, not loop-retry forever.
- Recognize `OWNER_NUMBER` from env for admin/owner-only commands (settings, broadcast, restart).

### 4.2 Command Handling Framework
- Prefix is configurable (`PREFIX` env var, default `.`), and can also be changed at runtime by the owner via `.setprefix <char>` (persisted in the `Settings` collection so it survives restarts).
- Route incoming text messages: strip prefix, match command name or alias, execute.
- Apply a per-user cooldown (default 2s, `COMMAND_COOLDOWN_MS`) before dispatching — this both prevents accidental spam-triggering behavior on WhatsApp's side and protects the shared free AI quota from one user burning through it.
- `.menu` / `.help` is generated automatically from the loaded command list, grouped by `category`.

### 4.3 YouTube Music & Video — `.play`, `.video`
- `.play <song name or artist>` — search YouTube via yt-dlp's search extractor (`ytsearch1:<query>`), download best available audio, convert to MP3 with ffmpeg, send as a regular audio attachment (not a voice note/PTT bubble) with a caption showing title and duration.
- `.video <song name, artist, or a direct URL>` — same flow but keeps video, selecting a format under the size ceiling (see below) rather than always grabbing the largest file.
- Before sending, check the resulting file size against `MAX_DOWNLOAD_MB` (env, default 50). If a file would exceed it, re-request a lower-quality format from yt-dlp rather than sending a broken/oversized file; if still too large, reply explaining that and suggest a shorter clip or audio-only.
- Delete the temp file from `/temp` immediately after a successful send (and on failure).

### 4.4 Universal Media Downloader — `.dl <url>`
- One command that accepts a link from any supported platform (YouTube, TikTok, Instagram — reels/posts, Facebook, X/Twitter, SoundCloud, Pinterest) and downloads it via yt-dlp, which handles the platform differences internally.
- `platformDetect.js` matches the URL against known domain patterns purely to give a nicer "Downloading from TikTok…" status message — the actual extraction is left to yt-dlp itself rather than hand-rolling per-platform scrapers.
- Optional flag: `.dl <url> audio` forces audio-only extraction where the source has separable audio (useful for e.g. a TikTok/Instagram clip's audio track).
- If yt-dlp returns an error (private content, geo-restricted, unsupported URL, login-walled page), catch it and reply with a plain-language reason instead of a raw stack trace.
- Same size-check-and-clean-up behavior as §4.3.

### 4.5 AI Problem-Solving Assistant — `.ai`, `.solve`
- `.ai <question>` — general Q&A / problem solving (schoolwork, coding questions, general knowledge). Also trigger on a direct reply to one of the bot's own AI messages, so multi-turn conversation feels natural without retyping the command.
- `.solve` — attach to a photo (send an image with caption `.solve`, or reply `.solve` to an image already in the chat) for photographed problems — math, physics, diagrams, handwritten questions. Use Gemini's multimodal input to read the image directly rather than trying to OCR it separately.
- Maintain a short rolling conversation history per chat in the `ChatContext` collection (last ~6 exchanges) so follow-up questions have context. `.newchat` clears it.
- **Fallback chain**, since free-tier AI quotas are tight and shared across everyone using the bot:
  1. Try `GEMINI_MODEL_PRIMARY`.
  2. On a 429/rate-limit error, retry once with `GEMINI_MODEL_FALLBACK` (a slightly heavier/different Gemini model).
  3. If Gemini is still unavailable, fall back to Groq (`GROQ_MODEL`).
  4. If every provider fails, send a short, honest "AI's a bit overloaded right now, try again in a minute" — never a raw error dump.
- Implement this as a small `resolveAIResponse(prompt, imageBase64?)` function in `features/ai/gemini.js` that commands call, rather than duplicating fallback logic in every command file.

### 4.6 Auto Status View
- On `messages.upsert`, detect messages from the `status@broadcast` JID and call `sock.readMessages()` on them — this automates exactly the action of opening each contact's status, nothing more.
- Toggle via `AUTO_STATUS_VIEW` env var (default `true`), overridable at runtime by the owner via `.autostatus on|off`.
- Optional companion toggle `AUTO_STATUS_REACT` — leaves a low-key emoji reaction on viewed statuses.

---

## 5. Suggested Bonus Features (optional — nice modern touches, keep each one independently toggleable so they're easy to leave out)

- `.sticker` — convert a sent image/short video into a WhatsApp sticker (webp) via ffmpeg.
- Anti-delete — if someone deletes a message in a chat the bot is in, resend it to the owner's DM (store recent messages briefly in memory/Mongo with a short TTL for this).
- Group tools — `.tagall`, `.promote`, `.demote`, `.antilink` (auto-remove non-whitelisted invite links from a group).
- `.tr <lang-code> <text>` — quick translation via the same AI provider.
- `.weather <city>` — simple free weather API lookup.
- `.owner` / `.report` — sends the owner's contact card or logs a bug report.

Skip any of these if you're prioritizing polish on the four core features over breadth — better to have four things working perfectly than ten things half-working.

---

## 6. Database Schema (MongoDB / Mongoose)

**`users`**
```js
{
  jid: String,          // unique WhatsApp ID
  name: String,
  isOwner: Boolean,
  isBanned: Boolean,
  preferredQuality: { type: String, default: "audio" }, // for .play/.video defaults
  createdAt: Date
}
```

**`chatcontexts`** (rolling AI memory, capped and TTL-expired so it doesn't grow forever)
```js
{
  jid: String,
  messages: [{ role: String, content: String, timestamp: Date }], // capped at ~6 entries
  updatedAt: { type: Date, expires: "24h" } // TTL index
}
```

**`settings`** (runtime-configurable, singleton-per-bot document)
```js
{
  prefix: String,
  autoStatusView: Boolean,
  autoStatusReact: Boolean,
  maxDownloadMb: Number
}
```

Session/auth credentials are handled separately by the Mongo auth-state adapter (§2) — don't reinvent that storage format.

---

## 7. Environment Variables (`.env.example`)

```env
# --- WhatsApp ---
SESSION_ID=REX-MD
OWNER_NUMBER=2547XXXXXXXX
USE_PAIRING_CODE=true
PREFIX=.
BOT_NAME=REX-MD

# --- MongoDB ---
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/rexmd

# --- AI: Gemini (primary) ---
GEMINI_API_KEY=
GEMINI_MODEL_PRIMARY=gemini-2.5-flash-lite
GEMINI_MODEL_FALLBACK=gemini-2.5-flash

# --- AI: Groq (fallback) ---
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# --- Downloads ---
MAX_DOWNLOAD_MB=50

# --- Status ---
AUTO_STATUS_VIEW=true
AUTO_STATUS_REACT=false

# --- Anti-spam ---
COMMAND_COOLDOWN_MS=2000
```

---

## 8. Deployment

Baileys holds a persistent WebSocket connection, so this needs an **always-on process**, not a request-driven serverless platform that spins down when idle.

- **Recommended:** a small VPS (1 vCPU / 1–2GB RAM is plenty) running the bot under `pm2` (`pm2 start ecosystem.config.js`), with `ffmpeg` and `yt-dlp` installed as system dependencies (`apt install ffmpeg` + yt-dlp's official install script).
- **Alternative:** a Node-friendly always-on host/panel, deployed as a background worker rather than a web service (there's no HTTP server to bind to unless you add a tiny health-check endpoint, which some platforms require to consider the app "alive").
- Because session credentials live in MongoDB (§2), redeploying or restarting the process does **not** require re-pairing — the bot reconnects using the stored session automatically. This matters most on hosts with an ephemeral filesystem.
- Document exact install steps for `ffmpeg` and `yt-dlp` in the README as deployment prerequisites — a missing binary is the single most common reason these bots fail right after deploy.

---

## 9. Error Handling & Reliability Requirements

- Wrap every external call (Baileys send, yt-dlp exec, AI API call, Mongo query) in try/catch, and reply to the user with a short, clear message on failure — never let a raw stack trace reach the chat.
- Log errors with `pino` at the appropriate level; don't `console.log` scattered throughout.
- Clean up `/temp` files after every download attempt, success or failure (use a `finally` block).
- Cooldown/anti-spam (§4.2) is a reliability feature as much as a courtesy one — it keeps message-sending patterns closer to human-paced, which is the main practical driver of automation-related account flags (see §11), and it protects the shared AI quota.

---

## 10. Definition of Done

- [ ] All files in the folder structure (§3) exist with complete, working implementations — no `TODO`, no stub `execute()` bodies.
- [ ] `.play`, `.video`, `.dl`, `.ai`, `.solve`, and auto status view all work end-to-end against a real WhatsApp account.
- [ ] `package.json` lists every dependency actually used, with install scripts documented in the README.
- [ ] `.env.example` is complete and matches every variable actually read by the code.
- [ ] README covers: prerequisites (Node 20+, ffmpeg, yt-dlp, a MongoDB URI), install steps, first-run pairing flow, full command reference table, and deployment instructions.
- [ ] Every command has graceful error handling and respects the cooldown.
- [ ] No secrets committed — `.env` is gitignored, only `.env.example` is tracked.

---

## 11. Practical Notes

- Libraries like Baileys connect through WhatsApp's consumer protocol rather than the official Business API, which is technically outside WhatsApp's terms of service — Baileys' own documentation is upfront about this and discourages bulk, automated, or stalkerware-style use. In practice, ban risk tracks *behavior* far more than the connection method itself: bots that only respond to people already messaging them (which is what REX-MD does) see much lower ban rates than bots that proactively blast messages to people who haven't opted in. Using a secondary number rather than a primary personal/business one is the standard low-effort precaution.
- The downloader features are for personal/group use, not redistribution — same spirit as any personal media tool.
- Free AI tiers (Gemini + Groq combined) are quota-limited and shared across everyone who messages the bot. The fallback chain and per-user cooldown in this spec exist specifically to stretch that shared quota further — don't remove them for the sake of "simpler" code.
