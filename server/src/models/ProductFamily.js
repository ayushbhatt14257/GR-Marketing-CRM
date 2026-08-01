const mongoose = require('mongoose');

const productFamilySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "B90 Magsafe Silicon"
    category: { type: String, enum: ['fonfox', 'supreme'], required: true },
    isActive: { type: Boolean, default: true },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productFamilySchema.index({ name: 1, category: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
productFamilySchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('ProductFamily', productFamilySchema);
