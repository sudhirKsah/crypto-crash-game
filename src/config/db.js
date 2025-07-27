const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return mongoose.connection.db;
try{
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto_crash', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
  return mongoose.connection.db;
}catch (error) {
  console.error('Error connecting to MongoDB:', error);
  throw error;
}
}

module.exports = connectDB;
