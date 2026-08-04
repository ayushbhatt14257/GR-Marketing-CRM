const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const ProductModel = require('../models/ProductModel');
const { getModelSyncMap, syncParentStock } = require('../services/modelSyncService');

// GET /api/model-stock?productId=  -- list models for one product
const listModels = asyncHandler(async (req, res) => {
  const { productId } = req.query;
  if (!productId) {
    res.status(400);
    throw new Error('productId is required');
  }

  if (['marketing', 'dispatch'].includes(req.user.role) && req.user.productAccess !== 'both') {
    const product = await Product.findById(productId).select('category').lean();
    if (product && product.category !== req.user.productAccess) {
      res.status(403);
      throw new Error('You do not have access to this category');
    }
  }

  const models = await ProductModel.find({ productId, isDeleted: false }).sort({ name: 1 }).lean();
  res.json(models);
});

// POST /api/model-stock  { productId, name, quantity }
const createModel = asyncHandler(async (req, res) => {
  const { productId, name, quantity } = req.body;
  if (!productId || !name) {
    res.status(400);
    throw new Error('productId and name are required');
  }
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Parent product not found');
  }

  const model = await ProductModel.create({
    productId,
    name: name.trim(),
    quantity: Number(quantity) || 0,
    lastUpdatedBy: req.user._id,
  });
  const sync = await syncParentStock(productId);
  res.status(201).json({ ...model.toObject(), parentSync: sync });
});

// PATCH /api/model-stock/:id  { name, quantity }
const updateModel = asyncHandler(async (req, res) => {
  const { name, quantity } = req.body;
  const model = await ProductModel.findById(req.params.id);
  if (!model) {
    res.status(404);
    throw new Error('Model not found');
  }
  if (name) model.name = name.trim();
  if (quantity !== undefined) model.quantity = Number(quantity);
  model.lastUpdatedBy = req.user._id;
  await model.save();
  const sync = await syncParentStock(model.productId);
  res.json({ ...model.toObject(), parentSync: sync });
});

// DELETE /api/model-stock/:id
const deleteModel = asyncHandler(async (req, res) => {
  const model = await ProductModel.findById(req.params.id);
  if (!model) {
    res.status(404);
    throw new Error('Model not found');
  }
  model.isDeleted = true;
  await model.save();
  const sync = await syncParentStock(model.productId);
  res.json({ message: 'Model deleted', parentSync: sync });
});

// ---------- Excel upload (per parent product) ----------

async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const name = row.getCell(1).text?.trim();
    const rawQty = row.getCell(2).text || row.getCell(2).value;
    const qty = Number(String(rawQty).replace(/[^\d.]/g, ''));
    if (name && !Number.isNaN(qty) && qty >= 0) rows.push({ name, quantity: qty });
  });
  return rows;
}

// POST /api/model-stock/upload/preview  (multipart: file, body.productId)
const previewUpload = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!req.file) {
    res.status(400);
    throw new Error('Excel file is required');
  }
  const product = await Product.findById(productId);
  if (!product) {
    res.status(400);
    throw new Error('Select a valid parent product first');
  }

  const rows = await parseWorkbook(req.file.buffer);
  if (!rows.length) {
    res.status(400);
    throw new Error('No valid rows found — expected columns: Product name, Quantity');
  }

  const existing = await ProductModel.find({ productId, isDeleted: false }).lean();
  const byName = new Map(existing.map((m) => [m.name.trim().toLowerCase(), m]));

  const toUpdate = [];
  const toCreate = [];
  for (const row of rows) {
    const found = byName.get(row.name.trim().toLowerCase());
    if (found) {
      toUpdate.push({ modelId: found._id, name: found.name, quantity: row.quantity, currentQty: found.quantity });
    } else {
      toCreate.push({ name: row.name, quantity: row.quantity });
    }
  }

  res.json({ productId, productName: product.name, toUpdate, toCreate });
});

// POST /api/model-stock/upload/commit
// Body: { productId, mode: 'add'|'set', toUpdate: [{modelId, quantity}], toCreate: [{name, quantity}] }
const commitUpload = asyncHandler(async (req, res) => {
  const { productId, mode = 'set', toUpdate = [], toCreate = [] } = req.body;
  const product = await Product.findById(productId);
  if (!product) {
    res.status(400);
    throw new Error('Invalid parent product');
  }

  let updated = 0;
  let created = 0;

  if (toUpdate.length) {
    const ids = toUpdate.map((r) => r.modelId);
    const existing = await ProductModel.find({ _id: { $in: ids } }).select('quantity').lean();
    const qtyById = new Map(existing.map((m) => [String(m._id), m.quantity]));

    const bulkOps = toUpdate
      .filter((row) => qtyById.has(String(row.modelId)))
      .map((row) => {
        const prev = qtyById.get(String(row.modelId));
        const newQty = mode === 'set' ? Number(row.quantity) : prev + Number(row.quantity);
        return { updateOne: { filter: { _id: row.modelId }, update: { $set: { quantity: newQty, lastUpdatedBy: req.user._id } } } };
      });

    if (bulkOps.length) {
      await ProductModel.bulkWrite(bulkOps);
      updated = bulkOps.length;
    }
  }

  if (toCreate.length) {
    const docs = toCreate.map((row) => ({
      productId,
      name: row.name.trim(),
      quantity: Number(row.quantity),
      lastUpdatedBy: req.user._id,
    }));
    const inserted = await ProductModel.insertMany(docs, { ordered: false });
    created = inserted.length;
  }

  const sync = await syncParentStock(productId);
  res.json({ updated, created, parentSync: sync });
});

// ---------- Export ----------

// GET /api/model-stock/export?productId=&category=
// Exports whatever the current filtered view represents: one product's model
// breakdown, all models across a category, or (no params) everything.
const exportModels = asyncHandler(async (req, res) => {
  let { productId, category } = req.query;
  const dateStr = new Date().toISOString().slice(0, 10);

  const isRestricted = ['marketing', 'dispatch'].includes(req.user.role) && req.user.productAccess !== 'both';

  let filter = { isDeleted: false };
  let filename = `model-stock-${dateStr}.xlsx`;

  if (productId) {
    const product = await Product.findById(productId).lean();
    if (isRestricted && product && product.category !== req.user.productAccess) {
      res.status(403);
      throw new Error('You do not have access to this category');
    }
    filter.productId = productId;
    filename = `model-stock-${(product?.name || 'product').replace(/\s+/g, '-')}-${dateStr}.xlsx`;
  } else {
    // No specific product requested — restricted users can only ever export
    // their own category, regardless of what (if anything) was requested.
    if (isRestricted) category = req.user.productAccess;
    if (category) {
      const products = await Product.find({ category, isDeleted: false }).select('_id').lean();
      filter.productId = { $in: products.map((p) => p._id) };
      filename = `model-stock-${category}-${dateStr}.xlsx`;
    }
  }

  const models = await ProductModel.find(filter).populate('productId', 'name category').sort({ name: 1 }).lean();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Model Stock');
  sheet.columns = [
    { header: 'Parent Product', key: 'parent', width: 25 },
    { header: 'Category', key: 'category', width: 12 },
    { header: 'Model Name', key: 'name', width: 30 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Last Updated', key: 'updatedAt', width: 20 },
  ];
  models.forEach((m) => {
    sheet.addRow({
      parent: m.productId?.name || '—',
      category: m.productId?.category || '—',
      name: m.name,
      quantity: m.quantity,
      updatedAt: new Date(m.updatedAt).toLocaleString(),
    });
  });
  sheet.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = { listModels, createModel, updateModel, deleteModel, previewUpload, commitUpload, exportModels };
