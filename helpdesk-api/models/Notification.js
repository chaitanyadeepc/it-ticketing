const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:    { type: String, enum: ['ticket_update', 'comment', 'assignment', 'sla_breach', 'due_date', 'auto_close', 'mention', 'system'], default: 'ticket_update' },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    link:    { type: String, default: '' },      // e.g. /tickets/:id
    isRead:  { type: Boolean, default: false, index: true },
    ticketId: { type: String, default: '' },      // human-readable TKT-XXXX
  },
  { timestamps: true }
);

// Expire notifications after 30 days automatically
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model('Notification', notificationSchema);
