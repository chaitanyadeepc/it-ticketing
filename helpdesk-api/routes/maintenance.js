const express = require('express');
const router = express.Router();
const MaintenanceWindow = require('../models/MaintenanceWindow');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/maintenance/current — public, check if maintenance is active now
router.get('/current', async (req, res) => {
  try {
    const now = new Date();
    const window = await MaintenanceWindow.findOne({
      isActive: true,
      startAt: { $lte: now },
      endAt:   { $gte: now },
    }).sort({ startAt: -1 }).lean();
    res.json({ maintenance: window || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance — admin, list all windows
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const windows = await MaintenanceWindow.find().sort({ startAt: -1 }).lean();
    res.json({ windows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance — admin, create window
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, message, startAt, endAt } = req.body;
    if (!title || !startAt || !endAt) {
      return res.status(400).json({ error: 'title, startAt, and endAt are required' });
    }
    if (new Date(endAt) <= new Date(startAt)) {
      return res.status(400).json({ error: 'endAt must be after startAt' });
    }
    const w = await MaintenanceWindow.create({
      title: title.trim().slice(0, 200),
      message: (message || '').trim().slice(0, 500),
      startAt: new Date(startAt),
      endAt:   new Date(endAt),
      createdBy: req.user._id,
    });
    res.status(201).json({ window: w });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/maintenance/:id — admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await MaintenanceWindow.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
