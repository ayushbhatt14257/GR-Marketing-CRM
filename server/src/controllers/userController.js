const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const AVATAR_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#ef4444', '#22c55e'];

// GET /api/users
const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
  res.json(users);
});

// POST /api/users  (admin only)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, productAccess } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('Name, email, password and role are required');
  }
  if (!User.ROLES.includes(role)) {
    res.status(400);
    throw new Error('Invalid role');
  }
  if (productAccess && !['fonfox', 'supreme', 'both'].includes(productAccess)) {
    res.status(400);
    throw new Error('Invalid product access value');
  }

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    res.status(409);
    throw new Error('A user with this email already exists');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    productAccess: productAccess || 'both',
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  });

  const obj = user.toObject();
  delete obj.passwordHash;
  res.status(201).json(obj);
});

// PATCH /api/users/:id  (admin only) - activate/deactivate, change role, reset password
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, role, isActive, password, productAccess } = req.body;
  if (name) user.name = name.trim();
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) user.passwordHash = await User.hashPassword(password);
  if (productAccess && ['fonfox', 'supreme', 'both'].includes(productAccess)) user.productAccess = productAccess;

  await user.save();
  const obj = user.toObject();
  delete obj.passwordHash;
  res.json(obj);
});

// DELETE /api/users/:id  (admin only) - soft deactivate, never hard delete (audit trail)
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.isActive = false;
  await user.save();
  res.json({ message: 'User deactivated' });
});

// GET /api/users/:id/detail  (admin only) - full profile: points, leads, orders, ledger
const getUserDetail = asyncHandler(async (req, res) => {
  const Lead = require('../models/Lead');
  const Order = require('../models/Order');
  const Customer = require('../models/Customer');
  const PointsLedger = require('../models/PointsLedger');

  const user = await User.findById(req.params.id).select('-passwordHash').lean();
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const [totalCustomers, totalLeads, pendingFollowUps, dueFollowUps, totalOrders, ordersByStatus, recentPoints] = await Promise.all([
    Customer.countDocuments({ ownerId: user._id, isDeleted: false }),
    Lead.countDocuments({ ownerId: user._id, isDeleted: false }),
    Lead.countDocuments({ ownerId: user._id, isFollowUpClosed: false, isDeleted: false }),
    Lead.countDocuments({ ownerId: user._id, isFollowUpClosed: false, isDeleted: false, nextFollowUpDate: { $lte: new Date() } }),
    Order.countDocuments({ ownerId: user._id, isDeleted: false }),
    Order.aggregate([
      { $match: { ownerId: user._id, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PointsLedger.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  res.json({ user, totalCustomers, totalLeads, pendingFollowUps, dueFollowUps, totalOrders, ordersByStatus, recentPoints });
});

module.exports = { listUsers, createUser, updateUser, deleteUser, getUserDetail };
