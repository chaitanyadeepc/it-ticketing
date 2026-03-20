const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    message:   { type: String, required: true, trim: true },
    type:      { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    isActive:  { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
