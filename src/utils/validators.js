function validatePlayerId(playerId) {
  if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
    throw new Error('Player ID must be a non-empty string');
  }
  if (playerId.length > 50) {
    throw new Error('Player ID must not exceed 50 characters');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(playerId)) {
    throw new Error('Player ID must contain only letters, numbers, underscores, or hyphens');
  }
}

function validateUsdAmount(usdAmount) {
  if (typeof usdAmount !== 'number' || usdAmount <= 0 || isNaN(usdAmount)) {
    throw new Error('USD amount must be a positive number');
  }
  if (usdAmount > 1000000) {
    throw new Error('USD amount must not exceed 1,000,000');
  }
}

function validateCurrency(currency) {
  if (!currency || !['btc', 'eth'].includes(currency.toLowerCase())) {
    throw new Error('Currency must be either "btc" or "eth"');
  }
}

module.exports = { validatePlayerId, validateUsdAmount, validateCurrency };
