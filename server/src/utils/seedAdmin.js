require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const email = (process.env.ADMIN_EMAIL || 'admin@grmarketing.com').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists:', email);
  } else {
    const passwordHash = await User.hashPassword(process.env.ADMIN_PASSWORD || 'ChangeMe123!');
    await User.create({
      name: process.env.ADMIN_NAME || 'Admin',
      email,
      passwordHash,
      role: 'admin',
    });
    console.log('Admin created:', email);
  }
  await mongoose.connection.close();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
