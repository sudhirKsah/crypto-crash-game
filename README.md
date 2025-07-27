# Crypto Crash Backend

A robust backend for the Crypto Crash game, built with **Node.js**, **Express**, **MongoDB** (via Mongoose), and **Socket.IO**, integrating real-time cryptocurrency prices from the **CoinGecko API**. This project powers a provably fair crash game where players bet in USD (converted to BTC or ETH), cash out at dynamic multipliers, and receive payouts, with WebSocket-driven real-time updates and MongoDB-backed data persistence.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [Input Validation Rules](#input-validation-rules)
- [Handling Duplicate Player IDs](#handling-duplicate-player-ids)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Provably Fair Algorithm](#provably-fair-algorithm)
- [USD-to-Crypto Conversion](#usd-to-crypto-conversion)
- [Architecture](#architecture)
- [Testing](#testing)

## Overview

Crypto Crash is a real-time, multiplayer betting game where players place bets in USD, which are converted to cryptocurrencies (BTC or ETH) using live market prices. The game features a multiplier that increases over time until it "crashes" at a random point. Players can cash out before the crash to win their bet multiplied by the current multiplier. The backend ensures fairness, security, and scalability through a provably fair algorithm, robust input validation, and atomic database transactions.

## Features

- **Real-Time Gameplay**: Powered by Socket.IO for live multiplier updates and game events.
- **Cryptocurrency Integration**: Fetches real-time BTC and ETH prices from CoinGecko with caching.
- **Provably Fair**: Uses SHA-256 to generate verifiable crash points.
- **Data Persistence**: MongoDB with Mongoose schemas for players, game rounds, and transactions.
- **Concurrency Control**: Mongoose transactions ensure atomic updates, preventing race conditions.
- **Duplicate Player ID Protection**: Enforces unique player IDs and single bet/cashout per round.
- **Input Validation**: Strict checks for player IDs, amounts, and currencies.
- **WebSocket Client**: Simple HTML interface for testing real-time interactions.

## Setup Instructions

### Prerequisites
- **Node.js**
- **MongoDB**
- **CoinGecko API**: Demo API key required for public endpoints

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/sudhirKsah/crypto-crash-game.git
   cd crypto-crash-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables
Create a `.env` file in the root directory with the following:
```bash
MONGODB_URI=mongodb://localhost:27017/crypto_crash
PORT=3000
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=your-demo-api-key
```

### Running the Application
Start the server:
```bash
npm start
```

### Seeding the Database
Populate the database with sample data:
```bash
npm run seed
```

## Input Validation Rules

- **playerId**: Non-empty string, max 50 characters, alphanumeric with underscores/hyphens.
- **usdAmount**: Positive number, max 1,000,000.
- **currency**: Must be 'btc' or 'eth'.
- **cryptoAmount**: Positive number.
- **priceAtTime**: Positive number.
- **roundId**: Positive integer.
- **crashPoint**: Number ≥ 1.
- **multiplier**: Number ≥ 1.
- **cryptoPayout/usdPayout**: Non-negative numbers.
- **seed/hash**: Non-empty strings.

## Handling Duplicate Player IDs

- **Unique Player IDs**: The `Player` schema enforces `playerId` uniqueness at the database level, preventing duplicate player creation.
- **Single Bet per Round**: Players can place only one bet per round, enforced by a unique index on `{ roundId, bets.playerId }` in `GameRound` and checks in `placeBet`.
- **Single Cashout per Round**: Players can cash out only once per round, enforced by a unique index on `{ roundId, cashouts.playerId }` in `GameRound` and checks in `cashout`.
- **Concurrency Control**: Mongoose transactions ensure atomic updates across player balances, bets, cashouts, and transactions, preventing race conditions for the same `playerId`.

## API Endpoints

### POST /api/game/bet
- **Request**: `{ playerId: string, usdAmount: number, currency: "btc" | "eth" }`
- **Response**: `{ bet: { playerId, usdAmount, cryptoAmount, currency, priceAtTime }, multiplier: number }`
- **Description**: Places a bet in USD, converted to the specified cryptocurrency. Validates `playerId`, `usdAmount`, `currency`, sufficient balance, and ensures one bet per player per round.

### POST /api/game/cashout
- **Request**: `{ playerId: string }`
- **Response**: `{ playerId, multiplier, cryptoPayout, usdPayout }`
- **Description**: Cashes out the player's bet at the current multiplier. Validates `playerId`, ensures active round, existing bet, and one cashout per player per round.

### GET /api/game/balance/:playerId
- **Response**: `{ btc: number, eth: number, usdEquivalent: { btc: number, eth: number } }`
- **Description**: Retrieves the player's wallet balance in crypto and USD equivalent. Validates `playerId`.

## WebSocket Events

- **roundStart**: `{ roundId: number, seed: string, hash: string }`
  - Emitted when a new game round starts.
- **multiplierUpdate**: `{ roundId: number, multiplier: number }`
  - Emitted every 100ms with the current multiplier.
- **playerCashout**: `{ playerId: string, multiplier: number, cryptoPayout: number, usdPayout: number }`
  - Emitted when a player cashes out.
- **roundCrash**: `{ roundId: number, crashPoint: number }`
  - Emitted when the game crashes.
- **error**: `{ message: string }`
  - Emitted on errors (e.g., invalid cashout, duplicate bet, or invalid `playerId`).

## Provably Fair Algorithm

The crash point is generated using a cryptographically secure hash:
- **Seed**: Random string generated per round.
- **Hash**: SHA-256(seed + roundId).
- **Crash Point**: `(hash % 10000) / 10000 * maxCrash`, where `maxCrash = 100x`.
- **Verification**: Players can recompute the hash using the provided `seed` and `roundId` to verify fairness.

## USD-to-Crypto Conversion

- **API**: Uses CoinGecko to fetch real-time BTC and ETH prices.
- **Conversions**:
  - USD to crypto: `cryptoAmount = usdAmount / price`
  - Crypto to USD: `usdAmount = cryptoAmount * price`
- **Caching**: Prices are cached for 10 seconds to avoid API rate limits.
- **Description**: Uses api key```x_cg_demo_api_key``` in the params for authentication.

## Architecture

- **Game Logic**: Managed in `gameService.js`, with rounds starting every 10 seconds and multiplier updates every 100ms.
- **Crypto Integration**: `cryptoService.js` handles price fetching and conversions, with caching to optimize performance.
- **WebSockets**: `websocket.js` uses Socket.IO to broadcast game events and handle cashout requests with `playerId` validation.
- **Database**: MongoDB with Mongoose schemas ensures data validation and consistency. Transactions use Mongoose sessions for atomicity.
- **Security**: Robust input validation, unique indexes, and transaction-based updates prevent issues with duplicate `playerId` usage.

## Testing

- **API Testing**: Use the provided `postman_collection.json` to test API endpoints.
- **WebSocket Testing**: Access the client at `http://localhost:3000` to interact with real-time updates.
- **Sample cURL Command**:
  ```bash
  curl -X POST http://localhost:3000/api/game/bet \
    -H "Content-Type: application/json" \
    -d '{"playerId":"player1","usdAmount":10,"currency":"btc"}'
  ```
