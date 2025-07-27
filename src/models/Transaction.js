const mongoose = require('mongoose');
const crypto = require('crypto-js');
const { validatePlayerId, validateUsdAmount, validateCurrency } = require('../utils/validators');

const transactionSchema = new mongoose.Schema({
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
  type: {
    type: String,
    required: true,
    enum: ['bet', 'cashout'],
  },
  priceAtTime: {
    type: Number,
    required: true,
    min: [0, 'Price at time cannot be negative'],
  },
  transactionHash: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

async function createTransaction(playerId, usdAmount, cryptoAmount, currency, type, priceAtTime) {
  validatePlayerId(playerId);
  validateUsdAmount(usdAmount);
  validateCurrency(currency);
  if (typeof cryptoAmount !== 'number' || cryptoAmount <= 0) {
    throw new Error('Crypto amount must be a positive number');
  }
  if (typeof type !== 'string' || !['bet', 'cashout'].includes(type)) {
    throw new Error('Type must be either "bet" or "cashout"');
  }
  if (typeof priceAtTime !== 'number' || priceAtTime <= 0) {
    throw new Error('Price at time must be a positive number');
  }
  const transaction = new Transaction({
    playerId,
    usdAmount,
    cryptoAmount,
    currency,
    type,
    priceAtTime,
    transactionHash: crypto.SHA256(`${playerId}-${Date.now()}`).toString(),
  });
  await transaction.save();
  return transaction;
}

module.exports = { Transaction, createTransaction };
