const mongoose = require('mongoose');

const cannedResponseSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true },
    body:     { type: String, required: true },
    category: { type: String, default: 'General' },
    tags:     [{ type: String }],
    isGlobal: { type: Boolean, default: true },  // false = personal (future use)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
    usageCount:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CannedResponse', cannedResponseSchema);
