const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'marketing', 'warehouse', 'dispatch'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: 'marketing' },
    isActive: { type: Boolean, default: true },
    avatarColor: { type: String, default: '#6366f1' },

    // Points / gamification
    totalPoints: { type: Number, default: 0 },
    monthlyPoints: { type: Number, default: 0 },
    lastPointsMonth: { type: String, default: null },

    // Login streak (LeetCode-style)
    lastLoginDate: { type: String, default: null }, // YYYY-MM-DD IST
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
