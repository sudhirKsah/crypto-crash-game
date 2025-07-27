const express = require('express');
const router = express.Router();
const { placeBet, cashout } = require('../services/gameService');
const { getPlayer } = require('../models/Player');
const { fetchCryptoPrice, cryptoToUsd } = require('../services/cryptoService');
const { validatePlayerId, validateUsdAmount, validateCurrency } = require('../utils/validators');

router.post('/bet', async (req, res) => {
  try {
    const { playerId, usdAmount, currency } = req.body;
    validatePlayerId(playerId);
    validateUsdAmount(usdAmount);
    validateCurrency(currency);
    const result = await placeBet(playerId, usdAmount, currency);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/cashout', async (req, res) => {
  try {
    const { playerId } = req.body;
    validatePlayerId(playerId);
    const result = await cashout(playerId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/balance/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    validatePlayerId(playerId);
    const player = await getPlayer(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const btcPrice = await fetchCryptoPrice('btc');
    const ethPrice = await fetchCryptoPrice('eth');
    const balance = {
      btc: player.balance.btc,
      eth: player.balance.eth,
      usdEquivalent: {
        btc: btcPrice ? cryptoToUsd(player.balance.btc, btcPrice) : null,
        eth: ethPrice ? cryptoToUsd(player.balance.eth, ethPrice) : null,
      },
    };
    res.json(balance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
