const express = require('express');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/users/profile
router.get('/profile', async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/users/profile
router.put('/profile', async (req, res) => {
  try {
    const { name, department, phone, jobTitle, location } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, department, phone, jobTitle, location },
      { new: true, runValidators: true }
    );
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/notifications — save notification preferences
router.put('/notifications', async (req, res) => {
  try {
    const { emailEnabled, ticketUpdates, newComments, weeklyDigest } = req.body;
    const prefs = {};
    if (emailEnabled  !== undefined) prefs['notificationPrefs.emailEnabled']  = !!emailEnabled;
    if (ticketUpdates !== undefined) prefs['notificationPrefs.ticketUpdates'] = !!ticketUpdates;
    if (newComments   !== undefined) prefs['notificationPrefs.newComments']   = !!newComments;
    if (weeklyDigest  !== undefined) prefs['notificationPrefs.weeklyDigest']  = !!weeklyDigest;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: prefs }, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users  (admin only — list all users)
router.get('/', adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id  (admin only — update role or isActive)
router.patch('/:id', adminOnly, async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const allowed = {};
    // Admin can assign 'user' or 'agent'. Only admin can assign 'admin' role.
    if (role !== undefined && ['user', 'agent', 'admin'].includes(role)) allowed.role = role;
    if (isActive !== undefined) allowed.isActive = !!isActive;

    const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
