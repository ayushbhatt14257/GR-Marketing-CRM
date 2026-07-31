const mongoose = require('mongoose');

const connectDB = async () => {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connectDB;
