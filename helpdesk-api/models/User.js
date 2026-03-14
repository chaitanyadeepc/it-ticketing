const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true, minlength: 6, select: false },
    role:       { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
    department: { type: String, default: 'General' },
    phone:      { type: String, default: '' },
    jobTitle:   { type: String, default: '' },
    location:   { type: String, default: '' },
    isActive:      { type: Boolean, default: true },
    tokenVersion:  { type: Number, default: 0 },
    notificationPrefs: {
      emailEnabled:  { type: Boolean, default: true },
      ticketUpdates: { type: Boolean, default: true },
      newComments:   { type: Boolean, default: true },
      weeklyDigest:  { type: Boolean, default: false },
    },
    twoFactor: {
      enabled:          { type: Boolean, default: false },
      method:           { type: String, enum: ['email', 'totp'], default: 'email' },
      totpSecret:       { type: String, select: false },
      pendingOtp:       { type: String, select: false },
      pendingOtpExpiry: { type: Date,   select: false },
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
