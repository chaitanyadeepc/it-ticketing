const { google } = require('googleapis');

// ── Gmail API client (OAuth2 over HTTPS — works on Render free tier) ─────────
// SMTP ports 465/587 are blocked by Render's free tier firewall.
// The Gmail REST API uses port 443 (HTTPS) which is never blocked.
const getGmailClient = () => {
  if (!process.env.GMAIL_CLIENT_ID) return null;
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
};

// Build an RFC 2822 message and base64url-encode it for the Gmail API
const buildRaw = (to, subject, html) => {
  const msg = [
    `From: ${process.env.EMAIL_FROM || `HiTicket <${process.env.EMAIL_USER}>`}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\r\n');
  return Buffer.from(msg).toString('base64url');
};

const FROM = process.env.EMAIL_FROM || `HiTicket <${process.env.EMAIL_USER}>`;

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

// ─── Send wrapper — uses Gmail API over HTTPS ─────────────────────────────────
const send = async (to, subject, html) => {
  const gmail = getGmailClient();
  if (!gmail) {
    console.warn('[email] Skipped — GMAIL_CLIENT_ID not configured.');
    return;
  }
  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: buildRaw(to, subject, html) },
    });
    console.log(`[email] Sent to ${to} — id: ${res.data.id}`);
  } catch (err) {
    console.error('[email] Gmail API send error:', err.message);
  }
};

// ─── Public email functions ───────────────────────────────────────────────────

/**
 * Sent when a user needs a 2FA verification code (login or setup).
 */
const sendOTPEmail = async (to, name, otp) => {
  await send(
    to,
    '[HiTicket] Your verification code',
    wrap(
      'Verify your identity',
      `<p>Hi ${name},</p>
       <p>Use the code below to complete sign-in. It expires in <strong>10 minutes</strong>.</p>
       <div style="text-align:center;margin:28px 0">
         <span style="font-size:40px;font-weight:800;letter-spacing:16px;font-family:'Courier New',monospace;color:#fafafa;background:#27272a;padding:18px 28px;border-radius:12px;border:1px solid #3f3f46;display:inline-block">${otp}</span>
       </div>
       <p style="color:#52525b;font-size:13px">If you didn't attempt to sign in, please ignore this email — your account is safe.</p>`
    )
  );
};

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

/**
 * Sent when a ticket is auto-closed by the cron job after 7 days resolved.
 */
const sendAutoClosedNotification = async (ticket, user) => {
  if (!wantsEmail(user) || !wantsUpdates(user)) return;
  await send(
    user.email,
    `[HiTicket] Ticket ${ticket.ticketId} has been automatically closed`,
    wrap(
      'Ticket automatically closed',
      `<p>Hi ${user.name},</p>
       <p>Your ticket <strong style="color:#fafafa">${ticket.ticketId} — ${ticket.title}</strong> has been automatically closed after 7 days in Resolved status with no further activity.</p>
       <div class="badge-row">${statusChip('Closed')}</div>
       <p style="color:#a1a1aa;font-size:13px">If your issue has returned, you can always raise a new ticket.</p>
       <a class="btn" href="${process.env.CLIENT_URL}/tickets/${ticket._id}">View Ticket</a>`
    )
  );
};

/**
 * Sent when a ticket is auto-escalated due to SLA breach.
 */
const sendSLAEscalated = async (ticket, user) => {
  if (!wantsEmail(user) || !wantsUpdates(user)) return;
  await send(
    user.email,
    `[HiTicket] Ticket ${ticket.ticketId} has been escalated (SLA breach)`,
    wrap(
      'Ticket escalated — SLA breach',
      `<p>Hi ${user.name},</p>
       <p>Your ticket <strong style="color:#fafafa">${ticket.ticketId} — ${ticket.title}</strong> has been escalated because it exceeded its response SLA.</p>
       <div class="badge-row">${priorityChip(ticket.priority)} ${statusChip(ticket.status)}</div>
       <p style="color:#22c55e;font-size:13px">Our team has been notified and will prioritize this issue.</p>
       <a class="btn" href="${process.env.CLIENT_URL}/tickets/${ticket._id}">View Ticket</a>`
    )
  );
};

