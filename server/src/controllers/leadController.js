const asyncHandler = require('../utils/asyncHandler');
const Lead = require('../models/Lead');
const { recordActivity } = require('../services/pointsEngine');
const { notify } = require('../services/notificationService');

// POST /api/leads
const createLead = asyncHandler(async (req, res) => {
  const { customerId, ownerId, category, productIds, talkRegarding, nextFollowUpDate, remark } = req.body;

  if (!customerId || !category || !talkRegarding || !remark || !remark.trim()) {
    res.status(400);
    throw new Error('Customer, category, talk regarding, and remark are all mandatory');
  }

  if (Lead.REQUIRES_FOLLOW_UP_DATE.includes(talkRegarding) && !nextFollowUpDate) {
    res.status(400);
    throw new Error('Next follow-up date is required for Follow-up and Call Later');
  }

  const effectiveOwnerId = req.user.role === 'marketing' ? req.user._id : ownerId || req.user._id;

  const lead = await Lead.create({
    customerId,
    ownerId: effectiveOwnerId,
    createdBy: req.user._id,
    category,
    productIds: productIds || [],
    talkRegarding,
    nextFollowUpDate: Lead.REQUIRES_FOLLOW_UP_DATE.includes(talkRegarding) ? nextFollowUpDate : null,
    remark: remark.trim(),
  });

  await recordActivity(effectiveOwnerId, 'lead');

  res.status(201).json(lead);
});

// GET /api/leads (paginated)
const listLeads = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const filter = { isDeleted: false };

  if (req.user.role === 'marketing') filter.ownerId = req.user._id;
  else if (req.query.ownerId) filter.ownerId = req.query.ownerId;

  if (req.query.status === 'pending') filter.isFollowUpClosed = false;
  if (req.query.status === 'closed') filter.isFollowUpClosed = true;
  if (req.query.talkRegarding) filter.talkRegarding = req.query.talkRegarding;

  if (req.query.followUp === 'due') {
    filter.isFollowUpClosed = false;
    filter.nextFollowUpDate = { $lte: new Date() };
  } else if (req.query.followUp === 'upcoming') {
    filter.isFollowUpClosed = false;
    filter.nextFollowUpDate = { $gt: new Date() };
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .populate('customerId', 'name')
      .populate('ownerId', 'name')
      .populate('productIds', 'modelName familyName category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// PATCH /api/leads/:id/close
const closeFollowUp = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }
  if (req.user.role === 'marketing' && String(lead.ownerId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only close your own leads');
  }

  lead.isFollowUpClosed = true;
  lead.closedAt = new Date();
  await lead.save();
  await recordActivity(lead.ownerId, 'followup');

  res.json(lead);
});

// PATCH /api/leads/:id/reassign  (admin only)  { ownerId }
const reassignLead = asyncHandler(async (req, res) => {
  const { ownerId } = req.body;
  if (!ownerId) {
    res.status(400);
    throw new Error('ownerId is required');
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }

  const previousOwner = lead.ownerId;
  lead.ownerId = ownerId;
  await lead.save();

  if (String(previousOwner) !== String(ownerId)) {
    await notify(ownerId, {
      title: 'Lead assigned to you',
      message: `${req.user.name} assigned a lead to you`,
      type: 'order_assigned',
      refId: lead._id,
    });
  }

  res.json(lead);
});

module.exports = { createLead, listLeads, closeFollowUp, reassignLead };
