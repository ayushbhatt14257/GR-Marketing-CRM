const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "B90"
    sku: { type: String, trim: true, uppercase: true }, // never default to null — see index below
    category: { type: String, enum: ['fonfox', 'supreme'], required: true },
    isActive: { type: Boolean, default: true },
    // Physical stock on hand. "Available to promise" is ALWAYS computed live
    // from Order documents (see stockService.js) — never cached here, so it
    // can never drift out of sync no matter how orders/cancellations flow.
    totalStock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 20 },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ name: 1, category: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
// partialFilterExpression (not sparse) — sparse + an explicit default null both
// cause false "duplicate key" errors once 2+ products lack a sku. Never
// change this back to sparse:true without also removing any default on sku.
productSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
productSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
