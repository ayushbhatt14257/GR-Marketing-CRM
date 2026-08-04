const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const StockLedger = require('../models/StockLedger');

// Parses uploaded workbook -> [{ name, quantity }]. Expects two columns:
// Column A = Product name, Column B = Quantity (header row skipped).
async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const name = row.getCell(1).text?.trim();
    const rawQty = row.getCell(2).text || row.getCell(2).value;
    const qty = Number(String(rawQty).replace(/[^\d.]/g, ''));
    if (name && !Number.isNaN(qty) && qty > 0) {
      rows.push({ name, quantity: qty });
    }
  });

  return rows;
}

// POST /api/stock/upload/preview  (multipart: file, body.category)
const previewUpload = asyncHandler(async (req, res) => {
  const { category } = req.body;
  if (!req.file) {
    res.status(400);
    throw new Error('Excel file is required');
  }
  if (!['fonfox', 'supreme'].includes(category)) {
    res.status(400);
    throw new Error('Category must be fonfox or supreme');
  }

  const rows = await parseWorkbook(req.file.buffer);
  if (!rows.length) {
    res.status(400);
    throw new Error('No valid rows found — expected columns: Product name, Quantity');
  }

  const existing = await Product.find({ category, isDeleted: false }).lean();
  const byName = new Map(existing.map((p) => [p.name.trim().toLowerCase(), p]));

  const toUpdate = [];
  const toCreate = [];
  const skippedManaged = [];

  for (const row of rows) {
    const found = byName.get(row.name.trim().toLowerCase());
    if (found) {
      if (found.modelManaged) {
        // This product's stock is controlled by its Model Stock breakdown —
        // flat upload can't touch it. Surface it so the sheet owner knows why.
        skippedManaged.push({ name: found.name, quantity: row.quantity });
      } else {
        toUpdate.push({ productId: found._id, name: found.name, quantity: row.quantity, currentStock: found.totalStock });
      }
    } else {
      toCreate.push({ name: row.name, quantity: row.quantity });
    }
  }

  res.json({ category, toUpdate, toCreate, skippedManaged });
});

// POST /api/stock/upload/commit
// Body: { category, mode: 'add'|'set', toUpdate: [{productId, quantity}], toCreate: [{name, quantity}] }
const commitUpload = asyncHandler(async (req, res) => {
  const { category, mode = 'add', toUpdate = [], toCreate = [] } = req.body;
  if (!['fonfox', 'supreme'].includes(category)) {
    res.status(400);
    throw new Error('Invalid category');
  }

  let updated = 0;
  let created = 0;
  const ledgerDocs = [];

  if (toUpdate.length) {
    const ids = toUpdate.map((r) => r.productId);
    const existing = await Product.find({ _id: { $in: ids } }).select('totalStock').lean();
    const stockById = new Map(existing.map((p) => [String(p._id), p.totalStock]));

    const bulkOps = [];
    for (const row of toUpdate) {
      const previousStock = stockById.get(String(row.productId));
      if (previousStock === undefined) continue;
      const qty = Number(row.quantity);
      const newStock = mode === 'set' ? qty : previousStock + qty;
      const delta = newStock - previousStock;

      bulkOps.push({
        updateOne: {
          filter: { _id: row.productId },
          update: { $set: { totalStock: newStock, lastUpdatedBy: req.user._id } },
        },
      });
      ledgerDocs.push({
        productId: row.productId,
        quantity: delta,
        addedBy: req.user._id,
        addedByName: req.user.name,
        source: 'excel',
        note: mode === 'set' ? `Excel bulk upload — stock set to ${qty}` : 'Excel bulk upload',
      });
    }

    if (bulkOps.length) {
      await Product.bulkWrite(bulkOps);
      updated = bulkOps.length;
    }
  }

  if (toCreate.length) {
    const docs = toCreate.map((row) => ({
      name: row.name.trim(),
      category,
      totalStock: Number(row.quantity),
      lastUpdatedBy: req.user._id,
    }));

    const inserted = await Product.insertMany(docs, { ordered: false });
    created = inserted.length;

    inserted.forEach((product, i) => {
      ledgerDocs.push({
        productId: product._id,
        quantity: docs[i].totalStock,
        addedBy: req.user._id,
        addedByName: req.user.name,
        source: 'excel',
        note: 'Excel bulk upload — new product',
      });
    });
  }

  if (ledgerDocs.length) {
    await StockLedger.insertMany(ledgerDocs, { ordered: false });
  }

  res.json({ updated, created });
});

module.exports = { previewUpload, commitUpload };
