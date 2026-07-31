const Notification = require('../models/Notification');

async function notify(userId, { title, message, type = 'announcement', refId = null }) {
  return Notification.create({ userId, title, message, type, refId });
}

async function notifyMany(userIds, payload) {
  const docs = userIds.map((userId) => ({ userId, ...payload }));
  return Notification.insertMany(docs);
}

module.exports = { notify, notifyMany };
