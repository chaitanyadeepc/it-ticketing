const express = require('express');
const KbArticle = require('../models/KbArticle');
const { protect, agentOrAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/kb — list all published articles (public or authenticated)
router.get('/', async (req, res) => {
  try {
    const { q, category } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (q) {
      const re = new RegExp(q.split(' ').filter(Boolean).join('|'), 'i');
      filter.$or = [{ title: re }, { content: re }, { tags: re }];
    }
    const articles = await KbArticle.find(filter).select('-content').sort({ views: -1, createdAt: -1 });
    res.json({ articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kb/:id — view article (increment views)
router.get('/:id', async (req, res) => {
  try {
    const article = await KbArticle.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!article || !article.isPublished) return res.status(404).json({ error: 'Article not found' });
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kb/:id/helpful — anyone authenticated can rate
router.post('/:id/helpful', protect, async (req, res) => {
  try {
    const { vote } = req.body; // 'yes' | 'no'
    if (!['yes', 'no'].includes(vote)) return res.status(400).json({ error: 'vote must be yes or no' });
    const field = vote === 'yes' ? 'helpful' : 'notHelpful';
    const article = await KbArticle.findByIdAndUpdate(
      req.params.id,
      { $inc: { [field]: 1 } },
      { new: true }
    );
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ helpful: article.helpful, notHelpful: article.notHelpful });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All write routes require auth
router.use(protect);

// POST /api/kb — create article (agent or admin)
router.post('/', agentOrAdmin, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const article = await KbArticle.create({
      title,
      content,
      category: category || 'General',
      tags: tags || [],
      author: req.user._id,
      authorName: req.user.name,
    });
    res.status(201).json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/kb/:id — update article (agent or admin)
router.put('/:id', agentOrAdmin, async (req, res) => {
  try {
    const { title, content, category, tags, isPublished } = req.body;
    const article = await KbArticle.findByIdAndUpdate(
      req.params.id,
      { title, content, category, tags, isPublished },
      { new: true, runValidators: true }
    );
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/kb/:id (agent or admin)
router.delete('/:id', agentOrAdmin, async (req, res) => {
  try {
    const article = await KbArticle.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ message: 'Article deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
