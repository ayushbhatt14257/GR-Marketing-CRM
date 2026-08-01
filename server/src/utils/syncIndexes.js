require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const ProductFamily = require('../models/ProductFamily');
const Lead = require('../models/Lead');
const Order = require('../models/Order');
const StockLedger = require('../models/StockLedger');
const PointsLedger = require('../models/PointsLedger');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const Task = require('../models/Task');

// One-time maintenance: makes each collection's real indexes match exactly
// what the current Mongoose schema declares — drops anything stale left
// over from earlier schema versions (e.g. the old flat Product name+category
// index from before the Family/Model restructure) and creates anything new.
// Safe to re-run any time; a no-op once indexes are already in sync.
(async () => {
  await connectDB();

  const models = [
    User, Customer, Product, ProductFamily, Lead, Order,
    StockLedger, PointsLedger, ActivityLog, Notification, Announcement, Task,
  ];

  for (const model of models) {
    console.log(`Syncing indexes for ${model.modelName}...`);
    const result = await model.syncIndexes();
    console.log(`  -> done. Indexes now:`, result);
  }

  console.log('\nAll indexes synced successfully.');
  await mongoose.connection.close();
  process.exit(0);
})().catch((err) => {
  console.error('Index sync failed:', err);
  process.exit(1);
});
