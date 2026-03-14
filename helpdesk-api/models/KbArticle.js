const mongoose = require('mongoose');

const kbArticleSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true },
    content:  { type: String, required: true },
    category: { type: String, default: 'General' },
    tags:     [{ type: String }],
    author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
    isPublished: { type: Boolean, default: true },
    views:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KbArticle', kbArticleSchema);
