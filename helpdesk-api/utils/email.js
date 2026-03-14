const nodemailer = require('nodemailer');

// Transporter — gracefully no-ops when EMAIL_HOST env var is absent
let transporter = null;

if (process.env.EMAIL_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Force IPv4 — Render's IPv6 connectivity to Gmail SMTP is unreliable
    family: 4,
    tls: { rejectUnauthorized: false },
  });
}

const FROM = process.env.EMAIL_FROM || 'HiTicket <no-reply@hiticket.app>';

// ─── HTML email wrapper ───────────────────────────────────────────────────────
const wrap = (title, body) => `
<!doctype html>
<html>
<head><meta charset="utf-8"><style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0a0a0a;color:#fafafa;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a}
  .head{background:linear-gradient(135deg,#FF634A18,transparent);padding:28px 32px;border-bottom:1px solid #27272a}
  .logo{font-size:20px;font-weight:700;color:#fafafa}
  .logo span{color:#FF634A}
  .body{padding:28px 32px}
  h2{margin:0 0 16px;font-size:18px;color:#fafafa}
  p{margin:8px 0;font-size:14px;color:#a1a1aa;line-height:1.6}
  .chip{display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;margin:2px 0}
  .badge-row{margin:16px 0;display:flex;gap:8px;flex-wrap:wrap}
  .btn{display:inline-block;margin-top:20px;padding:10px 24px;background:#FF634A;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600}
  .foot{padding:16px 32px;border-top:1px solid #27272a;font-size:12px;color:#52525b;text-align:center}
</style></head>
<body>
  <div class="wrap">
    <div class="head"><span class="logo">Hi<span>Ticket</span></span></div>
    <div class="body">
      <h2>${title}</h2>
      ${body}
    </div>
    <div class="foot">You received this because you have email notifications enabled in HiTicket.<br>
      Log in to manage your preferences.
    </div>
  </div>
</body>
</html>`;

const PRIORITY_COLOR = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
const STATUS_COLOR   = { Open: '#22c55e', 'In Progress': '#f59e0b', Resolved: '#06b6d4', Closed: '#71717a' };

const priorityChip = (p) => `<span class="chip" style="background:${PRIORITY_COLOR[p] || '#3b82f6'}22;color:${PRIORITY_COLOR[p] || '#3b82f6'};border:1px solid ${PRIORITY_COLOR[p] || '#3b82f6'}44">${p}</span>`;
const statusChip   = (s) => `<span class="chip" style="background:${STATUS_COLOR[s]  || '#a1a1aa'}22;color:${STATUS_COLOR[s]  || '#a1a1aa'};border:1px solid ${STATUS_COLOR[s]  || '#a1a1aa'}44">${s}</span>`;

// ─── Helpers to check user prefs ─────────────────────────────────────────────
const wantsEmail = (user) =>
  user?.notificationPrefs?.emailEnabled !== false;

const wantsUpdates = (user) =>
  user?.notificationPrefs?.ticketUpdates !== false;

const wantsComments = (user) =>
  user?.notificationPrefs?.newComments !== false;

// ─── Send wrapper — silently no-ops if not configured ────────────────────────
const send = async (to, subject, html) => {
  if (!transporter) {
    console.warn('[email] Skipped — EMAIL_HOST not configured. Set EMAIL_HOST in environment variables.');
    return;
  }
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[email] Sent to ${to} — messageId: ${info.messageId}`);
  } catch (err) {
    console.error('[email] send error:', err.message);
  }
};

// ─── Public email functions ───────────────────────────────────────────────────

/**
 * Sent to user when their ticket is successfully created.
 */
const sendTicketCreated = async (ticket, user) => {
  if (!wantsEmail(user)) return;
  await send(
    user.email,
    `[HiTicket] Ticket ${ticket.ticketId} Received`,
    wrap(
      `Your ticket has been received`,
      `<p>Hi ${user.name},</p>
       <p>We've logged your support request and our team will get back to you shortly.</p>
       <div class="badge-row">
         <span style="color:#52525b;font-size:13px">Ticket ID:</span>
         <strong style="color:#fafafa;font-size:13px">${ticket.ticketId}</strong>
       </div>
       <p><strong style="color:#e4e4e7">${ticket.title}</strong></p>
       <div class="badge-row">${priorityChip(ticket.priority)} ${statusChip(ticket.status)}</div>
       <p style="color:#71717a;font-size:13px">${ticket.description.substring(0, 280)}${ticket.description.length > 280 ? '…' : ''}</p>
       <a class="btn" href="${process.env.CLIENT_URL}/tickets/${ticket._id}">View Ticket</a>`
    )
  );
};

/**
 * Sent to ticket creator when status changes.
 */
const sendStatusChanged = async (ticket, user, oldStatus, newStatus) => {
  if (!wantsEmail(user) || !wantsUpdates(user)) return;
  await send(
    user.email,
    `[HiTicket] ${ticket.ticketId} status changed to ${newStatus}`,
    wrap(
      `Ticket status updated`,
      `<p>Hi ${user.name},</p>
       <p>Your ticket status has been updated.</p>
       <div class="badge-row">
         <span style="color:#52525b;font-size:13px">Ticket:</span>
         <strong style="color:#fafafa;font-size:13px">${ticket.ticketId}</strong>
       </div>
       <p><strong style="color:#e4e4e7">${ticket.title}</strong></p>
       <div class="badge-row">
         ${statusChip(oldStatus)}
         <span style="color:#52525b;font-size:18px;line-height:1">→</span>
         ${statusChip(newStatus)}
       </div>
       ${newStatus === 'Resolved' ? '<p style="color:#22c55e">Your issue has been marked as resolved. If you\'re still experiencing problems, you can reopen the ticket.</p>' : ''}
       <a class="btn" href="${process.env.CLIENT_URL}/tickets/${ticket._id}">View Ticket</a>`
    )
  );
};

/**
 * Sent to ticket creator when a new comment is posted.
 */
const sendCommentAdded = async (ticket, user, comment) => {
  if (!wantsEmail(user) || !wantsComments(user)) return;
  await send(
    user.email,
    `[HiTicket] New comment on ${ticket.ticketId}`,
    wrap(
      `New comment on your ticket`,
      `<p>Hi ${user.name},</p>
       <p><strong style="color:#fafafa">${comment.authorName || 'An agent'}</strong> added a comment on your ticket:</p>
       <div style="border-left:3px solid #8b5cf6;padding:12px 16px;background:#27272a;border-radius:0 8px 8px 0;margin:16px 0">
         <p style="margin:0;color:#fafafa;font-size:14px">${comment.text}</p>
       </div>
       <div class="badge-row"><strong style="color:#fafafa;font-size:13px">${ticket.ticketId}</strong> ${statusChip(ticket.status)}</div>
       <a class="btn" href="${process.env.CLIENT_URL}/tickets/${ticket._id}">View &amp; Reply</a>`
    )
  );
};

module.exports = { sendTicketCreated, sendStatusChanged, sendCommentAdded };
