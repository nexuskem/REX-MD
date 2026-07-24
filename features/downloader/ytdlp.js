'use strict';

const path = require('path');
const fs = require('fs');
const { execa } = require('execa');
const config = require('../../config/config');
const logger = require('../../lib/logger');
const { ffmpegPath, ytdlpPath } = require('../../lib/binaries');

const TEMP_DIR = path.resolve(__dirname, '../../temp');

// Ensure temp directory exists at module load
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Generates a unique temp file path.
 * @param {string} extension - e.g. 'mp3', 'mp4'
 */
function tempPath(extension) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return path.join(TEMP_DIR, `${id}.${extension}`);
}

/**
 * Safely deletes a file, logging a warning if it fails.
 * @param {string} filePath
 */
function cleanUp(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug(`[ytdlp] Cleaned up ${path.basename(filePath)}`);
    }
  } catch (err) {
    logger.warn({ err }, `[ytdlp] Failed to clean up ${filePath}`);
  }
}

/**
 * Returns the file size in MB, or 0 if the file doesn't exist.
 * @param {string} filePath
 */
function fileSizeMb(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / (1024 * 1024);
  } catch {
    return 0;
  }
}

/**
 * Parses a yt-dlp error output into a friendly message.
 * @param {string} stderr
 */
function parseDlpError(stderr = '') {
  if (stderr.includes('Private video') || stderr.includes('private')) {
    return 'That content is private and cannot be downloaded.';
  }
  if (stderr.includes('This video is not available') || stderr.includes('unavailable')) {
    return 'That content is unavailable (removed or region-restricted).';
  }
  if (stderr.includes('Sign in') || stderr.includes('login')) {
    return 'That content requires a login and cannot be downloaded.';
  }
  if (stderr.includes('No video formats found') || stderr.includes('Unsupported URL')) {
    return 'That URL is not supported or no downloadable content was found.';
  }
  if (stderr.includes('HTTP Error 429')) {
    return 'YouTube rate-limited the download request. Please try again in a few minutes.';
  }
  return 'Download failed. The content may be unavailable, geo-restricted, or unsupported.';
}

/**
 * Base yt-dlp args shared by all download functions.
 * --ffmpeg-location points to the npm-bundled ffmpeg binary so no system
 * install is needed on Railway, KataBump, GitHub Actions, etc.
 */
function baseArgs() {
  return ['--ffmpeg-location', ffmpegPath];
}

/**
 * Downloads audio from a YouTube search query or URL.
 * Converts to MP3 via the bundled ffmpeg.
 *
 * @param {string} query - Search term or YouTube URL
 * @returns {Promise<{filePath: string, title: string, duration: string, thumbnail: string|null}>}
 */
