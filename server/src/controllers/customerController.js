const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');

// GET /api/customers/search?q=ravi
// Live-suggest as the user types. Marketing users only see their own customers;
// admin/dispatch/warehouse can pass ownerId to search within a specific user's base
// (dispatch needs this to assign orders to the right marketing user's customer list).
const searchCustomers = asyncHandler(async (req, res) => {
  const { q = '', ownerId } = req.query;
  const filter = { isDeleted: false };

  if (req.user.role === 'marketing') {
    filter.ownerId = req.user._id;
  } else if (ownerId) {
    filter.ownerId = ownerId;
  }

  if (q.trim()) {
    filter.normalizedKey = { $regex: '^' + Customer.normalizeKey(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };
  }

  const customers = await Customer.find(filter).sort({ name: 1 }).limit(15).lean();
  res.json(customers);
});

// POST /api/customers/resolve
// Body: { name, ownerId? }
// Central gate used by Lead/Order/Dispatch create flows.
// - If a customer with this normalized name already exists for the owner -> returns
//   it with `existing: true` (frontend should force user to pick from dropdown
//   instead of blindly calling this with free text).
// - If `confirmNew` is not passed and a close/exact match exists -> error, forcing
//   an explicit selection.
// - Otherwise creates a new customer.
const resolveCustomer = asyncHandler(async (req, res) => {
  const { name, ownerId, confirmNew, createdVia } = req.body;
  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Customer name is required');
  }

  const effectiveOwnerId = req.user.role === 'marketing' ? req.user._id : ownerId;
  if (!effectiveOwnerId) {
    res.status(400);
    throw new Error('ownerId is required when creating on behalf of a marketing user');
  }

  const normalizedKey = Customer.normalizeKey(name);
  const existing = await Customer.findOne({ ownerId: effectiveOwnerId, normalizedKey, isDeleted: false });

  if (existing) {
    return res.json({ customer: existing, existing: true });
  }

  if (!confirmNew) {
    // Check for a near-duplicate to nudge the user before creating (e.g. "Ravi Kumarr").
    const prefix = normalizedKey.slice(0, Math.max(3, normalizedKey.length - 2));
    const nearMatches = await Customer.find({
      ownerId: effectiveOwnerId,
      isDeleted: false,
      normalizedKey: { $regex: '^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
    }).limit(5).lean();

    if (nearMatches.length) {
      return res.status(409).json({
        message: 'A similar customer already exists. Please select from suggestions or confirm this is a new customer.',
        nearMatches,
        requiresConfirmation: true,
      });
    }
  }

  const customer = await Customer.create({
    name,
    ownerId: effectiveOwnerId,
    createdBy: req.user._id,
    createdVia: createdVia || 'lead',
  });

  res.status(201).json({ customer, existing: false });
});

// GET /api/customers  (paginated, admin/warehouse/dispatch: all; marketing: own only)
const listCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const filter = { isDeleted: false };

  if (req.user.role === 'marketing') filter.ownerId = req.user._id;
  else if (req.query.ownerId) filter.ownerId = req.query.ownerId;

  if (req.query.q) {
    filter.normalizedKey = { $regex: Customer.normalizeKey(req.query.q) };
  }

  const [items, total] = await Promise.all([
    Customer.find(filter).populate('ownerId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Customer.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// DELETE /api/customers/:id  (admin only) - soft delete
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  customer.isDeleted = true;
  await customer.save();
  res.json({ message: 'Customer deleted' });
});

module.exports = { searchCustomers, resolveCustomer, listCustomers, deleteCustomer };
