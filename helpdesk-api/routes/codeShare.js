const express = require('express');
const CodeShare = require('../models/CodeShare');
const { protect, adminOnly, agentOrAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/codeshare — list snippets visible to the requester
router.get('/', async (req, res) => {
  try {
    const userRole = req.user.role;
    // admins and agents see everything; regular users see 'all' visibility only
    const filter = ['admin', 'agent'].includes(userRole) ? {} : { visibility: 'all' };
    const snippets = await CodeShare.find(filter)
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ snippets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/codeshare/:id — single snippet
router.get('/:id', async (req, res) => {
  try {
    const snippet = await CodeShare.findById(req.params.id).lean();
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });

    const userRole = req.user.role;
    if (snippet.visibility === 'staff' && !['admin', 'agent'].includes(userRole)) {
      return res.status(403).json({ error: 'Access restricted to staff' });
    }
    res.json({ snippet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/codeshare — create (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, content, language, description, visibility } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const snippet = await CodeShare.create({
      title,
      content,
      language: language || 'text',
      description: description || '',
      visibility: visibility || 'all',
      createdBy: req.user._id,
      authorName: req.user.name,
    });
    res.status(201).json({ snippet });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/codeshare/:id — update (admin only)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { title, content, language, description, visibility } = req.body;
    const snippet = await CodeShare.findByIdAndUpdate(
      req.params.id,
      { title, content, language, description, visibility },
      { new: true, runValidators: true }
    );
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
    res.json({ snippet });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/codeshare/:id — delete (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const snippet = await CodeShare.findByIdAndDelete(req.params.id);
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
    res.json({ message: 'Snippet deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
