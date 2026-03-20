const express = require('express');
const Config  = require('../models/Config');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_SLA = { Critical: 4, High: 8, Medium: 24, Low: 72 };

// GET /api/config/sla — any authenticated user (frontend needs it for SLA timers)
router.get('/sla', protect, async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'sla' });
    res.json({ sla: config?.value || DEFAULT_SLA });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/config/sla — admin only
router.patch('/sla', protect, adminOnly, async (req, res) => {
  try {
    const { sla } = req.body;
    if (!sla || typeof sla !== 'object') {
      return res.status(400).json({ error: 'SLA object required' });
    }
    const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
    for (const p of PRIORITIES) {
      if (sla[p] === undefined) continue; // allow partial updates
      if (typeof sla[p] !== 'number' || sla[p] <= 0) {
        return res.status(400).json({ error: `Invalid SLA value for ${p} — must be a positive number` });
      }
    }
    const config = await Config.findOneAndUpdate(
      { key: 'sla' },
      { value: { ...DEFAULT_SLA, ...sla }, updatedBy: req.user._id },
      { upsert: true, new: true }
    );
    res.json({ sla: config.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
