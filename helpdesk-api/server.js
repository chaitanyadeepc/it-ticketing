require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const authRoutes          = require('./routes/auth');
const ticketRoutes        = require('./routes/tickets');
const userRoutes          = require('./routes/users');
const kbRoutes            = require('./routes/kb');
const logRoutes           = require('./routes/logs');
const feedbackRoutes      = require('./routes/feedback');
const announcementRoutes  = require('./routes/announcements');
const notificationRoutes  = require('./routes/notifications');
const cannedResponseRoutes = require('./routes/cannedResponses');
const configRoutes        = require('./routes/config');
const codeShareRoutes     = require('./routes/codeShare');

const cron = require('node-cron');
const User         = require('./models/User');
const Ticket       = require('./models/Ticket');
const Notification = require('./models/Notification');
const { sendWeeklyDigest, sendAutoClosedNotification, sendSLAEscalated, sendDueDateReminder } = require('./utils/email');

const app = express();

// ── Security headers (helmet) ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images
  contentSecurityPolicy: false, // handled by Vercel on frontend
}));

// ── Trust proxy (needed for accurate IPs behind Render's load balancer) ─────
app.set('trust proxy', 1);

// ── Global rate limit: 200 req / 15 min per IP ─────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://hiticket.vercel.app',   // production
  process.env.CLIENT_URL,          // override via env if needed
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
// ── NoSQL injection sanitization ─────────────────────────────────
app.use(mongoSanitize()); // strips $ and . from req.body, req.params, req.query
// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/logs',           logRoutes);
app.use('/api/feedback',       feedbackRoutes);
app.use('/api/announcements',  announcementRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/canned-responses', cannedResponseRoutes);
app.use('/api/config',         configRoutes);
app.use('/api/codeshare',      codeShareRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// ── DB + Start ────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is busy. Kill the old process and retry.`);
        process.exit(1);
      }
    });

    // ── Weekly digest cron — runs every Monday at 08:00 ─────────────────────
    cron.schedule('0 8 * * 1', async () => {
      console.log('[CRON] Sending weekly digest emails…');
      try {
        const users = await User.find({ isActive: true }).lean();
        for (const user of users) {
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
          const tickets = await Ticket.find({
            createdBy: user._id,
            createdAt: { $gte: oneWeekAgo },
          }).lean();

          if (!tickets.length) continue;

          const resolved = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
          const recent = tickets.slice(0, 5).map(t => ({
            ticketId: t.ticketId,
            title: t.title,
            status: t.status,
          }));

          await sendWeeklyDigest(user, {
            total: tickets.length,
            resolved,
            open: tickets.length - resolved,
            recentActivity: recent,
          });
        }
        console.log('[CRON] Weekly digest complete');
      } catch (err) {
        console.error('[CRON] Weekly digest error:', err.message);
      }
    }, { timezone: 'UTC' });

    // ── Auto-close stale Resolved tickets — runs daily at 02:00 UTC ────────
    cron.schedule('0 2 * * *', async () => {
      console.log('[CRON] Auto-closing stale tickets…');
      try {
        const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const stale = await Ticket.find({
          status: 'Resolved',
          resolvedAt: { $lt: cutoff },
        }).populate('createdBy', 'name email notificationPrefs');
        for (const ticket of stale) {
          ticket.history.push({ action: 'Auto-closed after 7 days resolved', field: 'status', from: 'Resolved', to: 'Closed', by: null, byName: 'System' });
          ticket.status = 'Closed';
          await ticket.save();
          await Notification.create({ user: ticket.createdBy._id, type: 'auto_close', title: 'Ticket auto-closed', message: `Ticket ${ticket.ticketId} was automatically closed after 7 days.`, link: `/tickets/${ticket._id}`, ticketId: ticket._id });
          sendAutoClosedNotification(ticket, ticket.createdBy).catch(() => {});
        }
        console.log(`[CRON] Auto-closed ${stale.length} ticket(s)`);
      } catch (err) {
        console.error('[CRON] Auto-close error:', err.message);
      }
    }, { timezone: 'UTC' });

    // ── SLA escalation — runs every hour ───────────────────────────────────
    const SLA_HOURS = { Critical: 1, High: 4, Medium: 8, Low: 24 };
    cron.schedule('0 * * * *', async () => {
      console.log('[CRON] Checking SLA breaches…');
      try {
        const PRIORITY_LADDER = ['Low', 'Medium', 'High', 'Critical'];
        const openTickets = await Ticket.find({ status: { $in: ['Open', 'In Progress'] } })
          .populate('createdBy', 'name email notificationPrefs');
        for (const ticket of openTickets) {
          const slaHours = SLA_HOURS[ticket.priority] || 8;
          const ageHours = (Date.now() - ticket.createdAt) / 3_600_000;
          if (ageHours <= slaHours * 1.5) continue; // only act on 150% overage
          const currentIdx = PRIORITY_LADDER.indexOf(ticket.priority);
          if (currentIdx === PRIORITY_LADDER.length - 1) continue; // already Critical
          const newPriority = PRIORITY_LADDER[currentIdx + 1];
          ticket.history.push({ action: `Priority escalated to ${newPriority} (SLA breach)`, field: 'priority', from: ticket.priority, to: newPriority, by: null, byName: 'System' });
          ticket.priority = newPriority;
          await ticket.save();
          await Notification.create({ user: ticket.createdBy._id, type: 'sla_breach', title: 'Ticket escalated', message: `Ticket ${ticket.ticketId} was escalated to ${newPriority} due to SLA breach.`, link: `/tickets/${ticket._id}`, ticketId: ticket._id });
          sendSLAEscalated(ticket, ticket.createdBy).catch(() => {});
        }
        console.log('[CRON] SLA check complete');
      } catch (err) {
        console.error('[CRON] SLA escalation error:', err.message);
      }
    }, { timezone: 'UTC' });

    // ── Due-date reminder — runs daily at 09:00 UTC ────────────────────────
    cron.schedule('0 9 * * *', async () => {
      console.log('[CRON] Sending due-date reminders…');
      try {
        const now  = new Date();
        const in24 = new Date(now.getTime() + 24 * 3_600_000);
        const upcoming = await Ticket.find({
          dueDate: { $gte: now, $lte: in24 },
          status : { $nin: ['Resolved', 'Closed'] },
        }).populate('createdBy', 'name email notificationPrefs');
        for (const ticket of upcoming) {
          await Notification.create({ user: ticket.createdBy._id, type: 'due_date', title: 'Ticket due tomorrow', message: `Ticket ${ticket.ticketId} is due in less than 24 hours.`, link: `/tickets/${ticket._id}`, ticketId: ticket._id });
          sendDueDateReminder(ticket, ticket.createdBy).catch(() => {});
        }
        console.log(`[CRON] Due-date reminders sent for ${upcoming.length} ticket(s)`);
      } catch (err) {
        console.error('[CRON] Due-date reminder error:', err.message);
      }
    }, { timezone: 'UTC' });

  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
