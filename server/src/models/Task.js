const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, default: null },
    bonusPoints: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    completedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
