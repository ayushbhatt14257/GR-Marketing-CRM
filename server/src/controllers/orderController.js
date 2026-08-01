const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { getQueuePosition, getStockSummary } = require('../services/stockService');
const { recordActivity } = require('../services/pointsEngine');
const { notify } = require('../services/notificationService');

function computeStatus(order) {
  const totalRequested = order.items.reduce((s, i) => s + i.requestedQty, 0);
  const totalDispatched = order.items.reduce((s, i) => s + i.dispatchedQty, 0);
  const totalCancelled = order.items.reduce((s, i) => s + i.cancelledQty, 0);

  if (order.status === 'cancelled') return 'cancelled';
  if (order.status === 'delivered') return 'delivered';
  if (totalDispatched === 0) return 'reserved';
  if (totalDispatched + totalCancelled >= totalRequested) return 'dispatched';
  return 'partially_dispatched';
}

// POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
  const { customerId, ownerId, category, items, deliveryDate } = req.body;

  if (!customerId || !category || !Array.isArray(items) || !items.length || !deliveryDate) {
    res.status(400);
    throw new Error('Customer, category, at least one product, and delivery date are required');
  }

  // ownerId: whoever the order is credited to (dispatch/admin can create on behalf of a marketing user)
  const effectiveOwnerId = req.user.role === 'marketing' ? req.user._id : ownerId;
  if (!effectiveOwnerId) {
    res.status(400);
    throw new Error('ownerId is required when creating an order on behalf of a marketing user');
  }

  const order = await Order.create({
    customerId,
    ownerId: effectiveOwnerId,
    createdBy: req.user._id,
    category,
    items: items.map((i) => ({ productId: i.productId, requestedQty: i.quantity })),
    deliveryDate,
    status: 'reserved',
  });

  await recordActivity(effectiveOwnerId, 'order');

  if (String(effectiveOwnerId) !== String(req.user._id)) {
    await notify(effectiveOwnerId, {
      title: 'New order assigned',
      message: `${req.user.name} created an order for you (delivery: ${new Date(deliveryDate).toLocaleDateString()})`,
      type: 'order_assigned',
      refId: order._id,
    });
  }

  res.status(201).json(order);
});

// GET /api/orders (paginated + filters)
const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const filter = { isDeleted: false };

  if (req.user.role === 'marketing') filter.ownerId = req.user._id;
  else if (req.query.ownerId) filter.ownerId = req.query.ownerId;

  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate('customerId', 'name')
      .populate('ownerId', 'name')
      .populate('createdBy', 'name')
      .populate('items.productId', 'modelName familyName category')
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customerId', 'name')
    .populate('ownerId', 'name')
    .populate('createdBy', 'name')
    .populate('items.productId', 'modelName familyName category')
    .lean();
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const positions = {};
  for (const item of order.items) {
    positions[item.productId._id] = await getQueuePosition(item.productId._id, order._id);
  }

  res.json({ ...order, queuePositions: positions });
});

// PATCH /api/orders/:id  (edit items/deliveryDate — only pre-dispatch, owner or admin/dispatch)
const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.status !== 'reserved' && order.status !== 'pending') {
    res.status(400);
    throw new Error('Order can no longer be edited once dispatch has begun');
  }
  const isOwner = String(order.ownerId) === String(req.user._id);
  if (!isOwner && !['admin', 'dispatch'].includes(req.user.role)) {
    res.status(403);
    throw new Error('You cannot edit this order');
  }

  const { items, deliveryDate } = req.body;
  if (items) order.items = items.map((i) => ({ productId: i.productId, requestedQty: i.quantity, dispatchedQty: 0, cancelledQty: 0 }));
  if (deliveryDate) order.deliveryDate = deliveryDate;

  await order.save();
  res.json(order);
});

