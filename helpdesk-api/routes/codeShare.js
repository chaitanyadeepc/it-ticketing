const express = require('express');
const CodeShare = require('../models/CodeShare');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ── Access helper ─────────────────────────────────────────────────────────────
const canView = (snippet, user) => {
  if (user.role === 'admin') return true;
  const v = snippet.visibility;
  if (v === 'all') return true;
  if (v === 'staff') return ['agent', 'admin'].includes(user.role);
  if (v === 'admins') return user.role === 'admin';
  if (v === 'custom') {
    return (snippet.allowedUsers || []).some(
      (id) => id.toString() === user._id.toString()
    );
  }
  return false;
};

// ── Build mongo filter for the current user ───────────────────────────────────
const buildFilter = (user) => {
  if (user.role === 'admin') return {};
  const orConds = [
    { visibility: 'all' },
    { visibility: 'custom', allowedUsers: user._id },
  ];
  if (user.role === 'agent') {
    orConds.push({ visibility: 'staff' });
  }
  return { $or: orConds };
};

// GET /api/codeshare/has-access — lightweight check: does this user have any accessible snippets?
router.get('/has-access', async (req, res) => {
  try {
    const count = await CodeShare.countDocuments(buildFilter(req.user));
    res.json({ hasAccess: count > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/codeshare — list snippets visible to the requester
router.get('/', async (req, res) => {
  try {
    const snippets = await CodeShare.find(buildFilter(req.user))
      .populate('allowedUsers', 'name email role')
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
    const snippet = await CodeShare.findById(req.params.id)
      .populate('allowedUsers', 'name email role')
      .lean();
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
    if (!canView(snippet, req.user)) {
      return res.status(403).json({ error: 'You do not have access to this snippet' });
    }
    res.json({ snippet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/codeshare — create (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, content, language, description, visibility, allowedUsers } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const snippet = await CodeShare.create({
      title,
      content,
      language: language || 'text',
      description: description || '',
      visibility: visibility || 'all',
      allowedUsers: visibility === 'custom' ? (allowedUsers || []) : [],
      createdBy: req.user._id,
      authorName: req.user.name,
    });
    const populated = await snippet.populate('allowedUsers', 'name email role');
    res.status(201).json({ snippet: populated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/codeshare/:id — update (admin only)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { title, content, language, description, visibility, allowedUsers } = req.body;
    const snippet = await CodeShare.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        language,
        description,
        visibility,
        allowedUsers: visibility === 'custom' ? (allowedUsers || []) : [],
      },
      { new: true, runValidators: true }
    ).populate('allowedUsers', 'name email role');
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
