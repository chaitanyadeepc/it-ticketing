const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    text:   { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
  },
  { timestamps: true }
);

const internalNoteSchema = new mongoose.Schema(
  {
    text:       { type: String, required: true },
    author:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
    authorRole: String,
  },
  { timestamps: true }
);

const historySchema = new mongoose.Schema(
  {
    action:     { type: String, required: true },
    field:      { type: String },
    from:       { type: String },
    to:         { type: String },
    by:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName:     { type: String },
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    url:        { type: String, required: true },
    publicId:   { type: String },           // cloudinary public_id for deletion
    filename:   { type: String },
    mimetype:   { type: String },
    size:       { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploaderName: { type: String },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId:    { type: String, unique: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category:    { type: String, required: true },
    subType:     { type: String, default: '' },
    priority:    { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    status:      { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo:  { type: String, default: '' },
    comments:    [commentSchema],
    internalNotes: [internalNoteSchema],
    history:     [historySchema],
    attachments: [attachmentSchema],
    satisfaction: {
      rating:      { type: Number, min: 1, max: 5 },
      feedback:    { type: String, default: '' },
      submittedAt: { type: Date },
    },
    resolvedAt:  { type: Date },
    dueDate:     { type: Date, default: null },
    watchers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Kiosk walk-in submissions
    submittedVia: { type: String, enum: ['web', 'chatbot', 'kiosk', 'api', 'csv'], default: 'web' },
    kioskName:    { type: String, default: '' },
    kioskEmail:   { type: String, default: '' },
    // Read-only share token (Batch 2)
    shareToken:   { type: String, default: null, select: false },
    shareTokenExpiry: { type: Date, default: null, select: false },
    // Agent handoff note (Batch 4)
    handoffNote:  { type: String, default: '' },
    // Complexity score 1-5 (Batch 5)
    complexity:   { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: true }
);

// Auto-generate ticketId before save — uses last existing ID, not count,
// so deletions / gaps never break the sequence.
ticketSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const lastTicket = await mongoose.model('Ticket')
        .findOne({ ticketId: { $regex: /^TKT-\d+$/ } })
        .sort({ createdAt: -1 })
        .select('ticketId');

      let nextNum = 1;
      if (lastTicket?.ticketId) {
        const m = lastTicket.ticketId.match(/TKT-(\d+)/);
        if (m) nextNum = parseInt(m[1], 10) + 1;
      }

      this.ticketId = `TKT-${String(nextNum).padStart(4, '0')}`;
    } catch (e) {
      return next(e);
    }

    this.history.push({
      action: 'Ticket created',
      field: 'created',
      to: 'Open',
      by: this.createdBy || null,
      byName: this.kioskName || 'System',
    });
  }
  if (this.isModified('status') && this.status === 'Resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
