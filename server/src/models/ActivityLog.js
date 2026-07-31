const mongoose = require('mongoose');

// One doc per user per IST day. Incremented as leads/orders/followups happen.
// Powers the GitHub-style contribution heatmap (graded by `score`).
const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dateKey: { type: String, required: true }, // YYYY-MM-DD IST
    leadsCount: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
    followUpsClosedCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 }, // weighted total, drives color intensity
    loggedIn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

activityLogSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
