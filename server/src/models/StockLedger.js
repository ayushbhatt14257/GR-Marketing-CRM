const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true }, // positive = stock in
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedByName: { type: String, required: true },
    source: { type: String, enum: ['manual', 'excel'], default: 'manual' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

stockLedgerSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
