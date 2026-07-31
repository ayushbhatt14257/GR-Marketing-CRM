const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');

// Parses uploaded workbook -> [name, name, ...]. Expects a single column of
// names (header row skipped). Extra columns are ignored.
async function parseNames(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const names = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const name = row.getCell(1).text?.trim();
    if (name) names.push(name);
  });

  return names;
}

// POST /api/book-match/preview  (admin only, multipart: file, body.userId)
// Uploads a party ledger sheet and checks which names already exist as
// customers under the selected user's book, and which don't.
// Nothing from the sheet is ever saved to the database.
const previewBookMatch = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!req.file) {
    res.status(400);
    throw new Error('Excel file is required');
  }
  if (!userId) {
    res.status(400);
    throw new Error('Select whose book this is first');
  }

  const names = await parseNames(req.file.buffer);
  if (!names.length) {
    res.status(400);
    throw new Error('No names found in the uploaded sheet — expected a single column of customer names');
  }

  const normalizedList = names.map((n) => ({ original: n, key: Customer.normalizeKey(n) }));
  const keys = normalizedList.map((n) => n.key);

  const existing = await Customer.find({ ownerId: userId, isDeleted: false, normalizedKey: { $in: keys } })
    .select('name normalizedKey createdAt createdVia')
    .lean();
  const existingMap = new Map(existing.map((c) => [c.normalizedKey, c]));

  const matched = [];
  const unmatched = [];

  for (const entry of normalizedList) {
    const found = existingMap.get(entry.key);
    if (found) {
      matched.push({ name: entry.original, matchedAs: found.name, addedOn: found.createdAt, via: found.createdVia });
    } else {
      unmatched.push({ name: entry.original });
    }
  }

  res.json({
    totalInSheet: names.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    matched,
    unmatched,
  });
});

module.exports = { previewBookMatch };
