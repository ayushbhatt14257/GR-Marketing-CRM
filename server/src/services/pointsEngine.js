const User = require('../models/User');
const PointsLedger = require('../models/PointsLedger');
const ActivityLog = require('../models/ActivityLog');
const { toISTDateKey } = require('../utils/dateHelpers');

const DAILY_LOGIN_POINTS = 2;

function currentISTMonth() {
  const key = toISTDateKey();
  return key.slice(0, 7); // YYYY-MM
}

async function addPoints(userId, points, reason, refId = null, note = '', dateKey = null) {
  const month = currentISTMonth();
  const user = await User.findById(userId);
  if (!user) return null;

  if (user.lastPointsMonth !== month) {
    user.monthlyPoints = 0;
    user.lastPointsMonth = month;
  }
  user.totalPoints += points;
  user.monthlyPoints += points;
  await user.save();

  await PointsLedger.create({ userId, points, reason, refId, note, dateKey });
  return user;
}

// Called on login. Awards 2 pts once per IST day, updates streak (consecutive
// day logins — LeetCode style), returns streak info for toast/celebration UI.
async function handleDailyLogin(userId) {
  const today = toISTDateKey();
  const user = await User.findById(userId);
  if (!user) return null;

  const alreadyToday = user.lastLoginDate === today;
  let streakMilestone = null;

  if (!alreadyToday) {
    const yesterday = toISTDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    user.currentStreak = user.lastLoginDate === yesterday ? user.currentStreak + 1 : 1;
    user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
    user.lastLoginDate = today;
    await user.save();

    try {
      await addPoints(userId, DAILY_LOGIN_POINTS, 'daily_login', null, 'Daily login', today);
    } catch (e) {
      // Unique index guards against double-award race; ignore duplicate errors.
      if (e.code !== 11000) throw e;
    }

    await ActivityLog.findOneAndUpdate(
      { userId, dateKey: today },
      { $set: { loggedIn: true }, $setOnInsert: { leadsCount: 0, ordersCount: 0, followUpsClosedCount: 0, score: 0 } },
      { upsert: true }
    );

    if ([3, 7, 14, 30, 60, 100].includes(user.currentStreak)) {
      streakMilestone = user.currentStreak;
    }
  }

  return { currentStreak: user.currentStreak, longestStreak: user.longestStreak, streakMilestone, alreadyAwardedToday: alreadyToday };
}

// Bumps today's activity log for the heatmap. type: 'lead' | 'order' | 'followup'
async function recordActivity(userId, type) {
  const today = toISTDateKey();
  const field = type === 'lead' ? 'leadsCount' : type === 'order' ? 'ordersCount' : 'followUpsClosedCount';
  const weight = type === 'lead' ? 1 : type === 'order' ? 2 : 1;

  const log = await ActivityLog.findOneAndUpdate(
    { userId, dateKey: today },
    { $inc: { [field]: 1, score: weight } },
    { upsert: true, new: true }
  );
  return log;
}

module.exports = { addPoints, handleDailyLogin, recordActivity, DAILY_LOGIN_POINTS };
