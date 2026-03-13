const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true, minlength: 6, select: false },
    role:       { type: String, enum: ['user', 'admin'], default: 'user' },
    department: { type: String, default: 'General' },
    phone:      { type: String, default: '' },
    jobTitle:   { type: String, default: '' },
    location:   { type: String, default: '' },
    isActive:      { type: Boolean, default: true },
    tokenVersion:  { type: Number, default: 0 },
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
