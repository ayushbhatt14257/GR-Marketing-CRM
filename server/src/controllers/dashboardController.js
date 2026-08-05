const asyncHandler = require('../utils/asyncHandler');
const Lead = require('../models/Lead');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { istDateKeyDaysAgo, toISTDateKey } = require('../utils/dateHelpers');
const { getStockSummary } = require('../services/stockService');

// GET /api/dashboard/marketing
const marketingDashboard = asyncHandler(async (req, res) => {
  const ownerId = req.query.userId && req.user.role !== 'marketing' ? req.query.userId : req.user._id;
  const now = new Date();

  const [totalCustomers, pendingFollowUps, closedFollowUps, dueFollowUps, upcomingFollowUps, orders, recentOrders] = await Promise.all([
    Customer.countDocuments({ ownerId, isDeleted: false }),
    Lead.countDocuments({ ownerId, isFollowUpClosed: false, isDeleted: false }),
    Lead.countDocuments({ ownerId, isFollowUpClosed: true, isDeleted: false }),
    Lead.find({ ownerId, isFollowUpClosed: false, isDeleted: false, nextFollowUpDate: { $lte: now } })
      .populate('customerId', 'name').sort({ nextFollowUpDate: 1 }).limit(10).lean(),
    Lead.find({ ownerId, isFollowUpClosed: false, isDeleted: false, nextFollowUpDate: { $gt: now } })
      .populate('customerId', 'name').sort({ nextFollowUpDate: 1 }).limit(10).lean(),
    Order.find({ ownerId, isDeleted: false }).populate('items.productId', 'name').lean(),
    Order.find({ ownerId, status: { $in: ['reserved', 'partially_dispatched'] }, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customerId', 'name')
      .lean(),
  ]);

  const ordersByStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const productFreq = {};
  orders.forEach((o) => o.items.forEach((i) => {
    const id = String(i.productId?._id || i.productId);
    productFreq[id] = (productFreq[id] || 0) + 1;
  }));
  const topProductIds = Object.entries(productFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  const stockSummary = await getStockSummary(topProductIds);
  const products = await Product.find({ _id: { $in: topProductIds } }).select('name category').lean();
  const frequentProductsStock = products.map((p) => ({ ...p, stock: stockSummary[p._id] }));

  res.json({
    totalCustomers,
    pendingFollowUps,
    closedFollowUps,
    dueFollowUpsCount: dueFollowUps.length,
    dueFollowUps,
    upcomingFollowUps,
    totalOrders: orders.length,
    ordersByStatus,
    recentOrders,
    frequentProductsStock,
  });
});

// GET /api/dashboard/warehouse
const warehouseDashboard = asyncHandler(async (req, res) => {
  const products = await Product.find({ isDeleted: false }).lean();
  const stockSummary = await getStockSummary(products.map((p) => p._id));

  const lowStock = [];
  const mismatch = [];
  products.forEach((p) => {
    const s = stockSummary[p._id];
    if (s.lowStock) lowStock.push({ ...p, stock: s });
    if (s.available < 0) mismatch.push({ ...p, stock: s }); // oversold vs physical stock
  });

  res.json({ totalProducts: products.length, lowStock, mismatch });
});

// GET /api/dashboard/dispatch
const dispatchDashboard = asyncHandler(async (req, res) => {
  const matchFilter = { status: { $in: Order.ACTIVE_STATUSES }, isDeleted: false };
  if (req.user.role === 'dispatch' && req.user.productAccess !== 'both') {
    matchFilter.category = req.user.productAccess;
  }

  const [queue, byUser] = await Promise.all([
    Order.find(matchFilter)
      .sort({ priority: -1, createdAt: 1 })
      .populate('customerId', 'name')
      .populate('ownerId', 'name')
      .limit(100)
      .lean(),
    Order.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$ownerId', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({ queue, byUser });
});

// GET /api/dashboard/admin
const adminDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const [totalUsers, totalCustomers, totalLeads, totalOrders, ordersByStatus, leaderboard, dueFollowUpsCount, upcomingFollowUpsCount] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Customer.countDocuments({ isDeleted: false }),
    Lead.countDocuments({ isDeleted: false }),
    Order.countDocuments({ isDeleted: false }),
    Order.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.find({ role: 'marketing', isActive: true }).select('name totalPoints monthlyPoints currentStreak').sort({ monthlyPoints: -1 }).limit(10).lean(),
    Lead.countDocuments({ isFollowUpClosed: false, isDeleted: false, nextFollowUpDate: { $lte: now } }),
    Lead.countDocuments({ isFollowUpClosed: false, isDeleted: false, nextFollowUpDate: { $gt: now } }),
  ]);

  const funnel = await Lead.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$talkRegarding', count: { $sum: 1 } } },
  ]);

  // FonFox vs Supreme side-by-side comparison — users, customers, leads,
  // orders, and order-status breakdown, all split by category. Every piece
  // here is computed with a fixed, small number of queries regardless of
  // data size — never loop per-category.
  const [leadsByCategory, ordersByCategory, statusByCategory, usersByAccess,
    leadCustomersFonfox, leadCustomersSupreme, orderCustomersFonfox, orderCustomersSupreme] = await Promise.all([
    Lead.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: { category: '$category', status: '$status' }, count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { isActive: true, role: { $in: ['marketing', 'dispatch'] } } },
      { $group: { _id: '$productAccess', count: { $sum: 1 } } },
    ]),
    Lead.distinct('customerId', { category: 'fonfox', isDeleted: false }),
    Lead.distinct('customerId', { category: 'supreme', isDeleted: false }),
    Order.distinct('customerId', { category: 'fonfox', isDeleted: false }),
    Order.distinct('customerId', { category: 'supreme', isDeleted: false }),
  ]);

  const buildCategoryComparison = () => {
    const result = {
      fonfox: { activeUsers: 0, customers: 0, leads: 0, orders: 0, statusBreakdown: {} },
      supreme: { activeUsers: 0, customers: 0, leads: 0, orders: 0, statusBreakdown: {} },
    };

    leadsByCategory.forEach((l) => { if (result[l._id]) result[l._id].leads = l.count; });
    ordersByCategory.forEach((o) => { if (result[o._id]) result[o._id].orders = o.count; });
    statusByCategory.forEach((s) => {
      if (result[s._id.category]) result[s._id.category].statusBreakdown[s._id.status] = s.count;
    });

    // Users with 'both' access are active for both categories, so they count
    // toward each — the two numbers can legitimately sum to more than
    // totalUsers, that's expected, not a bug.
    usersByAccess.forEach((u) => {
      if (u._id === 'fonfox') result.fonfox.activeUsers += u.count;
      else if (u._id === 'supreme') result.supreme.activeUsers += u.count;
      else if (u._id === 'both') { result.fonfox.activeUsers += u.count; result.supreme.activeUsers += u.count; }
    });

    // A customer counts toward a category if they have any lead OR order in
    // it — a customer can legitimately appear in both.
    result.fonfox.customers = new Set([...leadCustomersFonfox, ...orderCustomersFonfox].map(String)).size;
    result.supreme.customers = new Set([...leadCustomersSupreme, ...orderCustomersSupreme].map(String)).size;

    return result;
  };
  const categoryComparison = buildCategoryComparison();

  res.json({ totalUsers, totalCustomers, totalLeads, totalOrders, ordersByStatus, funnel, leaderboard, dueFollowUpsCount, upcomingFollowUpsCount, categoryComparison });
});

