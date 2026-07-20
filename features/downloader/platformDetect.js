'use strict';

/**
 * URL → platform name mapping.
 * Used purely for display messages like "Downloading from TikTok…"
 * Actual downloading is handled by yt-dlp, which supports all these and more.
 */
const PLATFORM_PATTERNS = [
  { name: 'YouTube', pattern: /(?:youtube\.com|youtu\.be)/i },
  { name: 'TikTok', pattern: /tiktok\.com/i },
  { name: 'Instagram', pattern: /instagram\.com/i },
  { name: 'Facebook', pattern: /(?:facebook\.com|fb\.watch|fb\.com)/i },
  { name: 'Twitter/X', pattern: /(?:twitter\.com|x\.com)/i },
  { name: 'SoundCloud', pattern: /soundcloud\.com/i },
  { name: 'Pinterest', pattern: /(?:pinterest\.com|pin\.it)/i },
  { name: 'Reddit', pattern: /reddit\.com/i },
  { name: 'Twitch', pattern: /twitch\.tv/i },
  { name: 'Vimeo', pattern: /vimeo\.com/i },
  { name: 'Dailymotion', pattern: /dailymotion\.com/i },
];

/**
 * Returns a human-readable platform name for a URL, or 'the web' as fallback.
 * @param {string} url
 * @returns {string}
 */
function detectPlatform(url) {
  for (const { name, pattern } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return name;
  }
  return 'the web';
}

/**
 * Returns true if the URL looks like a valid http/https link.
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { detectPlatform, isValidUrl };
