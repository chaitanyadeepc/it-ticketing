const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const Feedback  = require('../models/Feedback');
const { protect, adminOnly } = require('../middleware/auth');

// Strict rate limit for public submissions: 5 per IP per hour
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
});

// ── POST /api/feedback — public, submit survey response ──────────────────
router.post('/', submitLimiter, async (req, res) => {
  try {
    const {
      name,
      role, currentProcess, satisfaction, priorities,
      wouldUseChatbot, issueFrequency, statusImportance, suggestions,
      responseTime, notifPreference,
    } = req.body;

    const feedback = await Feedback.create({
      name: (name || '').slice(0, 100).trim(),
      role,
      currentProcess,
      satisfaction: Number(satisfaction),
      priorities: Array.isArray(priorities) ? priorities : [],
      wouldUseChatbot,
      issueFrequency,
      statusImportance,
      responseTime,
      notifPreference,
      suggestions: (suggestions || '').slice(0, 1000).trim(),
      userAgent: (req.headers['user-agent'] || '').slice(0, 500),
    });

    res.status(201).json({ message: 'Thank you for your feedback!', id: feedback._id });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(err.errors).map((e) => e.message).join(', '),
      });
    }
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ── GET /api/feedback/stats — admin only, aggregated analytics ───────────
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const total = await Feedback.countDocuments();
    if (total === 0) {
      return res.json({
        total: 0, avgSatisfaction: 0, satisfactionDist: {},
        roles: {}, processes: {}, chatbot: {}, frequency: {}, importance: {}, priorities: {},
      });
    }

    const all = await Feedback.find().lean();
    const avg = all.reduce((s, f) => s + f.satisfaction, 0) / total;

    const tally = (key) =>
      all.reduce((acc, f) => { acc[f[key]] = (acc[f[key]] || 0) + 1; return acc; }, {});

    const satisfactionDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    all.forEach((f) => { satisfactionDist[f.satisfaction] = (satisfactionDist[f.satisfaction] || 0) + 1; });

    const priorityCounts = {};
    all.forEach((f) =>
      (f.priorities || []).forEach((p) => { priorityCounts[p] = (priorityCounts[p] || 0) + 1; })
    );

    res.json({
      total,
      avgSatisfaction: Math.round(avg * 10) / 10,
      satisfactionDist,
      roles:           tally('role'),
      processes:       tally('currentProcess'),
      chatbot:         tally('wouldUseChatbot'),
      frequency:       tally('issueFrequency'),
      importance:      tally('statusImportance'),
      priorities:      priorityCounts,
      responseTime:    tally('responseTime'),
      notifPreference: tally('notifPreference'),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET /api/feedback — admin only, paginated list ────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Feedback.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Feedback.countDocuments(),
    ]);

    res.json({ feedback: items, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// ── DELETE /api/feedback/:id — admin only ────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// ── POST /api/feedback/anonymous — public, anonymous portal submission ───
router.post('/anonymous', submitLimiter, async (req, res) => {
  try {
    const { category, description, severity } = req.body;
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    const allowed = ['Bug Report', 'Feature Request', 'Complaint', 'Suggestion', 'Other'];
    const allowed2 = ['Low', 'Medium', 'High', 'Critical'];
    const feedback = await Feedback.create({
      name: 'Anonymous',
      role: 'anonymous',
      currentProcess: 'anonymous',
      satisfaction: 3,
      priorities: [],
      wouldUseChatbot: 'Maybe',
      issueFrequency: 'Sometimes',
      statusImportance: 'Important',
      responseTime: 'Same Day',
      notifPreference: 'Email',
      suggestions: `[${allowed.includes(category) ? category : 'Other'}][${allowed2.includes(severity) ? severity : 'Medium'}] ${description.trim().slice(0, 1000)}`,
      userAgent: (req.headers['user-agent'] || '').slice(0, 500),
    });
    res.status(201).json({ message: 'Feedback submitted anonymously. Thank you!', id: feedback._id });
  } catch {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

module.exports = router;
