const asyncHandler = require('../utils/asyncHandler');
const ProductFamily = require('../models/ProductFamily');
const Product = require('../models/Product');
const { getStockSummary } = require('../services/stockService');

// GET /api/product-families?category=fonfox&active=true
const listFamilies = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.active === 'true') filter.isActive = true;

  const families = await ProductFamily.find(filter).sort({ name: 1 }).lean();

  // Attach a lightweight aggregate (total variants + total available stock)
  // so the picker can show "(0 avail)" style badges without an extra round trip.
  const familyIds = families.map((f) => f._id);
  const variants = await Product.find({ familyId: { $in: familyIds }, isDeleted: false, isActive: true })
    .select('familyId totalStock')
    .lean();
  const stockSummary = await getStockSummary(variants.map((v) => v._id));

  const byFamily = {};
  variants.forEach((v) => {
    const avail = stockSummary[v._id]?.available ?? v.totalStock;
    if (!byFamily[v.familyId]) byFamily[v.familyId] = { variantCount: 0, totalAvailable: 0 };
    byFamily[v.familyId].variantCount += 1;
    byFamily[v.familyId].totalAvailable += avail;
  });

  res.json(families.map((f) => ({ ...f, ...(byFamily[f._id] || { variantCount: 0, totalAvailable: 0 }) })));
});

// POST /api/product-families  (warehouse/admin)
const createFamily = asyncHandler(async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) {
    res.status(400);
    throw new Error('Name and category are required');
  }

  const family = await ProductFamily.create({ name: name.trim(), category, lastUpdatedBy: req.user._id });
  res.status(201).json(family);
});

// PATCH /api/product-families/:id
const updateFamily = asyncHandler(async (req, res) => {
  const family = await ProductFamily.findById(req.params.id);
  if (!family) {
    res.status(404);
    throw new Error('Product family not found');
  }
  const { name, isActive } = req.body;
  if (name) family.name = name.trim();
  if (isActive !== undefined) family.isActive = isActive;
  family.lastUpdatedBy = req.user._id;
  await family.save();
  res.json(family);
});

module.exports = { listFamilies, createFamily, updateFamily };
