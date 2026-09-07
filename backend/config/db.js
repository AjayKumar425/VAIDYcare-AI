const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    console.log('Attempting to connect with URI:', uri ? uri.replace(/:([^:@]+)@/, ':****@') : 'UNDEFINED');
    
    if (!uri) {
      throw new Error('MONGO_URI is missing in .env');
    }

    const conn = await mongoose.connect(uri);
    console.log(`Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;