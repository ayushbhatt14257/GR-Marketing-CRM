const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const ProductFamily = require('../models/ProductFamily');
const StockLedger = require('../models/StockLedger');

// Parses uploaded workbook -> [{ name, quantity }]. Expects two columns:
// Column A = Item / Model name, Column B = Quantity (header row skipped).
async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const name = row.getCell(1).text?.trim();
    // Quantity cells sometimes come through as "1320 N" style text (per the
    // reference sheet) — strip anything non-numeric before parsing.
    const rawQty = row.getCell(2).text || row.getCell(2).value;
    const qty = Number(String(rawQty).replace(/[^\d.]/g, ''));
    if (name && !Number.isNaN(qty) && qty > 0) {
      rows.push({ name, quantity: qty });
    }
  });

  return rows;
}

// POST /api/stock/upload/preview  (multipart: file, body.familyId)
// Returns which rows match EXISTING models (will top up stock) vs which are
// NEW model names (will be created under this family with that as initial stock).
const previewUpload = asyncHandler(async (req, res) => {
  const { familyId } = req.body;
  if (!req.file) {
    res.status(400);
    throw new Error('Excel file is required');
  }
  const family = await ProductFamily.findById(familyId);
  if (!family) {
    res.status(400);
    throw new Error('Select a valid product family first');
  }

  const rows = await parseWorkbook(req.file.buffer);
  if (!rows.length) {
    res.status(400);
    throw new Error('No valid rows found — expected columns: Item name, Quantity');
  }

  const existing = await Product.find({ familyId, isDeleted: false }).lean();
  const byName = new Map(existing.map((p) => [p.modelName.trim().toLowerCase(), p]));

  const toUpdate = [];
  const toCreate = [];

  for (const row of rows) {
    const found = byName.get(row.name.trim().toLowerCase());
    if (found) {
      toUpdate.push({ productId: found._id, modelName: found.modelName, quantity: row.quantity, currentStock: found.totalStock });
    } else {
      toCreate.push({ modelName: row.name, quantity: row.quantity });
    }
  }

  res.json({ familyId, familyName: family.name, category: family.category, toUpdate, toCreate });
});

// POST /api/stock/upload/commit
// Body: { familyId, mode: 'add'|'set', toUpdate: [{productId, quantity}], toCreate: [{modelName, quantity}] }
// mode 'add' (default) adds quantity to existing stock (delta/replenishment sheet).
// mode 'set' treats quantity as the new exact total (physical stock count / reconciliation sheet).
const commitUpload = asyncHandler(async (req, res) => {
  const { familyId, mode = 'add', toUpdate = [], toCreate = [] } = req.body;
  const family = await ProductFamily.findById(familyId);
  if (!family) {
    res.status(400);
    throw new Error('Invalid product family');
  }

  let updated = 0;
  let created = 0;

  for (const row of toUpdate) {
    const product = await Product.findById(row.productId);
    if (!product) continue;

    const previousStock = product.totalStock;
    const newQty = Number(row.quantity);
    product.totalStock = mode === 'set' ? newQty : previousStock + newQty;
    product.lastUpdatedBy = req.user._id;
    await product.save();

    const delta = product.totalStock - previousStock;
    await StockLedger.create({
      productId: product._id,
      quantity: delta,
      addedBy: req.user._id,
      addedByName: req.user.name,
      source: 'excel',
      note: mode === 'set'
        ? `Excel bulk upload — stock set to ${newQty} (${family.name})`
        : `Excel bulk upload (${family.name})`,
    });
    updated += 1;
  }

  for (const row of toCreate) {
    const product = await Product.create({
      familyId,
      familyName: family.name,
      modelName: row.modelName.trim(),
      category: family.category,
      totalStock: Number(row.quantity),
      lastUpdatedBy: req.user._id,
    });

    await StockLedger.create({
      productId: product._id,
      quantity: Number(row.quantity),
      addedBy: req.user._id,
      addedByName: req.user.name,
      source: 'excel',
      note: `Excel bulk upload — new model (${family.name})`,
    });
    created += 1;
  }

  res.json({ updated, created });
});

module.exports = { previewUpload, commitUpload };
