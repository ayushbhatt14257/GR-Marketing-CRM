const ProductModel = require('../models/ProductModel');
const Product = require('../models/Product');

// Recomputes a product's totalStock from its models whenever a model is
// created/updated/deleted. If the product has 1+ active models, its stock
// becomes fully auto-managed (sum of models) — manual/Excel edits to
// totalStock are blocked elsewhere (see productController). If the last
// model is removed, it unlocks back to manual entry, leaving totalStock at
// whatever value it last held (not reset to 0).
async function syncParentStock(productId) {
  const models = await ProductModel.find({ productId, isDeleted: false }).select('quantity').lean();

  if (models.length === 0) {
    await Product.updateOne({ _id: productId }, { modelManaged: false });
    return { modelManaged: false, totalStock: null };
  }

  const total = models.reduce((sum, m) => sum + m.quantity, 0);
  await Product.updateOne({ _id: productId }, { totalStock: total, modelManaged: true });
  return { modelManaged: true, totalStock: total };
}

// Returns { [productId]: { modelTotal, inSync, diff } } for the given product
// IDs. Uses exactly ONE aggregation query regardless of how many products
// are passed in — never loop this per-product (see stockService.js for why
// that class of bug is unacceptable here).
async function getModelSyncMap(productIds, productTotals) {
  const sums = await ProductModel.aggregate([
    { $match: { productId: { $in: productIds }, isDeleted: false } },
    { $group: { _id: '$productId', modelTotal: { $sum: '$quantity' } } },
  ]);

  const sumByProduct = {};
  sums.forEach((s) => { sumByProduct[String(s._id)] = s.modelTotal; });

  const result = {};
  for (const id of productIds) {
    const modelTotal = sumByProduct[String(id)] || 0;
    const parentTotal = productTotals[String(id)] ?? 0;
    result[id] = {
      modelTotal,
      hasModels: modelTotal > 0 || sumByProduct[String(id)] !== undefined,
      inSync: modelTotal === parentTotal,
      diff: parentTotal - modelTotal,
    };
  }
  return result;
}

module.exports = { getModelSyncMap, syncParentStock };
