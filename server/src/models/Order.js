const mongoose = require('mongoose');

const ORDER_STATUSES = ['pending', 'reserved', 'partially_dispatched', 'dispatched', 'delivered', 'cancelled'];

// remainingQty = requestedQty - dispatchedQty - cancelledQty (virtual, computed)
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    requestedQty: { type: Number, required: true, min: 1 },
    dispatchedQty: { type: Number, default: 0, min: 0 },
    cancelledQty: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const dispatchEventSchema = new mongoose.Schema(
  {
    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispatchedByName: { type: String, required: true }, // denormalized for fast history display
    items: [{ productId: mongoose.Schema.Types.ObjectId, qty: Number }],
    dispatchedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // credited marketing user
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who actually created it

    category: { type: String, enum: ['fonfox', 'supreme'], required: true },
    items: [orderItemSchema],

    deliveryDate: { type: Date, default: null }, // legacy field, no longer collected on the order form — kept for old records only
    remark: { type: String, default: '', trim: true }, // optional, unlike Lead's remark
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    priorityChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: { type: String, enum: ORDER_STATUSES, required: true, default: 'pending' },
    dispatchLog: [dispatchEventSchema],

    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deliveredAt: { type: Date, default: null },

    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Queue ordering: priority desc (urgent first), then FIFO by creation time.
orderSchema.index({ status: 1, priority: -1, createdAt: 1 });
orderSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
orderSchema.statics.ACTIVE_STATUSES = ['pending', 'reserved', 'partially_dispatched'];

module.exports = mongoose.model('Order', orderSchema);
