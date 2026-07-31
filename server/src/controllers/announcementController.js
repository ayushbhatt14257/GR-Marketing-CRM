const asyncHandler = require('../utils/asyncHandler');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { notifyMany } = require('../services/notificationService');

// GET /api/announcements  -- visible ones for current user's role
const listAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({
    isDeleted: false,
    $or: [{ targetRoles: { $size: 0 } }, { targetRoles: req.user.role }],
  })
    .populate('createdBy', 'name')
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(50)
    .lean();
  res.json(announcements);
});

// POST /api/announcements  (admin only)  { title, message, targetRoles: [] or ['marketing'] }
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, targetRoles = [], isPinned = false } = req.body;
  if (!title || !message) {
    res.status(400);
    throw new Error('Title and message are required');
  }

  const announcement = await Announcement.create({
    title: title.trim(),
    message: message.trim(),
    createdBy: req.user._id,
    targetRoles,
    isPinned,
  });

  const filter = { isActive: true };
  if (targetRoles.length) filter.role = { $in: targetRoles };
  const recipients = await User.find(filter).select('_id').lean();

  await notifyMany(
    recipients.map((r) => r._id),
    { title: `📢 ${title}`, message, type: 'announcement', refId: announcement._id }
  );

  res.status(201).json(announcement);
});

// DELETE /api/announcements/:id (admin)
const deleteAnnouncement = asyncHandler(async (req, res) => {
  await Announcement.updateOne({ _id: req.params.id }, { isDeleted: true });
  res.json({ message: 'Announcement removed' });
});

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
