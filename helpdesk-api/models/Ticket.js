const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    text:   { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId:    { type: String, unique: true },   // e.g. TKT-0001
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category:    { type: String, required: true },
    subType:     { type: String, default: '' },
    priority:    { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    status:      { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo:  { type: String, default: '' },   // agent name string (simple)
    comments:    [commentSchema],
    resolvedAt:  { type: Date },
  },
  { timestamps: true }
);

// Auto-generate ticketId before save
ticketSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketId = `TKT-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.isModified('status') && this.status === 'Resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
