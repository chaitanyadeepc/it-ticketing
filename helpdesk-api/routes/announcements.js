const express = require('express');
const Announcement = require('../models/Announcement');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/announcements/active — public within the app (any authenticated user)
router.get('/active', protect, async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ createdAt: -1 });
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/announcements — all (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/announcements — create (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, body, message, type, expiresAt, isActive } = req.body;
    const content = (body || message || '').trim();
    if (!content) return res.status(400).json({ error: 'Message is required' });
    const ann = await Announcement.create({
      title: (title || '').trim(),
      message: content,
      type: type || 'info',
      isActive: isActive !== undefined ? !!isActive : true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id,
      createdByName: req.user.name,
    });
    res.status(201).json({ announcement: ann });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/announcements/:id — update (admin only)
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { title, body, message, type, isActive, expiresAt } = req.body;
    const update = {};
    if (title !== undefined)     update.title     = (title || '').trim();
    const content = body ?? message;
    if (content !== undefined)   update.message   = (content || '').trim();
    if (type !== undefined)      update.type      = type;
    if (isActive !== undefined)  update.isActive  = !!isActive;
    if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const ann = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ announcement: ann });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/announcements/:id (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndDelete(req.params.id);
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
