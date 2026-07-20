'use strict';

/**
 * Per-user command cooldown tracker.
 * Uses an in-memory Map — intentionally lightweight.
 * On bot restart the cooldowns reset, which is fine.
 */

const cooldowns = new Map();

/**
 * Returns true if the user is still within the cooldown window.
 * @param {string} jid - WhatsApp JID of the user
 * @param {number} cooldownMs - Cooldown window in milliseconds
 */
function isOnCooldown(jid, cooldownMs) {
  if (!cooldowns.has(jid)) return false;
  const lastUsed = cooldowns.get(jid);
  return Date.now() - lastUsed < cooldownMs;
}

/**
 * Records the current timestamp as the last-used time for a JID.
 * Call this immediately before dispatching a command.
 * @param {string} jid
 */
function setCooldown(jid) {
  cooldowns.set(jid, Date.now());
}

/**
 * Returns the remaining cooldown time in seconds (rounded up), or 0.
 * @param {string} jid
 * @param {number} cooldownMs
 */
function getRemainingCooldown(jid, cooldownMs) {
  if (!cooldowns.has(jid)) return 0;
  const elapsed = Date.now() - cooldowns.get(jid);
  const remaining = cooldownMs - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Clears cooldown for a specific user (e.g. for owner bypass).
 * @param {string} jid
 */
function clearCooldown(jid) {
  cooldowns.delete(jid);
}

module.exports = { isOnCooldown, setCooldown, getRemainingCooldown, clearCooldown };
