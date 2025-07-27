const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const gameRoutes = require('./routes/game');
const { setupWebSocket } = require('./websocket/websocket');
const { startGameRound } = require('./services/gameService');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));
app.use('/api/game', gameRoutes);

connectDB().then(() => {
  setupWebSocket(io);
  startGameRound(io);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
