'use strict';

/**
 * lib/binaries.js — Resolves npm-bundled ffmpeg and yt-dlp binary paths.
 *
 * Using ffmpeg-static and youtube-dl-exec means no system-level ffmpeg or
 * yt-dlp installation is needed on any deployment platform. Both packages
 * ship their own compiled binaries and download them at npm install time.
 *
 * Usage:
 *   const { ffmpegPath, ytdlpPath } = require('./lib/binaries');
 *   // ffmpegPath  → absolute path to the bundled ffmpeg binary
 *   // ytdlpPath   → absolute path to the bundled yt-dlp binary
 */

const ffmpegPath = require('ffmpeg-static');

// youtube-dl-exec exposes the yt-dlp binary path via its getBinaryPath helper.
// Fallback to the known postinstall path if the helper is unavailable in older versions.
let ytdlpPath;
try {
  const { getBinaryPath } = require('youtube-dl-exec/src/utils');
  ytdlpPath = getBinaryPath();
} catch {
  // Fallback: youtube-dl-exec downloads yt-dlp to this well-known location
  const path = require('path');
  ytdlpPath = path.join(
    require.resolve('youtube-dl-exec/package.json'),
    '../',
    'bin/yt-dlp'
  );
}

if (!ffmpegPath) {
  throw new Error(
    '[binaries] ffmpeg-static did not resolve a binary path. ' +
    'Run `npm install` to ensure ffmpeg-static is properly installed.'
  );
}

module.exports = { ffmpegPath, ytdlpPath };