async function downloadAudio(query) {
  const isUrl = query.startsWith('http://') || query.startsWith('https://');
  const source = isUrl ? query : `ytsearch1:${query}`;
  const outputPath = tempPath('mp3');

  // yt-dlp output template without extension — ffmpeg will set it
  const outputTemplate = outputPath.replace('.mp3', '.%(ext)s');

  logger.info(`[ytdlp] Downloading audio: ${query}`);

  let metadata = null;

  try {
    // First, get metadata
    const metaResult = await execa(ytdlpPath, [
      ...baseArgs(),
      '--dump-json',
      '--no-playlist',
      source,
    ]);
    metadata = JSON.parse(metaResult.stdout.split('\n').find((l) => l.trim().startsWith('{')));
  } catch {
    // Metadata fetch is best-effort; continue without it
  }

  try {
    await execa(ytdlpPath, [
      ...baseArgs(),
      '--no-playlist',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '5', // 128kbps equivalent, good balance of quality/size
      '--output', outputTemplate,
      '--no-warnings',
      source,
    ]);
  } catch (err) {
    throw new Error(parseDlpError(err.stderr || ''));
  }

  // yt-dlp may produce a file with a different path structure; find the mp3
  const actualPath = fs.existsSync(outputPath) ? outputPath : null;
  if (!actualPath) {
    // Search temp dir for the most recently created mp3
    const files = fs.readdirSync(TEMP_DIR)
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => ({ name: f, time: fs.statSync(path.join(TEMP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    if (!files.length) throw new Error('Download completed but output file not found.');
    const foundPath = path.join(TEMP_DIR, files[0].name);

    const sizeMb = fileSizeMb(foundPath);
    if (sizeMb > config.maxDownloadMb) {
      cleanUp(foundPath);
      throw new Error(`File is too large (${sizeMb.toFixed(1)} MB). Maximum allowed is ${config.maxDownloadMb} MB.`);
    }

    return {
      filePath: foundPath,
      title: metadata?.title || 'Unknown Title',
      duration: formatDuration(metadata?.duration || 0),
      thumbnail: metadata?.thumbnail || null,
    };
  }

  const sizeMb = fileSizeMb(actualPath);
  if (sizeMb > config.maxDownloadMb) {
    cleanUp(actualPath);
    throw new Error(`File is too large (${sizeMb.toFixed(1)} MB). Maximum allowed is ${config.maxDownloadMb} MB.`);
  }

  return {
    filePath: actualPath,
    title: metadata?.title || 'Unknown Title',
    duration: formatDuration(metadata?.duration || 0),
    thumbnail: metadata?.thumbnail || null,
  };
}

/**
 * Downloads a video from a YouTube search query or URL.
 * Selects a format under the MAX_DOWNLOAD_MB size ceiling.
 *
 * @param {string} query - Search term or URL
 * @returns {Promise<{filePath: string, title: string, duration: string}>}
 */
async function downloadVideo(query) {
  const isUrl = query.startsWith('http://') || query.startsWith('https://');
  const source = isUrl ? query : `ytsearch1:${query}`;
  const outputPath = tempPath('mp4');
  const outputTemplate = outputPath.replace('.mp4', '.%(ext)s');
  const maxBytes = config.maxDownloadMb * 1024 * 1024;

  logger.info(`[ytdlp] Downloading video: ${query}`);

  let metadata = null;
  try {
    const metaResult = await execa(ytdlpPath, [
      ...baseArgs(),
      '--dump-json',
      '--no-playlist',
      source,
    ]);
    metadata = JSON.parse(metaResult.stdout.split('\n').find((l) => l.trim().startsWith('{')));
  } catch {
    // continue without metadata
  }

  // Format selection: best video+audio combo under size limit, merged to mp4
  const formatSelector = `bestvideo[filesize<${maxBytes}]+bestaudio[filesize<${maxBytes}]/best[filesize<${maxBytes}]/bestvideo+bestaudio/best`;

  try {
    await execa(ytdlpPath, [
      ...baseArgs(),
      '--no-playlist',
      '--format', formatSelector,
      '--merge-output-format', 'mp4',
      '--output', outputTemplate,
      '--no-warnings',
      source,
    ]);
  } catch (err) {
    throw new Error(parseDlpError(err.stderr || ''));
  }

  // Find the output file
  const files = fs.readdirSync(TEMP_DIR)
    .filter((f) => f.endsWith('.mp4'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(TEMP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (!files.length) throw new Error('Download completed but output file not found.');

  const foundPath = path.join(TEMP_DIR, files[0].name);
  const sizeMb = fileSizeMb(foundPath);

  if (sizeMb > config.maxDownloadMb) {
    cleanUp(foundPath);
    throw new Error(
      `Even the lowest quality version is too large (${sizeMb.toFixed(1)} MB). ` +
      `Try \`.play ${query}\` to get audio-only instead.`
    );
  }

  return {
    filePath: foundPath,
    title: metadata?.title || 'Unknown Title',
    duration: formatDuration(metadata?.duration || 0),
  };
}

/**
 * Downloads media from any supported URL (universal downloader for .dl command).
 *
 * @param {string} url - Direct link to media
 * @param {boolean} [audioOnly=false] - Force audio-only extraction
 * @returns {Promise<{filePath: string, title: string, ext: string}>}
 */
async function downloadMedia(url, audioOnly = false) {
  logger.info(`[ytdlp] Downloading media: ${url} (audioOnly=${audioOnly})`);

  const maxBytes = config.maxDownloadMb * 1024 * 1024;

  const args = [
    ...baseArgs(),
    '--no-playlist',
    '--output', path.join(TEMP_DIR, '%(id)s.%(ext)s'),
    '--no-warnings',
    '--print', 'after_move:filepath', // prints the final output path
  ];

  if (audioOnly) {
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '5');
  } else {
    args.push(
      '--format', `bestvideo[filesize<${maxBytes}]+bestaudio[filesize<${maxBytes}]/best[filesize<${maxBytes}]/best`,
      '--merge-output-format', 'mp4'
    );
  }

  args.push(url);

  let result;
  try {
    result = await execa(ytdlpPath, args);
  } catch (err) {
    throw new Error(parseDlpError(err.stderr || ''));
  }

  // Use the printed filepath from --print after_move:filepath
  const printedPath = result.stdout.trim().split('\n').pop();
  const filePath = printedPath && fs.existsSync(printedPath) ? printedPath : null;

  if (!filePath) {
    throw new Error('Download completed but could not locate the output file.');
  }

  const sizeMb = fileSizeMb(filePath);
  if (sizeMb > config.maxDownloadMb) {
    cleanUp(filePath);
    throw new Error(
      `File is too large (${sizeMb.toFixed(1)} MB, max ${config.maxDownloadMb} MB). ` +
      `Try adding \`audio\` flag: \`.dl ${url} audio\``
    );
  }

  const ext = path.extname(filePath).replace('.', '') || 'bin';
  return { filePath, title: path.basename(filePath, path.extname(filePath)), ext };
}

/**
 * Formats a duration in seconds to MM:SS or HH:MM:SS.
 * @param {number} seconds
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '?:??';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = { downloadAudio, downloadVideo, downloadMedia, cleanUp, tempPath };
