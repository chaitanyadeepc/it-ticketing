const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action:   { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['AUTH', 'TICKET', 'COMMENT', 'USER_MGMT', 'SETTINGS', 'ADMIN', 'SYSTEM'],
      default: 'SYSTEM',
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info',
    },
    detail:   { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Actor snapshot — stored at write-time so log is immutable even if user is deleted
    actor: {
      id:    { type: String, default: null },
      name:  { type: String, default: 'Unknown' },
      email: { type: String, default: 'unknown@system' },
      role:  { type: String, default: 'user' },
    },

    sessionId: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ip:        { type: String, default: '' },
  },
  {
    timestamps: true,
    // Capped at 50,000 documents — oldest auto-evicted by MongoDB (no manual pruning needed)
    capped: { size: 50 * 1024 * 1024, max: 50000 },
  }
);

// Index for fast admin queries
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ category: 1 });
activityLogSchema.index({ severity: 1 });
activityLogSchema.index({ 'actor.email': 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