/**
 * Sent 24 hours before a ticket's due date.
 */
const sendDueDateReminder = async (ticket, user) => {
  if (!wantsEmail(user) || !wantsUpdates(user)) return;
  const dueDateStr = new Date(ticket.dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  await send(
    user.email,
    `[HiTicket] Ticket ${ticket.ticketId} is due tomorrow`,
    wrap(
      'Ticket due tomorrow',
      `<p>Hi ${user.name},</p>
       <p>Your ticket <strong style="color:#fafafa">${ticket.ticketId} — ${ticket.title}</strong> is due <strong style="color:#f59e0b">${dueDateStr}</strong>.</p>
       <div class="badge-row">${priorityChip(ticket.priority)} ${statusChip(ticket.status)}</div>
       <p style="color:#a1a1aa;font-size:13px">Please ensure this is resolved or update the due date if needed.</p>
       <a class="btn" href="${process.env.CLIENT_URL}/tickets/${ticket._id}">View Ticket</a>`
    )
  );
};

/**
 * Sent to ticket owner when an agent is assigned.
 */
const sendTicketAssigned = async (ticket, user, agentName) => {
  if (!wantsEmail(user) || !wantsUpdates(user)) return;
  await send(
    user.email,
    `[HiTicket] Ticket ${ticket.ticketId} has been assigned`,
    wrap(
      'Ticket assigned to an agent',
      `<p>Hi ${user.name},</p>
       <p>Your ticket has been assigned to <strong style="color:#fafafa">${agentName}</strong> who will be in touch shortly.</p>
       <div class="badge-row">${priorityChip(ticket.priority)} ${statusChip(ticket.status)}</div>
       <a class="btn" href="${process.env.CLIENT_URL}/tickets/${ticket._id}">View Ticket</a>`
    )
  );
};

/**
 * Weekly summary digest.
 */
const sendWeeklyDigest = async (user, stats) => {
  if (!wantsEmail(user) || user?.notificationPrefs?.weeklyDigest !== true) return;
  const rows = stats.recentActivity.map(t =>
    `<tr style="border-bottom:1px solid #27272a">
       <td style="padding:8px 12px;font-family:'Courier New',monospace;font-size:12px;color:#3b82f6">${t.ticketId}</td>
       <td style="padding:8px 12px;font-size:13px;color:#fafafa">${t.title}</td>
       <td style="padding:8px 12px">${statusChip(t.status)}</td>
     </tr>`
  ).join('');

  await send(
    user.email,
    '[HiTicket] Your weekly support summary',
    wrap(
      'Weekly support summary',
      `<p>Hi ${user.name}, here's your activity from the past 7 days.</p>
       <div class="badge-row">
         <span class="chip" style="background:#22c55e22;color:#22c55e;border:1px solid #22c55e44">${stats.total} tickets</span>
         <span class="chip" style="background:#06b6d422;color:#06b6d4;border:1px solid #06b6d444">${stats.resolved} resolved</span>
         <span class="chip" style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44">${stats.open} open</span>
       </div>
       ${rows.length ? `<table style="width:100%;border-collapse:collapse;margin-top:16px;border:1px solid #27272a;border-radius:8px;overflow:hidden">
         <thead><tr style="background:#27272a">
           <th style="padding:8px 12px;text-align:left;font-size:12px;color:#a1a1aa">ID</th>
           <th style="padding:8px 12px;text-align:left;font-size:12px;color:#a1a1aa">Title</th>
           <th style="padding:8px 12px;text-align:left;font-size:12px;color:#a1a1aa">Status</th>
         </tr></thead>
         <tbody>${rows}</tbody>
       </table>` : ''}
       <a class="btn" href="${process.env.CLIENT_URL}/my-tickets">View My Tickets</a>`
    )
  );
};

module.exports = {
  sendTicketCreated, sendStatusChanged, sendCommentAdded, sendOTPEmail,
  sendWeeklyDigest, sendTicketAssigned, sendAutoClosedNotification,
  sendSLAEscalated, sendDueDateReminder,
};
