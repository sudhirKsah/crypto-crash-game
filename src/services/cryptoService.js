const axios = require('axios');
require('dotenv').config();
const { validateCurrency } = require('../utils/validators');

let cachedPrices = {};
let lastFetchTime = 0;
const CACHE_DURATION = 10000;

// Map internal currency codes to CoinGecko coin IDs
const currencyToCoinId = {
  btc: 'bitcoin',
  eth: 'ethereum',
};

async function fetchCryptoPrice(currency) {
  validateCurrency(currency);
  const coinId = currencyToCoinId[currency.toLowerCase()];
  if (!coinId) {
    throw new Error(`Invalid currency: ${currency}. Must be 'btc' or 'eth'.`);
  }

  const now = Date.now();
  if (cachedPrices[currency] && now - lastFetchTime < CACHE_DURATION) {
    return cachedPrices[currency];
  }

  try {
    const response = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: 'usd',
        x_cg_demo_api_key: process.env.COINGECKO_API_KEY || undefined,
      },
      timeout: 5000,
    });

    const price = response.data[coinId]?.usd;
    console.log(`Fetched price for ${currency}: $${price}`);
    if (typeof price !== 'number' || price <= 0 || isNaN(price)) {
      throw new Error(`Invalid price received from CoinGecko for ${coinId}: ${JSON.stringify(response.data)}`);
    }

    cachedPrices[currency] = price;
    lastFetchTime = now;
    return price;
  } catch (error) {
    console.error(`Crypto API error for ${currency}:`, error.message, error.response?.data || '');
    // Fallback to cached price if available, otherwise throw error
    if (cachedPrices[currency]) {
      console.warn(`Using cached price for ${currency}: ${cachedPrices[currency]}`);
      return cachedPrices[currency];
    }
    throw new Error(`Failed to fetch price for ${currency}: ${error.message}`);
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