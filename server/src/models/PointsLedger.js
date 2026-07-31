const mongoose = require('mongoose');

const pointsLedgerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    points: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['daily_login', 'task_completed', 'admin_adjustment'],
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    dateKey: { type: String, default: null }, // YYYY-MM-DD IST — dedup key for daily_login
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

pointsLedgerSchema.index({ userId: 1, createdAt: -1 });
pointsLedgerSchema.index(
  { userId: 1, dateKey: 1, reason: 1 },
  { unique: true, partialFilterExpression: { reason: 'daily_login', dateKey: { $type: 'string' } } }
);

module.exports = mongoose.model('PointsLedger', pointsLedgerSchema);
