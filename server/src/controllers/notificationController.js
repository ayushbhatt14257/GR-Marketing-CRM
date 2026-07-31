const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');

// GET /api/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { isRead: true });
  res.json({ message: 'Marked as read' });
});

// DELETE /api/notifications/:id  (single clear)
const clearOne = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Cleared' });
});

// DELETE /api/notifications  (clear all)
const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });
  res.json({ message: 'All notifications cleared' });
});

module.exports = { listNotifications, markRead, clearOne, clearAll };
