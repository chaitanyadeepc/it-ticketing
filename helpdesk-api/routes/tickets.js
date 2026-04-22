const express = require('express');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, adminOnly, agentOrAdmin } = require('../middleware/auth');
const { sendTicketCreated, sendStatusChanged, sendCommentAdded, sendTicketAssigned } = require('../utils/email');
const { upload, uploadToCloud, deleteFromCloud } = require('../utils/storage');

const router = express.Router();

// ── PUBLIC: ticket status lookup (no auth required) ───────────────────────
router.get('/public/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId.toUpperCase() })
      .select('ticketId title status priority category createdAt updatedAt resolvedAt');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLIC: Kiosk walk-in ticket submission (no auth required) ─────────────
router.post('/kiosk', async (req, res) => {
  try {
    const { name, email, category, description } = req.body;

    // Basic validation
    if (!name || !email || !category || !description) {
      return res.status(400).json({ error: 'name, email, category, and description are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }

    // Auto-assign via round-robin
    const nextAgent = await getNextAgent();

    const ticket = await Ticket.create({
      title:       `[Walk-in] ${description.trim().slice(0, 80)}`,
      description: description.trim(),
      category,
      priority:    'Medium',
      status:      'Open',
      assignedTo:  nextAgent?.name || '',
      submittedVia: 'kiosk',
      kioskName:   name.trim(),
      kioskEmail:  email.trim().toLowerCase(),
    });

    res.status(201).json({
      ticket: {
        ticketId: ticket.ticketId,
        category: ticket.category,
        status:   ticket.status,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/share/:token  — public read-only view via share token
router.get('/share/:token', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      shareToken: req.params.token,
      shareTokenExpiry: { $gt: new Date() },
    }).select('ticketId title status priority category createdAt updatedAt resolvedAt description');

    if (!ticket) return res.status(404).json({ error: 'Share link is invalid or has expired' });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All routes below require authentication
router.use(protect);

// Round-robin auto-assignment helper
const getNextAgent = async () => {
  const agents = await User.find({ role: 'agent', isActive: true }).select('_id name').lean();
  if (!agents.length) return null;
  const lastCount = await Promise.all(
    agents.map(async (a) => ({
      ...a,
      count: await Ticket.countDocuments({ assignedTo: a.name, status: { $in: ['Open', 'In Progress'] } }),
    }))
  );
  lastCount.sort((a, b) => a.count - b.count);
  return lastCount[0];
};

// GET /api/tickets
//   user  → own raised tickets only
//   agent → tickets assigned to them OR raised by them
//   admin → ALL tickets (pass ?mine=true to restrict to own raised, used by My Tickets page)
router.get('/', async (req, res) => {
  try {
    const { status, priority, category, q, limit, mine, overdue } = req.query;

    // Build role-based access condition
    const conditions = [];
    if (req.user.role === 'user') {
      conditions.push({ createdBy: req.user._id });
    } else if (req.user.role === 'agent') {
      // Agent sees tickets assigned to them OR tickets they submitted
      conditions.push({ $or: [{ assignedTo: req.user.name }, { createdBy: req.user._id }] });
    } else if (req.user.role === 'admin' && mine === 'true') {
      // Admin on My Tickets page: only own raised tickets
      conditions.push({ createdBy: req.user._id });
    }
    // admin without mine=true: no condition (all tickets)

    // Additional search/filter conditions
    if (status)   conditions.push({ status });
    if (priority) conditions.push({ priority });
    if (category) conditions.push({ category });
    if (q) {
      const re = new RegExp(q.split(' ').filter(Boolean).join('|'), 'i');
      conditions.push({ $or: [{ title: re }, { description: re }, { ticketId: re }] });
    }
    if (overdue === 'true') {
      conditions.push({ dueDate: { $lt: new Date() }, status: { $nin: ['Resolved', 'Closed'] } });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    let query = Ticket.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 });
    if (limit) query = query.limit(Number(limit));
    const tickets = await query;
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/stats  (agent or admin)
router.get('/stats', agentOrAdmin, async (req, res) => {
  try {
    const [open, inProgress, resolved, closed, total] = await Promise.all([
      Ticket.countDocuments({ status: 'Open' }),
      Ticket.countDocuments({ status: 'In Progress' }),
      Ticket.countDocuments({ status: 'Resolved' }),
      Ticket.countDocuments({ status: 'Closed' }),
      Ticket.countDocuments(),
    ]);
    res.json({ total, open, inProgress, resolved, closed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const { role, _id: userId, name: userName } = req.user;
    const ticket = await Ticket.findById(req.params.id).populate('createdBy', 'name email');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Access control:
    //   admin  → always allowed
    //   agent  → must be assignedTo or createdBy
    //   user   → must be createdBy
    if (role !== 'admin') {
      const isOwner    = ticket.createdBy._id.toString() === userId.toString();
      const isAssigned = role === 'agent' && ticket.assignedTo === userName;
      if (!isOwner && !isAssigned)
        return res.status(403).json({ error: 'Access denied' });
    }

    // Strip internal notes for regular users
    if (role === 'user') {
      const t = ticket.toObject();
      delete t.internalNotes;
      return res.json({ ticket: t });
    }

    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets — create
router.post('/', async (req, res) => {
  try {
    let { title, description, category, subType, priority } = req.body;
    if (!title || !description || !category)
      return res.status(400).json({ error: 'Title, description and category are required' });

    // ── Sensitive data redaction ────────────────────────────────────────────
    const REDACT_PATTERNS = [
      { re: /password\s*[:=]\s*\S+/gi,           label: 'password' },
      { re: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, label: 'credit card' },
      { re: /\b(?:api[_\-]?key|apikey|secret)[:\s=]+[A-Za-z0-9+/=_\-]{16,}/gi, label: 'API key' },
      { re: /\b\d{3}-?\d{2}-?\d{4}\b/g,          label: 'SSN' },
      { re: /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, label: 'JWT token' },
    ];
    const redactedFields = [];
    const redact = (text) => {
      let out = text;
      for (const { re, label } of REDACT_PATTERNS) {
        const before = out;
        out = out.replace(re, `[REDACTED:${label}]`);
        if (out !== before && !redactedFields.includes(label)) redactedFields.push(label);
      }
      return out;
    };
    title       = redact(title);
    description = redact(description);

    // Round-robin auto-assign to least-loaded agent
    const autoAgent = await getNextAgent();

    let ticket;
    let attempts = 3;
    while (attempts > 0) {
      try {
        ticket = await Ticket.create({
          title,
          description,
          category,
          subType: subType || '',
          priority: priority || 'Medium',
          createdBy: req.user._id,
          assignedTo: autoAgent ? autoAgent.name : '',
        });
        break;
      } catch (createErr) {
        if (createErr.code === 11000 && createErr.keyPattern?.ticketId && attempts > 1) {
          attempts--;
          continue;
        }
        throw createErr;
      }
    }

    await ticket.populate('createdBy', 'name email');
    const resp = { ticket };
    if (redactedFields.length > 0) {
      resp.warning = `Potentially sensitive data was redacted from your ticket: ${redactedFields.join(', ')}. Please avoid including passwords, card numbers, or secrets in support requests.`;
    }
    res.status(201).json(resp);
    User.findById(req.user._id).then((user) => sendTicketCreated(ticket, user)).catch(() => {});
  } catch (err) {
    console.error('Ticket create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id — update status / assign / add comment
router.patch('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { role, _id: userId, name: userName } = req.user;
    const isAdmin = role === 'admin';
    const isAgent = role === 'agent';
    const isStaff = isAdmin || isAgent;

    // Access control: agent can only modify tickets assigned to them or raised by them
    if (!isAdmin) {
      const isOwner    = ticket.createdBy.toString() === userId.toString();
      const isAssigned = isAgent && ticket.assignedTo === userName;
      if (!isOwner && !isAssigned)
        return res.status(403).json({ error: 'Access denied' });
    }

    const { status, assignedTo, comment, satisfaction } = req.body;
    const createdById = ticket.createdBy;
    let oldStatus = ticket.status;

    if (status && status !== ticket.status) {
      // Users can only reopen; agents/admins can set any status
      if (!isStaff && status !== 'Open') return res.status(403).json({ error: 'Users can only reopen tickets' });
      ticket.history.push({ action: `Status changed to "${status}"`, field: 'status', from: ticket.status, to: status, by: req.user._id, byName: req.user.name });
      ticket.status = status;
    }
    if (assignedTo !== undefined && assignedTo !== ticket.assignedTo && isStaff) {
      const prev = ticket.assignedTo || 'Unassigned';
      ticket.history.push({ action: `Assigned to ${assignedTo || 'Unassigned'}`, field: 'assignedTo', from: prev, to: assignedTo || 'Unassigned', by: req.user._id, byName: req.user.name });
      ticket.assignedTo = assignedTo;
    }
    if (comment) {
      ticket.comments.push({ text: comment, author: req.user._id, authorName: req.user.name });
    }
    if (satisfaction?.rating && !ticket.satisfaction?.rating) {
      ticket.satisfaction = { rating: satisfaction.rating, feedback: satisfaction.feedback || '', submittedAt: new Date() };
    }

    await ticket.save();
    await ticket.populate('createdBy', 'name email');

    // Strip internal notes for users
    if (!isStaff) {
      const t = ticket.toObject();
      delete t.internalNotes;
      res.json({ ticket: t });
    } else {
      res.json({ ticket });
    }

    if (status && status !== oldStatus) {
      Notification.create({ user: createdById, type: 'ticket_update', title: `Ticket ${ticket.ticketId} status updated`, message: `Status changed from ${oldStatus} to ${status}.`, link: `/tickets/${ticket._id}`, ticketId: ticket._id }).catch(() => {});
      User.findById(createdById).then((user) => sendStatusChanged(ticket, user, oldStatus, status)).catch(() => {});
    }
    if (comment) {
      const postedComment = ticket.comments[ticket.comments.length - 1];
      Notification.create({ user: createdById, type: 'comment', title: `New comment on ${ticket.ticketId}`, message: `${req.user.name} left a comment.`, link: `/tickets/${ticket._id}`, ticketId: ticket._id }).catch(() => {});
      User.findById(createdById).then((user) => sendCommentAdded(ticket, user, postedComment)).catch(() => {});
    }
    if (assignedTo !== undefined && req.body.assignedTo !== undefined) {
      const assignedUser = await User.findOne({ name: assignedTo }).catch(() => null);
      if (assignedUser) {
        Notification.create({ user: assignedUser._id, type: 'assignment', title: `Ticket assigned to you`, message: `You have been assigned ticket ${ticket.ticketId}.`, link: `/tickets/${ticket._id}`, ticketId: ticket._id }).catch(() => {});
        User.findById(createdById).then((user) => sendTicketAssigned(ticket, user, assignedTo)).catch(() => {});
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/notes — internal note (agent or admin only)
router.post('/:id/notes', agentOrAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Note text is required' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Agents may only add notes to tickets they own or are assigned
    if (req.user.role === 'agent') {
      const isOwner    = ticket.createdBy.toString() === req.user._id.toString();
      const isAssigned = ticket.assignedTo === req.user.name;
      if (!isOwner && !isAssigned)
        return res.status(403).json({ error: 'Access denied' });
    }

    ticket.internalNotes.push({
      text: text.trim(),
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
    });
    await ticket.save();
    res.json({ internalNotes: ticket.internalNotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/bulk — batch status update (agent or admin)
router.patch('/bulk', agentOrAdmin, async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status)
      return res.status(400).json({ error: 'ids[] and status are required' });
    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: 'Invalid status value' });

    const result = await Ticket.updateMany(
      { _id: { $in: ids } },
      {
        $set: { status },
        $push: { history: { action: `Bulk status changed to "${status}"`, field: 'status', to: status, by: req.user._id, byName: req.user.name } },
      }
    );
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tickets/bulk — batch delete (admin only)
router.delete('/bulk', adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids[] is required' });
    const result = await Ticket.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/attachments
router.post('/:id/attachments', upload.array('files', 5), async (req, res) => {
  try {
    const { role, _id: userId, name: userName } = req.user;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    // Access: admin=all, agent=assigned/own, user=own
    if (role !== 'admin') {
      const isOwner    = ticket.createdBy.toString() === userId.toString();
      const isAssigned = role === 'agent' && ticket.assignedTo === userName;
      if (!isOwner && !isAssigned)
        return res.status(403).json({ error: 'Access denied' });
    }
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files received' });

    const uploaded = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadToCloud(file.buffer, {
          public_id: `ticket_${ticket.ticketId}_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`,
        });
        return { url: result.secure_url, publicId: result.public_id, filename: file.originalname, mimetype: file.mimetype, size: file.size, uploadedBy: req.user._id, uploaderName: req.user.name };
      })
    );

    ticket.attachments.push(...uploaded);
    await ticket.save();
    res.json({ attachments: ticket.attachments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tickets/:id/attachments/:attachmentId
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const { role, _id: userId, name: userName } = req.user;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    // Access: admin=all, agent=assigned/own, user=own
    if (role !== 'admin') {
      const isOwner    = ticket.createdBy.toString() === userId.toString();
      const isAssigned = role === 'agent' && ticket.assignedTo === userName;
      if (!isOwner && !isAssigned)
        return res.status(403).json({ error: 'Access denied' });
    }

    const att = ticket.attachments.id(req.params.attachmentId);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    await deleteFromCloud(att.publicId, att.mimetype?.startsWith('image') ? 'image' : 'raw');
    att.deleteOne();
    await ticket.save();
    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tickets/:id (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Time-Lock: resolved tickets cannot be deleted for 30 days
    if (ticket.resolvedAt) {
      const daysSince = (Date.now() - new Date(ticket.resolvedAt)) / 86400000;
      if (daysSince < 30) {
        const unlocksAt = new Date(ticket.resolvedAt);
        unlocksAt.setDate(unlocksAt.getDate() + 30);
        return res.status(403).json({
          error: `This ticket was resolved recently and is locked from deletion for 30 days. Deletion available after ${unlocksAt.toLocaleDateString()}.`,
          lockedUntil: unlocksAt.toISOString(),
        });
      }
    }

    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id/watch  — toggle current user as watcher
router.patch('/:id/watch', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const userId = req.user._id;
    const isWatching = ticket.watchers.some(w => w.equals(userId));
    if (isWatching) {
      ticket.watchers = ticket.watchers.filter(w => !w.equals(userId));
    } else {
      ticket.watchers.push(userId);
    }
    await ticket.save();
    res.json({ watching: !isWatching, watcherCount: ticket.watchers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id/due-date  — set or clear due date (agent/admin)
router.patch('/:id/due-date', agentOrAdmin, async (req, res) => {
  try {
    const { dueDate } = req.body; // ISO string or null
    // Agents may only set due date on tickets assigned to them or raised by them
    if (req.user.role === 'agent') {
      const ticket = await Ticket.findById(req.params.id).select('createdBy assignedTo');
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      const isOwner    = ticket.createdBy.toString() === req.user._id.toString();
      const isAssigned = ticket.assignedTo === req.user.name;
      if (!isOwner && !isAssigned)
        return res.status(403).json({ error: 'Access denied' });
    }
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { dueDate: dueDate ? new Date(dueDate) : null },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ dueDate: ticket.dueDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/share-token  — generate a 7-day read-only share link (staff only)
router.post('/:id/share-token', agentOrAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).select('+shareToken +shareTokenExpiry');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const token = require('crypto').randomBytes(24).toString('hex');
    const expiry = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days
    ticket.shareToken = token;
    ticket.shareTokenExpiry = expiry;
    await ticket.save();
    res.json({ token, expiresAt: expiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id/handoff-note  — set agent handoff note (staff only)
router.patch('/:id/handoff-note', agentOrAdmin, async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'Note text is required' });
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { handoffNote: note.trim() },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ handoffNote: ticket.handoffNote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/bulk-import — admin only
router.post('/bulk-import', adminOnly, async (req, res) => {
  try {
    const { tickets } = req.body;
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'No tickets provided' });
    }
    if (tickets.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 tickets per import' });
    }
    const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
    const VALID_CATEGORIES = ['Hardware', 'Software', 'Network', 'Account Access', 'Email', 'Printer', 'Phone/Mobile', 'Security', 'Other'];
    let created = 0;
    let skipped = 0;
    for (const t of tickets) {
      if (!t.title?.trim() || !t.description?.trim()) { skipped++; continue; }
      await Ticket.create({
        title: t.title.trim().slice(0, 200),
        description: t.description.trim().slice(0, 5000),
        category: VALID_CATEGORIES.includes(t.category) ? t.category : 'Other',
        priority: VALID_PRIORITIES.includes(t.priority) ? t.priority : 'Medium',
        status: 'Open',
        submittedVia: 'csv',
        kioskEmail: (t.email || '').trim().slice(0, 200),
        createdBy: req.user._id,
      });
      created++;
    }
    res.status(201).json({ created, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
