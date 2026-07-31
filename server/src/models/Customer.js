const mongoose = require('mongoose');

// Converts "  ravi   kumar" -> "Ravi Kumar", "vkm banglore" -> "Vkm Banglore"
function toTitleCase(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function normalizeKey(str) {
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedKey: { type: String, required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdVia: { type: String, enum: ['lead', 'order', 'dispatch', 'admin'], default: 'lead' },
    phone: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

customerSchema.pre('validate', function (next) {
  if (this.name) {
    this.name = toTitleCase(this.name);
    this.normalizedKey = normalizeKey(this.name);
  }
  next();
});

// One customer name per owner — enforced at DB level too, but app layer should
// always check-and-prompt-select BEFORE hitting this (see customerController).
customerSchema.index({ ownerId: 1, normalizedKey: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

customerSchema.statics.toTitleCase = toTitleCase;
customerSchema.statics.normalizeKey = normalizeKey;

module.exports = mongoose.model('Customer', customerSchema);
