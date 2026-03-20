const express = require('express');
const CannedResponse = require('../models/CannedResponse');
const { protect, agentOrAdmin, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/canned-responses — all global + own
router.get('/', agentOrAdmin, async (req, res) => {
  try {
    const responses = await CannedResponse.find({ isGlobal: true }).sort({ usageCount: -1, title: 1 });
    res.json({ responses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/canned-responses — create (agent or admin)
router.post('/', agentOrAdmin, async (req, res) => {
  try {
    const { title, body, category, tags } = req.body;
    if (!title?.trim() || !body?.trim())
      return res.status(400).json({ error: 'Title and body are required' });

    const cr = await CannedResponse.create({
      title: title.trim(),
      body:  body.trim(),
      category: category || 'General',
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      createdBy: req.user._id,
      createdByName: req.user.name,
    });
    res.status(201).json({ response: cr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/canned-responses/:id — update
router.patch('/:id', agentOrAdmin, async (req, res) => {
  try {
    const { title, body, category, tags } = req.body;
    const update = {};
    if (title !== undefined)    update.title    = title.trim();
    if (body !== undefined)     update.body     = body.trim();
    if (category !== undefined) update.category = category;
    if (tags !== undefined)     update.tags     = Array.isArray(tags) ? tags : [tags];

    const cr = await CannedResponse.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!cr) return res.status(404).json({ error: 'Not found' });
    res.json({ response: cr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/canned-responses/:id/use — increment usage counter
router.post('/:id/use', agentOrAdmin, async (req, res) => {
  try {
    await CannedResponse.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/canned-responses/:id — admin only
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const cr = await CannedResponse.findByIdAndDelete(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
