const mongoose = require('mongoose');
const { validatePlayerId } = require('../utils/validators');

const playerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: (value) => {
        try {
          validatePlayerId(value);
          return true;
        } catch (error) {
          throw error;
        }
      },
      message: props => props.reason.message,
    },
  },
  balance: {
    btc: { type: Number, default: 0, min: [0, 'Balance cannot be negative'] },
    eth: { type: Number, default: 0, min: [0, 'Balance cannot be negative'] },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Player = mongoose.model('Player', playerSchema);

async function createPlayer(playerId) {
  validatePlayerId(playerId);
  const player = new Player({ playerId });
  await player.save();
  return player;
}

async function getPlayer(playerId) {
  validatePlayerId(playerId);
  return Player.findOne({ playerId });
}

async function updatePlayerBalance(playerId, currency, amount) {
  validatePlayerId(playerId);
  validateCurrency(currency);
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Amount must be a valid number');
  }
  return Player.findOneAndUpdate(
    { playerId },
    { $inc: { [`balance.${currency}`]: amount } },
    { new: true, runValidators: true }
  );
}

module.exports = { Player, createPlayer, getPlayer, updatePlayerBalance };
