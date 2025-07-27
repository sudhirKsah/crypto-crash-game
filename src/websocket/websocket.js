const { cashout } = require('../services/gameService');
const { validatePlayerId } = require('../utils/validators');

function setupWebSocket(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('cashout', async (data) => {
      try {
        const { playerId } = data;
        validatePlayerId(playerId);
        const result = await cashout(playerId);
        io.emit('playerCashout', result);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

module.exports = { setupWebSocket };
