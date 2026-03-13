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

// GET /api/users  (admin only — list all users)
router.get('/', adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
