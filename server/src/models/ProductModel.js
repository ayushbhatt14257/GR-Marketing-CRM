const mongoose = require('mongoose');

// A ProductModel is a reference-only breakdown row under a parent Product —
// e.g. parent "B90" (totalStock: 20) might have models "OnePlus Nord 1" (10)
// and "Vivo V60" (10). This does NOT drive order fulfillment — the parent
// Product.totalStock is still what orders reserve/dispatch against. This is
// purely a tracking layer so warehouse can see which specific units make up
// a parent's stock, with a sync-warning when the two fall out of step
// (e.g. after a dispatch reduces the parent total but nobody's updated the
// model breakdown yet).
const productModelSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productModelSchema.index({ productId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

module.exports = mongoose.model('ProductModel', productModelSchema);
