const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { createPlayer } = require('../models/Player');
const { createGameRound } = require('../models/GameRound');
const { createTransaction } = require('../models/Transaction');
const { validatePlayerId } = require('../utils/validators');

async function seedDatabase() {
await connectDB();

await mongoose.model('Player').deleteMany({});
await mongoose.model('GameRound').deleteMany({});
await mongoose.model('Transaction').deleteMany({});

await createPlayer('player1');
await createPlayer('player2');
await createPlayer('player3');

await createGameRound(1, 2.5, 'seed1', require('crypto-js').SHA256('seed1' + 1).toString());
await createGameRound(2, 1.8, 'seed2', require('crypto-js').SHA256('seed2' + 2).toString());

await createTransaction('player1', 10, 0.00016667, 'btc', 'bet', 60000);
await createTransaction('player1', 20, 0.00033334, 'btc', 'cashout', 60000);

console.log('Database seeded successfully');
await mongoose.connection.close();
process.exit();
}

seedDatabase();
