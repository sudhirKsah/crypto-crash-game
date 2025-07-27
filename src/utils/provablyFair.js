const crypto = require('crypto-js');

function generateCrashPoint(seed, roundId) {
  if (!seed || typeof seed !== 'string' || seed.trim().length === 0) {
    throw new Error('Seed must be a non-empty string');
  }
  if (typeof roundId !== 'number' || roundId < 1) {
    throw new Error('Round ID must be a positive number');
  }
  const hash = crypto.SHA256(seed + roundId).toString();
  const maxCrash = 100;
  const value = parseInt(hash.slice(0, 8), 16) % 10000;
  const crashPoint = Math.max(1, (value / 10000) * maxCrash);
  return parseFloat(crashPoint.toFixed(2));
}

module.exports = { generateCrashPoint };
