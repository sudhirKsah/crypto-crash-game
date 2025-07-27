const mongoose = require('mongoose');
const crypto = require('crypto-js');
const { createGameRound, addBet, addCashout, endRound } = require('../models/GameRound');
const { createPlayer, getPlayer, updatePlayerBalance } = require('../models/Player');
const { createTransaction } = require('../models/Transaction');
const { generateCrashPoint } = require('../utils/provablyFair');
const { fetchCryptoPrice, usdToCrypto, cryptoToUsd } = require('./cryptoService');
const { validatePlayerId, validateUsdAmount, validateCurrency } = require('../utils/validators');

let currentRound = null;
let multiplier = 1;
let roundId = null;

async function initializeRoundId() {
  const lastRound = await GameRound.findOne().sort({ roundId: -1 });
  roundId = lastRound ? lastRound.roundId + 1 : 1;
}

function startGameRound(io) {
  const seed = Math.random().toString(36).substring(2);
  const hash = crypto.SHA256(seed + roundId).toString();
  const crashPoint = generateCrashPoint(seed, roundId);

  currentRound = { roundId, crashPoint, seed, hash, bets: [], cashouts: [], status: 'pending' };
  createGameRound(roundId, crashPoint, seed, hash);

  multiplier = 1;
  io.emit('roundStart', { roundId, seed, hash });

  const startTime = Date.now();
  const growthFactor = 0.1;

  const multiplierInterval = setInterval(() => {
    if (!currentRound) {
      clearInterval(multiplierInterval);
      return;
    }
    multiplier = 1 + ((Date.now() - startTime) / 1000) * growthFactor;
    io.emit('multiplierUpdate', { roundId, multiplier: parseFloat(multiplier.toFixed(2)) });

    if (multiplier >= crashPoint) {
      currentRound.status = 'crashed';
      endRound(roundId, crashPoint);
      io.emit('roundCrash', { roundId, crashPoint });
      clearInterval(multiplierInterval);
      currentRound = null;
      setTimeout(() => {
        roundId++;
        startGameRound(io);
      }, 10000);
    }
  }, 100);
}

async function placeBet(playerId, usdAmount, currency) {
  validatePlayerId(playerId);
  validateUsdAmount(usdAmount);
  validateCurrency(currency);

  if (!currentRound || currentRound.status !== 'pending') {
    throw new Error('No active round or betting closed');
  }

  if (currentRound.bets.some(b => b.playerId === playerId)) {
    throw new Error('Player has already placed a bet in this round');
  }

  const price = await fetchCryptoPrice(currency);
  if (!price) {
    throw new Error('Failed to fetch crypto price');
  }

  const cryptoAmount = usdToCrypto(usdAmount, price);
  let player = await getPlayer(playerId);
  if (!player) {
    player = await createPlayer(playerId);
  }
  if (player.balance[currency] < cryptoAmount) {
    throw new Error('Insufficient balance');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updatedRound = await addBet(currentRound.roundId, {
        playerId,
        usdAmount,
        cryptoAmount,
        currency,
        priceAtTime: price,
      });
      if (!updatedRound) {
        throw new Error('Player has already placed a bet in this round');
      }
      await updatePlayerBalance(playerId, currency, -cryptoAmount);
      currentRound.bets.push({ playerId, usdAmount, cryptoAmount, currency, priceAtTime: price });
      await createTransaction(playerId, usdAmount, cryptoAmount, currency, 'bet', price);
    });
    return { bet: { playerId, usdAmount, cryptoAmount, currency, priceAtTime: price }, multiplier };
  } finally {
    session.endSession();
  }
}

async function cashout(playerId) {
  validatePlayerId(playerId);

  if (!currentRound || currentRound.status === 'crashed') {
    throw new Error('Round has crashed or no active round');
  }

  const bet = currentRound.bets.find(b => b.playerId === playerId);
  if (!bet) {
    throw new Error('No bet placed in this round');
  }

  if (currentRound.cashouts.some(c => c.playerId === playerId)) {
    throw new Error('Player has already cashed out in this round');
  }

  const price = await fetchCryptoPrice(bet.currency);
  const cryptoPayout = bet.cryptoAmount * multiplier;
  const usdPayout = cryptoToUsd(cryptoPayout, price);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updatedRound = await addCashout(currentRound.roundId, {
        playerId,
        multiplier,
        cryptoPayout,
        usdPayout,
      });
      if (!updatedRound) {
        throw new Error('Player has already cashed out in this round');
      }
      await updatePlayerBalance(playerId, bet.currency, cryptoPayout);
      currentRound.cashouts.push({ playerId, multiplier, cryptoPayout, usdPayout });
      await createTransaction(playerId, usdPayout, cryptoPayout, bet.currency, 'cashout', price);
    });
    return { playerId, multiplier, cryptoPayout, usdPayout };
  } finally {
    session.endSession();
  }
}

module.exports = { startGameRound, placeBet, cashout, initializeRoundId };
