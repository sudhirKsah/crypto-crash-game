const mongoose = require('mongoose');
const { validatePlayerId, validateUsdAmount, validateCurrency } = require('../utils/validators');

const gameRoundSchema = new mongoose.Schema({
  roundId: {
    type: Number,
    required: true,
    unique: true,
    min: [1, 'Round ID must be positive'],
  },
  crashPoint: {
    type: Number,
    required: true,
    min: [1, 'Crash point must be at least 1'],
  },
  seed: {
    type: String,
    required: true,
    trim: true,
  },
  hash: {
    type: String,
    required: true,
    trim: true,
  },
  bets: [{
    playerId: {
      type: String,
      required: true,
      validate: {
        validator: validatePlayerId,
        message: props => props.reason.message,
      },
    },
    usdAmount: {
      type: Number,
      required: true,
      validate: {
        validator: validateUsdAmount,
        message: props => props.reason.message,
      },
    },
    cryptoAmount: {
      type: Number,
      required: true,
      min: [0, 'Crypto amount cannot be negative'],
    },
    currency: {
      type: String,
      required: true,
      validate: {
        validator: validateCurrency,
        message: props => props.reason.message,
      },
    },
    priceAtTime: {
      type: Number,
      required: true,
      min: [0, 'Price at time cannot be negative'],
    },
  }],
  cashouts: [{
    playerId: {
      type: String,
      required: true,
      validate: {
        validator: validatePlayerId,
        message: props => props.reason.message,
      },
    },
    multiplier: {
      type: Number,
      required: true,
      min: [1, 'Multiplier must be at least 1'],
    },
    cryptoPayout: {
      type: Number,
      required: true,
      min: [0, 'Crypto payout cannot be negative'],
    },
    usdPayout: {
      type: Number,
      required: true,
      min: [0, 'USD payout cannot be negative'],
    },
  }],
  status: {
    type: String,
    enum: ['pending', 'crashed'],
    default: 'pending',
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: null,
  },
});

// Ensure only one bet per playerId per round
gameRoundSchema.index({ roundId: 1, 'bets.playerId': 1 }, { unique: true });

// Ensure only one cashout per playerId per round
gameRoundSchema.index({ roundId: 1, 'cashouts.playerId': 1 }, { unique: true });

const GameRound = mongoose.model('GameRound', gameRoundSchema);

async function createGameRound(roundId, crashPoint, seed, hash) {
  if (typeof roundId !== 'number' || roundId < 1) {
    throw new Error('Round ID must be a positive number');
  }
  if (typeof crashPoint !== 'number' || crashPoint < 1) {
    throw new Error('Crash point must be at least 1');
  }
  if (!seed || typeof seed !== 'string' || seed.trim().length === 0) {
    throw new Error('Seed must be a non-empty string');
  }
  if (!hash || typeof hash !== 'string' || hash.trim().length === 0) {
    throw new Error('Hash must be a non-empty string');
  }
  const round = new GameRound({ roundId, crashPoint, seed, hash });
  await round.save();
  return round;
}

async function addBet(roundId, bet) {
  validatePlayerId(bet.playerId);
  validateUsdAmount(bet.usdAmount);
  validateCurrency(bet.currency);
  if (typeof bet.cryptoAmount !== 'number' || bet.cryptoAmount <= 0) {
    throw new Error('Crypto amount must be a positive number');
  }
  if (typeof bet.priceAtTime !== 'number' || bet.priceAtTime <= 0) {
    throw new Error('Price at time must be a positive number');
  }
  return GameRound.findOneAndUpdate(
    { roundId, 'bets.playerId': { $ne: bet.playerId } },
    { $push: { bets: bet } },
    { new: true, runValidators: true }
  );
}

async function addCashout(roundId, cashout) {
  validatePlayerId(cashout.playerId);
  if (typeof cashout.multiplier !== 'number' || cashout.multiplier < 1) {
    throw new Error('Multiplier must be at least 1');
  }
  if (typeof cashout.cryptoPayout !== 'number' || cashout.cryptoPayout < 0) {
    throw new Error('Crypto payout cannot be negative');
  }
  if (typeof cashout.usdPayout !== 'number' || cashout.usdPayout < 0) {
    throw new Error('USD payout cannot be negative');
  }
  return GameRound.findOneAndUpdate(
    { roundId, 'cashouts.playerId': { $ne: cashout.playerId } },
    { $push: { cashouts: cashout } },
    { new: true, runValidators: true }
  );
}

async function endRound(roundId, crashPoint) {
  if (typeof roundId !== 'number' || roundId < 1) {
    throw new Error('Round ID must be a positive number');
  }
  if (typeof crashPoint !== 'number' || crashPoint < 1) {
    throw new Error('Crash point must be at least 1');
  }
  return GameRound.findOneAndUpdate(
    { roundId },
    { $set: { status: 'crashed', crashPoint, endTime: new Date() } },
    { new: true, runValidators: true }
  );
}

module.exports = { GameRound, createGameRound, addBet, addCashout, endRound };
