const mongoose = require('mongoose');

// A Product is one specific model/variant within a family — e.g. family
// "B90 Magsafe Silicon" has variants "1+Nord 4 (5G)", "1+Nord 6 (5G)", etc.
// familyName is denormalized onto every variant so order/lead history never
// needs a second populate hop to show "Family — Model" in the UI.
const productSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductFamily', required: true, index: true },
    familyName: { type: String, required: true, trim: true },
    modelName: { type: String, required: true, trim: true }, // e.g. "1+Nord 4 (5G)"
    sku: { type: String, trim: true, default: null, uppercase: true },
    category: { type: String, enum: ['fonfox', 'supreme'], required: true },
    isActive: { type: Boolean, default: true },
    // Physical stock on hand. "Available to promise" is ALWAYS computed live
    // from Order documents (see stockService.js) — never cached here.
    totalStock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 20 },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ familyId: 1, modelName: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ familyId: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
