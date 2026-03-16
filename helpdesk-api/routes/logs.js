const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/logs — write a log entry (any authenticated user) ──────────
router.post('/', protect, async (req, res) => {
  try {
    const { action, category, severity, detail, metadata, sessionId, userAgent } = req.body;

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'action is required' });
    }

    const entry = await ActivityLog.create({
      action:    action.slice(0, 100),
      category:  category || 'SYSTEM',
      severity:  severity || 'info',
      detail:    (detail || '').slice(0, 500),
      metadata:  metadata || {},
      sessionId: (sessionId || '').slice(0, 64),
      userAgent: (userAgent || req.headers['user-agent'] || '').slice(0, 300),
      ip:        req.ip || '',
      actor: {
        id:    req.user._id.toString(),
        name:  req.user.name  || 'Unknown',
        email: req.user.email || 'unknown@system',
        role:  req.user.role  || 'user',
      },
    });

    res.status(201).json({ ok: true, id: entry._id });
  } catch (err) {
    // Logging errors must never surface to the user — return 200 silently
    res.status(200).json({ ok: false });
  }
});

// ── POST /api/logs/anonymous — login-attempt logs before token exists ────
// Only logs AUTH events; actor info comes from request body
router.post('/anonymous', async (req, res) => {
  try {
    const { action, detail, metadata, sessionId, userAgent, actor } = req.body;

    // Only allow specific pre-auth events to prevent abuse
    const allowed = ['LOGIN_FAILED', '2FA_INITIATED', 'USER_REGISTERED', 'USER_LOGIN', 'USER_LOGIN_2FA'];
    if (!allowed.includes(action)) return res.status(403).json({ error: 'Not allowed' });

    await ActivityLog.create({
      action:    action.slice(0, 100),
      category:  'AUTH',
      severity:  action === 'LOGIN_FAILED' ? 'warning' : 'info',
      detail:    (detail || '').slice(0, 500),
      metadata:  metadata || {},
      sessionId: (sessionId || '').slice(0, 64),
      userAgent: (userAgent || req.headers['user-agent'] || '').slice(0, 300),
      ip:        req.ip || '',
      actor: {
        id:    actor?.id    || null,
        name:  (actor?.name  || 'Unknown').slice(0, 100),
        email: (actor?.email || 'unknown').slice(0, 200),
        role:  (actor?.role  || 'user').slice(0, 20),
      },
    });

    res.status(201).json({ ok: true });
  } catch {
    res.status(200).json({ ok: false });
  }
});

// ── GET /api/logs — retrieve logs (admin only) ────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      page     = 1,
      limit    = 50,
      category,
      severity,
      search,
      dateFrom,
      dateTo,
      actorEmail,
    } = req.query;

    const filter = {};

    if (category && category !== 'ALL') filter.category = category;
    if (severity && severity !== 'ALL') filter.severity = severity;
    if (actorEmail) filter['actor.email'] = { $regex: actorEmail, $options: 'i' };

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    if (search) {
      const re = { $regex: search, $options: 'i' };
      filter.$or = [
        { action:        re },
        { detail:        re },
        { 'actor.name':  re },
        { 'actor.email': re },
        { 'actor.role':  re },
        { category:      re },
      ];
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    // Stats across full unfiltered collection
    const [stats] = await ActivityLog.aggregate([
      {
        $facet: {
          total:    [{ $count: 'n' }],
          critical: [{ $match: { severity: 'critical' } }, { $count: 'n' }],
          error:    [{ $match: { severity: 'error'    } }, { $count: 'n' }],
          warning:  [{ $match: { severity: 'warning'  } }, { $count: 'n' }],
          auth:     [{ $match: { category: 'AUTH'     } }, { $count: 'n' }],
          ticket:   [{ $match: { category: 'TICKET'   } }, { $count: 'n' }],
        },
      },
    ]);

    const pick = (arr) => arr?.[0]?.n || 0;

    res.json({
      logs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      stats: {
        total:    pick(stats.total),
        critical: pick(stats.critical),
        error:    pick(stats.error),
        warning:  pick(stats.warning),
        auth:     pick(stats.auth),
        ticket:   pick(stats.ticket),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/logs — clear all logs (admin only) ───────────────────────
router.delete('/', protect, adminOnly, async (req, res) => {
  try {
    // Capped collections can't be dropped safely at runtime, so we use deleteMany
    await ActivityLog.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
