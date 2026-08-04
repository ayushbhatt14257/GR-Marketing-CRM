const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const StockLedger = require('../models/StockLedger');
const { getStockSummary } = require('../services/stockService');
const { getModelSyncMap } = require('../services/modelSyncService');

// GET /api/products?category=fonfox&active=true
const listProducts = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.active === 'true') filter.isActive = true;

  const products = await Product.find(filter).populate('lastUpdatedBy', 'name').sort({ name: 1 }).lean();
  const productIds = products.map((p) => p._id);
  const summary = await getStockSummary(productIds);

  const productTotals = {};
  products.forEach((p) => { productTotals[String(p._id)] = p.totalStock; });
  const syncMap = await getModelSyncMap(productIds, productTotals);

  res.json(products.map((p) => ({ ...p, stock: summary[p._id], modelSync: syncMap[p._id] })));
});

// POST /api/products  (warehouse/admin)
const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, totalStock, lowStockThreshold } = req.body;
  if (!name || !category) {
    res.status(400);
    throw new Error('Name and category are required');
  }

  const product = await Product.create({
    name: name.trim(),
    sku: sku ? sku.trim().toUpperCase() : undefined,
    category,
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
      note: 'Initial stock on product creation',
    });
  }

  res.status(201).json(product);
});

// PATCH /api/products/:id
// Supports directly setting totalStock to an exact value (manual quantity
// entry) — logs the delta to StockLedger for audit trail either way.
const updateProduct = asyncHandler(async (req, res) => {
  const { name, sku, isActive, lowStockThreshold, totalStock } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (name) product.name = name.trim();
  if (sku !== undefined) product.sku = sku ? sku.trim().toUpperCase() : undefined;
  if (isActive !== undefined) product.isActive = isActive;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;

  if (totalStock !== undefined && Number(totalStock) !== product.totalStock) {
    const delta = Number(totalStock) - product.totalStock;
    product.totalStock = Number(totalStock);
    await StockLedger.create({
      productId: product._id,
      quantity: delta,
      addedBy: req.user._id,
      addedByName: req.user.name,
      source: 'manual',
      note: `Stock manually set to ${totalStock}`,
    });
  }

  product.lastUpdatedBy = req.user._id;
  await product.save();
  res.json(product);
});

// POST /api/products/:id/stock-in  { quantity, note }  — adds to existing stock
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
  res.json({ message: 'Product deleted' });
});

module.exports = { listProducts, createProduct, updateProduct, stockIn, getLedger, deleteProduct };
