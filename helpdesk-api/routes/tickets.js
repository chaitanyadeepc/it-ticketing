const express = require('express');
const Ticket = require('../models/Ticket');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(protect);

// GET /api/tickets  — user gets own, admin gets all
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const { status, priority, category } = req.query;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/stats  (admin only)
router.get('/stats', adminOnly, async (req, res) => {
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
    const ticket = await Ticket.findById(req.params.id).populate('createdBy', 'name email');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Non-admin can only view own tickets
    if (req.user.role !== 'admin' && ticket.createdBy._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Access denied' });

    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets — create
router.post('/', async (req, res) => {
  try {
    const { title, description, category, subType, priority } = req.body;
    if (!title || !description || !category)
      return res.status(400).json({ error: 'Title, description and category are required' });

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
        });
        break; // success
      } catch (createErr) {
        // Retry on duplicate ticketId (race condition between concurrent requests)
        if (createErr.code === 11000 && createErr.keyPattern?.ticketId && attempts > 1) {
          attempts--;
          continue;
        }
        throw createErr;
      }
    }

    await ticket.populate('createdBy', 'name email');
    res.status(201).json({ ticket });
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

    // Only admin can change status/assign; user can only add comments on own ticket
    if (req.user.role !== 'admin' && ticket.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Access denied' });

    const { status, assignedTo, comment } = req.body;

    if (status && status !== ticket.status) {
      ticket.history.push({ action: `Status changed to "${status}"`, field: 'status', from: ticket.status, to: status, by: req.user._id, byName: req.user.name });
      ticket.status = status;
    }
    if (assignedTo !== undefined && assignedTo !== ticket.assignedTo) {
      const prev = ticket.assignedTo || 'Unassigned';
      ticket.history.push({ action: `Assigned to ${assignedTo || 'Unassigned'}`, field: 'assignedTo', from: prev, to: assignedTo || 'Unassigned', by: req.user._id, byName: req.user.name });
      ticket.assignedTo = assignedTo;
    }
    if (comment) {
      ticket.comments.push({ text: comment, author: req.user._id, authorName: req.user.name });
    }

    await ticket.save();
    await ticket.populate('createdBy', 'name email');
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/bulk — batch status update (admin only)
router.patch('/bulk', adminOnly, async (req, res) => {
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

// DELETE /api/tickets/:id (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
