const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const StockLedger = require('../models/StockLedger');

// Parses uploaded workbook -> [{ name, quantity }]. Expects columns:
// Column A = Product Name, Column B = Quantity (header row skipped).
async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const name = row.getCell(1).text?.trim();
    const qty = Number(row.getCell(2).value);
    if (name && !Number.isNaN(qty) && qty > 0) {
      rows.push({ name, quantity: qty });
    }
  });

  return rows;
}

// POST /api/stock/upload/preview  (multipart, field "file", body.category = fonfox|supreme)
// Returns matched vs unmatched rows WITHOUT committing anything.
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
  const products = await Product.find({ category, isDeleted: false }).lean();
  const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));

  const matched = [];
  const unmatched = [];

  for (const row of rows) {
    const product = byName.get(row.name.trim().toLowerCase());
    if (product) {
      matched.push({ productId: product._id, name: product.name, quantity: row.quantity, currentStock: product.totalStock });
    } else {
      unmatched.push(row);
    }
  }

  res.json({ matched, unmatched, category });
});

// POST /api/stock/upload/commit
// Body: { category, rows: [{ productId, quantity }] }  -- from confirmed preview
const commitUpload = asyncHandler(async (req, res) => {
  const { category, rows } = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    res.status(400);
    throw new Error('No rows to commit');
  }

  const results = [];
  for (const row of rows) {
    const product = await Product.findById(row.productId);
    if (!product || product.category !== category) continue;

    product.totalStock += Number(row.quantity);
    product.lastUpdatedBy = req.user._id;
    await product.save();

    await StockLedger.create({
      productId: product._id,
      quantity: Number(row.quantity),
      addedBy: req.user._id,
      addedByName: req.user.name,
      source: 'excel',
      note: `Excel bulk upload (${category})`,
    });

    results.push({ productId: product._id, name: product.name, newTotal: product.totalStock });
  }

  res.json({ updated: results.length, results });
});

module.exports = { previewUpload, commitUpload };
