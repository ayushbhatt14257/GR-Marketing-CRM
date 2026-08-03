const mongoose = require('mongoose');

const TALK_REGARDING = ['payment', 'follow_up', 'call_later', 'order_talk'];
// talkRegarding values that require a next follow-up date to be scheduled
const REQUIRES_FOLLOW_UP_DATE = ['follow_up', 'call_later'];

const leadSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    category: { type: String, enum: ['fonfox', 'supreme'], required: true },
    familyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductFamily' }], // which product families were discussed
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // legacy — kept for old records, no longer set by the lead form

    talkRegarding: { type: String, enum: TALK_REGARDING, required: true },
    nextFollowUpDate: { type: Date, default: null }, // required for follow_up / call_later
    remark: { type: String, required: true, trim: true },

    isFollowUpClosed: { type: Boolean, default: false },
    closedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

leadSchema.index({ ownerId: 1, createdAt: -1 });
leadSchema.index({ ownerId: 1, isFollowUpClosed: 1 });
leadSchema.index({ customerId: 1 });
leadSchema.index({ ownerId: 1, isFollowUpClosed: 1, nextFollowUpDate: 1 });

leadSchema.statics.TALK_REGARDING = TALK_REGARDING;
leadSchema.statics.REQUIRES_FOLLOW_UP_DATE = REQUIRES_FOLLOW_UP_DATE;

module.exports = mongoose.model('Lead', leadSchema);
