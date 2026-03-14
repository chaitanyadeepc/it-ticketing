const express = require('express');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/email');

const router = express.Router();

// Strict rate limiter for auth endpoints: 10 attempts / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
  skipSuccessfulRequests: true, // only count failed attempts
});

// Looser limiter for resend/setup endpoints: 5 req / 10 min
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code requests. Please wait 10 minutes.' },
});

const signToken = (id, tokenVersion) =>
  jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Short-lived token used between password-check and 2FA verification (10 min)
const signTempToken = (id) =>
  jwt.sign({ id, type: '2fa-pending' }, process.env.JWT_SECRET, { expiresIn: '10m' });

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'user' });
    const token = signToken(user._id, user.tokenVersion);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email }).select(
      '+password +tokenVersion +twoFactor.pendingOtp +twoFactor.pendingOtpExpiry'
    );
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.isActive)
      return res.status(403).json({ error: 'Account is disabled' });

    // 2FA required — issue temp token instead of full session token
    if (user.twoFactor?.enabled) {
      const tempToken = signTempToken(user._id);
      if (user.twoFactor.method === 'email') {
        const otp = generateOTP();
        user.twoFactor.pendingOtp = otp;
        user.twoFactor.pendingOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save({ validateBeforeSave: false });
        sendOTPEmail(user.email, user.name, otp).catch((e) =>
          console.error('[2fa] OTP email error:', e.message)
        );
      }
      return res.json({ requires2FA: true, tempToken, method: user.twoFactor.method });
    }

    // Normal login (no 2FA)
    user.tokenVersion = (Number.isFinite(user.tokenVersion) ? user.tokenVersion : 0) + 1;
    await user.save({ validateBeforeSave: false });
    const token = signToken(user._id, user.tokenVersion);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/2fa/verify ────────────────────────────────────────────────
// Accepts the 6-digit code + tempToken from the login step, returns full JWT on success
router.post('/2fa/verify', authLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code)
      return res.status(400).json({ error: 'tempToken and code are required' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Code expired. Please log in again.' });
    }
    if (decoded.type !== '2fa-pending')
      return res.status(401).json({ error: 'Invalid token type' });

    const user = await User.findById(decoded.id).select(
      '+tokenVersion +twoFactor.pendingOtp +twoFactor.pendingOtpExpiry +twoFactor.totpSecret'
    );
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.twoFactor.method === 'email') {
      if (!user.twoFactor.pendingOtp)
        return res.status(400).json({ error: 'No pending OTP. Please log in again.' });
      if (new Date() > new Date(user.twoFactor.pendingOtpExpiry))
        return res.status(400).json({ error: 'Code expired. Please log in again.' });
      if (code !== user.twoFactor.pendingOtp)
        return res.status(401).json({ error: 'Incorrect code. Try again.' });
      user.twoFactor.pendingOtp = undefined;
      user.twoFactor.pendingOtpExpiry = undefined;
    } else {
      const valid = speakeasy.totp.verify({
        secret: user.twoFactor.totpSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
      if (!valid) return res.status(401).json({ error: 'Incorrect code. Try again.' });
    }

    user.tokenVersion = (Number.isFinite(user.tokenVersion) ? user.tokenVersion : 0) + 1;
    await user.save({ validateBeforeSave: false });
    const token = signToken(user._id, user.tokenVersion);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/2fa/resend ────────────────────────────────────────────────
// Resend OTP email for the current pending login (email method only)
router.post('/2fa/resend', otpLimiter, async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) return res.status(400).json({ error: 'tempToken required' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    if (decoded.type !== '2fa-pending')
      return res.status(401).json({ error: 'Invalid token' });

    const user = await User.findById(decoded.id).select(
      '+twoFactor.pendingOtp +twoFactor.pendingOtpExpiry'
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.twoFactor.method !== 'email')
      return res.status(400).json({ error: 'Resend only available for email OTP' });

    const otp = generateOTP();
    user.twoFactor.pendingOtp = otp;
    user.twoFactor.pendingOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    sendOTPEmail(user.email, user.name, otp).catch((e) =>
      console.error('[2fa] resend error:', e.message)
    );
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/2fa/setup/email ──────────────────────────────────────────
// Step 1 of email 2FA setup: send verification OTP to the user's email
router.post('/2fa/setup/email', protect, otpLimiter, async (req, res) => {
  try {
    if (!process.env.GMAIL_CLIENT_ID)
      return res.status(503).json({ error: 'Email service is not configured on this server.' });

    const otp = generateOTP();
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'twoFactor.pendingOtp': otp,
        'twoFactor.pendingOtpExpiry': new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await sendOTPEmail(req.user.email, req.user.name, otp);
    res.json({ sent: true, email: req.user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/2fa/setup/email/confirm ───────────────────────────────────
// Step 2 of email 2FA setup: confirm the OTP and activate email 2FA
router.post('/2fa/setup/email/confirm', protect, authLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const user = await User.findById(req.user._id).select(
      '+twoFactor.pendingOtp +twoFactor.pendingOtpExpiry'
    );
    if (!user.twoFactor?.pendingOtp)
      return res.status(400).json({ error: 'No pending OTP. Click "Send Code" first.' });
    if (new Date() > new Date(user.twoFactor.pendingOtpExpiry))
      return res.status(400).json({ error: 'Code expired. Click "Send Code" again.' });
    if (code !== user.twoFactor.pendingOtp)
      return res.status(400).json({ error: 'Incorrect code. Try again.' });

    user.twoFactor.enabled = true;
    user.twoFactor.method = 'email';
    user.twoFactor.pendingOtp = undefined;
    user.twoFactor.pendingOtpExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/2fa/setup/totp ───────────────────────────────────────────
// Step 1 of TOTP setup: generate secret + QR code for authenticator app
router.post('/2fa/setup/totp', protect, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `HiTicket (${req.user.email})`,
      issuer: 'HiTicket',
    });
    await User.findByIdAndUpdate(req.user._id, {
      $set: { 'twoFactor.totpSecret': secret.base32 },
    });
    const qrDataURL = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrDataURL, manualKey: secret.base32 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/2fa/setup/totp/confirm ────────────────────────────────────
// Step 2 of TOTP setup: verify first code from authenticator app, activate TOTP 2FA
router.post('/2fa/setup/totp/confirm', protect, authLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const user = await User.findById(req.user._id).select('+twoFactor.totpSecret');
    if (!user.twoFactor?.totpSecret)
      return res.status(400).json({ error: 'No TOTP secret found. Start setup again.' });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactor.totpSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });
    if (!valid)
      return res.status(400).json({ error: 'Incorrect code. Make sure your app time is synced.' });

    user.twoFactor.enabled = true;
    user.twoFactor.method = 'totp';
    await user.save({ validateBeforeSave: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/2fa/disable ──────────────────────────────────────────────
// Disable 2FA — requires the user's current password for confirmation
router.post('/2fa/disable', protect, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required to disable 2FA' });

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(password)))
      return res.status(401).json({ error: 'Incorrect password' });

    await User.findByIdAndUpdate(req.user._id, {
      $set: { 'twoFactor.enabled': false },
      $unset: { 'twoFactor.pendingOtp': '', 'twoFactor.pendingOtpExpiry': '' },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
