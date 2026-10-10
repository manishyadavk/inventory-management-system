const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Create a .env file (see .env.example).');
  }

  // Fail after 5 seconds instead of hanging when MongoDB is unreachable.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);

  // Report connection loss that happens after startup.
  mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected');
  });
};

module.exports = connectDB;