// GET /api/dashboard/heatmap?userId=  -- last 365 days activity, GitHub-style
const heatmap = asyncHandler(async (req, res) => {
  const userId = req.query.userId || req.user._id;
  const from = istDateKeyDaysAgo(365);
  const logs = await ActivityLog.find({ userId, dateKey: { $gte: from } }).select('-_id dateKey score leadsCount ordersCount followUpsClosedCount loggedIn').lean();
  res.json(logs);
});

// GET /api/dashboard/analytics  (admin only) - trend, conversion, week/month comparisons
const analytics = asyncHandler(async (req, res) => {
  const from = istDateKeyDaysAgo(30);
  const fromDate = new Date(from);

  const [leadsTrend, ordersTrend, totalLeads, totalOrders] = await Promise.all([
    Lead.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: fromDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: fromDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Lead.countDocuments({ isDeleted: false }),
    Order.countDocuments({ isDeleted: false }),
  ]);

  const conversionRate = totalLeads > 0 ? ((totalOrders / totalLeads) * 100).toFixed(1) : '0.0';

  const now = new Date();
  const startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - now.getDay()); startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek); startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisWeek, lastWeek, thisMonth, lastMonth] = await Promise.all([
    Lead.countDocuments({ isDeleted: false, createdAt: { $gte: startOfThisWeek } }),
    Lead.countDocuments({ isDeleted: false, createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } }),
    Lead.countDocuments({ isDeleted: false, createdAt: { $gte: startOfThisMonth } }),
    Lead.countDocuments({ isDeleted: false, createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
  ]);

  res.json({
    leadsTrend, ordersTrend, totalLeads, totalOrders, conversionRate,
    thisWeek, lastWeek, thisMonth, lastMonth,
  });
});

// GET /api/dashboard/attendance  (admin only)
// Returns every active user with today's login status, points, streak, and a
// 7-day attendance grid (like the old CRM's weekly view). Built with exactly
// 2 queries total (users + activity logs), never a per-user loop — same
// scaling lesson as the stock engine fixes.
const attendance = asyncHandler(async (req, res) => {
  const today = toISTDateKey();
  const from = istDateKeyDaysAgo(6); // today + 6 back = 7 days total

  const filter = { isActive: true };
  if (req.query.role) filter.role = req.query.role;

  const [users, logs] = await Promise.all([
    User.find(filter).select('-passwordHash').sort({ name: 1 }).lean(),
    ActivityLog.find({ dateKey: { $gte: from } }).select('userId dateKey loggedIn').lean(),
  ]);

  // Build the list of the last 7 IST day-keys, oldest first.
  const dayKeys = [];
  for (let i = 6; i >= 0; i--) dayKeys.push(istDateKeyDaysAgo(i));

  const logsByUser = {};
  for (const log of logs) {
    const uid = String(log.userId);
    if (!logsByUser[uid]) logsByUser[uid] = {};
    logsByUser[uid][log.dateKey] = log.loggedIn;
  }

  const result = users.map((u) => {
    const userLogs = logsByUser[String(u._id)] || {};
    const week = dayKeys.map((dateKey) => ({ dateKey, loggedIn: !!userLogs[dateKey] }));
    const activeDays = week.filter((d) => d.loggedIn).length;

    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      totalPoints: u.totalPoints,
      monthlyPoints: u.monthlyPoints,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
      loggedInToday: u.lastLoginDate === today,
      week,
      activeDays,
    };
  });

  res.json({ dayKeys, users: result });
});

module.exports = { marketingDashboard, warehouseDashboard, dispatchDashboard, adminDashboard, heatmap, analytics, attendance };
