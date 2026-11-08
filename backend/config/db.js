const mongoose = require('mongoose');

/**
 * Connect to MongoDB instance with robust error handling and event logging.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] MongoDB error event: ${err.message}`);
});

module.exports = connectDB;
