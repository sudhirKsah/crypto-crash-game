const axios = require('axios');
require('dotenv').config();
const { validateCurrency } = require('../utils/validators');

let cachedPrices = {};
let lastFetchTime = 0;
const CACHE_DURATION = 10000;

async function fetchCryptoPrice(currency) {
  validateCurrency(currency);
  const now = Date.now();
  if (cachedPrices[currency] && now - lastFetchTime < CACHE_DURATION) {
    return cachedPrices[currency];
  }

  try {
    const response = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: currency,
        vs_currencies: 'usd',
        x_cg_demo_api_key: process.env.COINGECKO_API_KEY,
      },
    });
    const price = response.data[currency].usd;
    if (typeof price !== 'number' || price <= 0) {
      throw new Error('Invalid price received from API');
    }
    cachedPrices[currency] = price;
    lastFetchTime = now;
    return price;
  } catch (error) {
    console.error('Crypto API error:', error.message);
    return cachedPrices[currency] || null;
  }
}

function usdToCrypto(usdAmount, price) {
  if (typeof usdAmount !== 'number' || usdAmount <= 0 || isNaN(usdAmount)) {
    throw new Error('USD amount must be a positive number');
  }
  if (typeof price !== 'number' || price <= 0 || isNaN(price)) {
    throw new Error('Price must be a positive number');
  }
  return usdAmount / price;
}

function cryptoToUsd(cryptoAmount, price) {
  if (typeof cryptoAmount !== 'number' || cryptoAmount < 0 || isNaN(cryptoAmount)) {
    throw new Error('Crypto amount cannot be negative');
  }
  if (typeof price !== 'number' || price <= 0 || isNaN(price)) {
    throw new Error('Price must be a positive number');
  }
  return cryptoAmount * price;
}

module.exports = { fetchCryptoPrice, usdToCrypto, cryptoToUsd };
