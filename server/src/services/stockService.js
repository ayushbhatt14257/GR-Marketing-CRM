const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * Core principle: "reserved stock" and "queue position" are NEVER stored —
 * they are always computed live from the set of active orders for a product,
 * sorted by (priority desc, createdAt asc). This is the only way to guarantee
 * they can't drift, since priority/cancellations/dispatches can reorder the
 * queue at any time.
 */

// Returns active (unfulfilled) order-items for a product, in dispatch-queue order.
async function getQueueForProduct(productId) {
  const orders = await Order.find({
    'items.productId': productId,
    status: { $in: Order.ACTIVE_STATUSES },
    isDeleted: false,
  })
    .sort({ priority: -1, createdAt: 1 }) // urgent first, then FIFO
    .lean();

  return orders.map((order) => {
    const item = order.items.find((i) => String(i.productId) === String(productId));
    const remaining = item.requestedQty - item.dispatchedQty - item.cancelledQty;
    return { orderId: order._id, ownerId: order.ownerId, priority: order.priority, createdAt: order.createdAt, remaining };
  }).filter((q) => q.remaining > 0);
}

// Total reserved (unfulfilled, active) qty for a product.
async function getReservedQty(productId) {
  const queue = await getQueueForProduct(productId);
  return queue.reduce((sum, q) => sum + q.remaining, 0);
}

// Available-to-promise = totalStock - reserved. Can go negative (shown as 0 to user,
// but negative internally is fine to display as "oversold, awaiting stock-in").
async function getAvailableStock(productId) {
  const product = await Product.findById(productId).lean();
  if (!product) return 0;
  const reserved = await getReservedQty(productId);
  return product.totalStock - reserved;
}

// Where does a given order sit in the queue for a specific product? (1-indexed)
async function getQueuePosition(productId, orderId) {
  const queue = await getQueueForProduct(productId);
  const idx = queue.findIndex((q) => String(q.orderId) === String(orderId));
  return idx === -1 ? null : idx + 1;
}

// Bulk stock summary for a list of product IDs — used on lead/order entry pages,
// product listings, and family aggregates so the UI can show live availability.
//
// IMPORTANT: this does ONE database query total, regardless of how many product
// IDs are passed in, then aggregates reservations in memory. The naive version
// (looping getReservedQty per product) does N sequential queries — with 100+
// products that's 100+ round trips and multi-second page loads. Never revert
// to a per-product loop here.
async function getStockSummary(productIds) {
  if (!productIds || productIds.length === 0) return {};

  const [products, activeOrders] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).select('totalStock lowStockThreshold').lean(),
    Order.find({
      'items.productId': { $in: productIds },
      status: { $in: Order.ACTIVE_STATUSES },
      isDeleted: false,
    }).select('items').lean(),
  ]);

  // Sum remaining (unfulfilled) qty per product across all active orders, in one pass.
  const reservedByProduct = {};
  for (const order of activeOrders) {
    for (const item of order.items) {
      const remaining = item.requestedQty - item.dispatchedQty - item.cancelledQty;
      if (remaining <= 0) continue;
      const key = String(item.productId);
      reservedByProduct[key] = (reservedByProduct[key] || 0) + remaining;
    }
  }

  const result = {};
  for (const p of products) {
    const reserved = reservedByProduct[String(p._id)] || 0;
    result[p._id] = {
      totalStock: p.totalStock,
      reserved,
      available: p.totalStock - reserved,
      lowStock: p.totalStock <= p.lowStockThreshold,
    };
  }
  return result;
}

module.exports = { getQueueForProduct, getReservedQty, getAvailableStock, getQueuePosition, getStockSummary };
