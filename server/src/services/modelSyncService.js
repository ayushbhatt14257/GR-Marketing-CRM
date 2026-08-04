const ProductModel = require('../models/ProductModel');

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

module.exports = { getModelSyncMap };