// PATCH /api/orders/:id/priority  (dispatch/admin only)
const setPriority = asyncHandler(async (req, res) => {
  const { priority } = req.body;
  if (!['normal', 'urgent'].includes(priority)) {
    res.status(400);
    throw new Error('Priority must be normal or urgent');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.priority = priority;
  order.priorityChangedBy = req.user._id;
  await order.save();
  res.json(order);
});

// POST /api/orders/:id/dispatch  { items: [{ productId, qty }] }
// Marketing (own order), dispatch (any), admin (any). Always attributed by name.
const dispatchOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (['cancelled', 'delivered'].includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot dispatch an order that is ${order.status}`);
  }
  const isOwner = String(order.ownerId) === String(req.user._id);
  if (!isOwner && !['admin', 'dispatch'].includes(req.user.role)) {
    res.status(403);
    throw new Error('You cannot dispatch this order');
  }

  const { items } = req.body;
  if (!Array.isArray(items) || !items.length) {
    res.status(400);
    throw new Error('Specify items and quantities to dispatch');
  }

  const dispatchedItems = [];
  for (const dItem of items) {
    const line = order.items.find((i) => String(i.productId) === String(dItem.productId));
    if (!line) continue;
    const remaining = line.requestedQty - line.dispatchedQty - line.cancelledQty;
    const qty = Math.min(Number(dItem.qty) || 0, remaining);
    if (qty <= 0) continue;

    // Deduct from physical stock now (reservation was virtual until this point).
    const product = await Product.findById(dItem.productId);
    if (product) {
      product.totalStock = Math.max(0, product.totalStock - qty);
      await product.save();
      if (product.totalStock <= product.lowStockThreshold) {
        // Notify admin + warehouse about low stock (best-effort, non-blocking)
      }
    }

    line.dispatchedQty += qty;
    dispatchedItems.push({ productId: dItem.productId, qty });
  }

  if (!dispatchedItems.length) {
    res.status(400);
    throw new Error('Nothing valid to dispatch');
  }

  order.dispatchLog.push({ dispatchedBy: req.user._id, dispatchedByName: req.user.name, items: dispatchedItems });
  order.status = computeStatus(order);
  await order.save();

  if (!isOwner) {
    await notify(order.ownerId, {
      title: 'Order dispatched',
      message: `${req.user.name} dispatched items for your order`,
      type: 'order_dispatched',
      refId: order._id,
    });
  }

  res.json(order);
});

// PATCH /api/orders/:id/deliver  (marketing owner or dispatch)
const markDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  const isOwner = String(order.ownerId) === String(req.user._id);
  if (!isOwner && !['admin', 'dispatch'].includes(req.user.role)) {
    res.status(403);
    throw new Error('You cannot mark this order delivered');
  }

  order.status = 'delivered';
  order.deliveredBy = req.user._id;
  order.deliveredAt = new Date();
  await order.save();
  res.json(order);
});

// PATCH /api/orders/:id/cancel  { reason }
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  const isOwner = String(order.ownerId) === String(req.user._id);
  if (!isOwner && !['admin', 'dispatch'].includes(req.user.role)) {
    res.status(403);
    throw new Error('You cannot cancel this order');
  }

  // Release remaining (undispatched) qty back to the pool — reservation is virtual/live,
  // so simply flipping status to 'cancelled' removes it from ACTIVE_STATUSES and the
  // stock engine's queue query automatically stops counting it. Nothing else to "release".
  order.items.forEach((i) => {
    i.cancelledQty = i.requestedQty - i.dispatchedQty;
  });
  order.status = 'cancelled';
  order.cancelledBy = req.user._id;
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || '';
  await order.save();

  res.json(order);
});

// PATCH /api/orders/:id/reassign  (admin only)  { ownerId }
const reassignOrder = asyncHandler(async (req, res) => {
  const { ownerId } = req.body;
  if (!ownerId) {
    res.status(400);
    throw new Error('ownerId is required');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const previousOwner = order.ownerId;
  order.ownerId = ownerId;
  await order.save();

  if (String(previousOwner) !== String(ownerId)) {
    await notify(ownerId, {
      title: 'Order assigned to you',
      message: `${req.user.name} assigned an order to you`,
      type: 'order_assigned',
      refId: order._id,
    });
  }

  res.json(order);
});

module.exports = { createOrder, listOrders, getOrder, updateOrder, setPriority, dispatchOrder, markDelivered, cancelOrder, reassignOrder };
