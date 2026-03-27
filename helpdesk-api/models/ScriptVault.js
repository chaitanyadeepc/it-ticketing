const mongoose = require('mongoose');

const scriptVaultSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true, maxlength: 200 },
    // Stored as gzip-compressed Buffer; isCompressed flag distinguishes old plain-text docs.
    // NO default — old docs have this field absent in MongoDB, so Mongoose returns undefined,
    // which lets getContent treat them as plain text instead of trying to gunzip them.
    content:      { type: Buffer, required: true },
    isCompressed: { type: Boolean },
    language:     { type: String, default: 'text', trim: true },
    description:  { type: String, trim: true, maxlength: 500 },
    // 'all'    → every authenticated user
    // 'staff'  → agents + admins
    // 'admins' → admins only
    // 'custom' → only users listed in allowedUsers (admins always implicitly included)
    visibility:   { type: String, enum: ['all', 'staff', 'admins', 'custom'], default: 'all' },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName:   { type: String },
    // Zip-file snippets — file bytes are stored in GridFS; only the ObjectId is kept here
    isZip:        { type: Boolean, default: false },
    zipName:      { type: String },
    zipSize:      { type: Number },   // original bytes
    gridfsId:     { type: mongoose.Schema.Types.ObjectId }, // GridFS file _id
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScriptVault', scriptVaultSchema);
