const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { signToken } = require('../utils/tokens');
const { handleDailyLogin } = require('../services/pointsEngine');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase().trim() });

  if (!user || !user.isActive || !(await user.comparePassword(password || ''))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const loginResult = await handleDailyLogin(user._id);
  const token = signToken(user);

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarColor: user.avatarColor,
      totalPoints: user.totalPoints,
      currentStreak: loginResult?.currentStreak ?? user.currentStreak,
    },
    loginResult,
  });
});

// GET /api/auth/me
// Also runs the daily check-in (idempotent — handleDailyLogin only awards
// once per IST day regardless of how many times this is called). This means
// a user who never explicitly logs out — just keeps their session token and
// opens the app on a new day — still gets their +2 points and streak update,
// instead of only being credited on an actual login form submission.
const me = asyncHandler(async (req, res) => {
  const loginResult = await handleDailyLogin(req.user._id);
  const freshUser = await User.findById(req.user._id).select('-passwordHash');

  res.json({
    user: freshUser,
    loginResult,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!(await user.comparePassword(oldPassword || ''))) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  res.json({ message: 'Password updated successfully' });
});

module.exports = { login, me, changePassword };
