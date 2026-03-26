const mongoose = require('mongoose');

const codeShareSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    content:     { type: String, required: true, maxlength: 100000 },
    language:    { type: String, default: 'text', trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    // 'all'    → every authenticated user
    // 'staff'  → agents + admins
    // 'admins' → admins only
    // 'custom' → only users listed in allowedUsers (admins always implicitly included)
    visibility:   { type: String, enum: ['all', 'staff', 'admins', 'custom'], default: 'all' },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName:   { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodeShare', codeShareSchema);
