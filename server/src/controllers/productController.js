const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const ProductFamily = require('../models/ProductFamily');
const StockLedger = require('../models/StockLedger');
const { getStockSummary } = require('../services/stockService');

// GET /api/products?familyId=&category=&active=true
const listProducts = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  if (req.query.familyId) filter.familyId = req.query.familyId;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.active === 'true') filter.isActive = true;

  const products = await Product.find(filter).sort({ modelName: 1 }).lean();
  const summary = await getStockSummary(products.map((p) => p._id));

  res.json(products.map((p) => ({ ...p, stock: summary[p._id] })));
});

// POST /api/products  (warehouse/admin) - add a single model under a family
const createProduct = asyncHandler(async (req, res) => {
  const { familyId, modelName, sku, totalStock, lowStockThreshold } = req.body;
  if (!familyId || !modelName) {
    res.status(400);
    throw new Error('Family and model name are required');
  }

  const family = await ProductFamily.findById(familyId);
  if (!family) {
    res.status(404);
    throw new Error('Product family not found');
  }

  const product = await Product.create({
    familyId,
    familyName: family.name,
    modelName: modelName.trim(),
    sku: sku ? sku.trim().toUpperCase() : undefined,
    category: family.category,
    totalStock: totalStock || 0,
    lowStockThreshold: lowStockThreshold || 20,
    lastUpdatedBy: req.user._id,
  });

  if (totalStock) {
    await StockLedger.create({
      productId: product._id,
      quantity: totalStock,
      addedBy: req.user._id,
      addedByName: req.user.name,
      source: 'manual',
      note: 'Initial stock on model creation',
    });
  }

  res.status(201).json(product);
});

// PATCH /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const { modelName, sku, isActive, lowStockThreshold } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (modelName) product.modelName = modelName.trim();
  if (sku !== undefined) product.sku = sku ? sku.trim().toUpperCase() : undefined;
  if (isActive !== undefined) product.isActive = isActive;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
  product.lastUpdatedBy = req.user._id;

  await product.save();
  res.json(product);
});

// POST /api/products/:id/stock-in  { quantity, note }
const stockIn = asyncHandler(async (req, res) => {
  const { quantity, note } = req.body;
  if (!quantity || quantity <= 0) {
    res.status(400);
    throw new Error('Quantity must be greater than 0');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  product.totalStock += Number(quantity);
  product.lastUpdatedBy = req.user._id;
  await product.save();

  await StockLedger.create({
    productId: product._id,
    quantity: Number(quantity),
    addedBy: req.user._id,
    addedByName: req.user.name,
    source: 'manual',
    note: note || '',
  });

  res.json(product);
});

// GET /api/products/:id/ledger
const getLedger = asyncHandler(async (req, res) => {
  const ledger = await StockLedger.find({ productId: req.params.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(ledger);
});

// DELETE /api/products/:id  (admin only) - soft delete
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  product.isDeleted = true;
  product.isActive = false;
  product.lastUpdatedBy = req.user._id;
  await product.save();
  res.json({ message: 'Model deleted' });
});

module.exports = { listProducts, createProduct, updateProduct, stockIn, getLedger, deleteProduct };
