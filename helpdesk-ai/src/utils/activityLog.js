/**
 * HiTicket Activity Logger
 * Sends log entries to the backend API (MongoDB).
 * Admin-only read/delete access enforced server-side.
 * Fire-and-forget — never throws, never blocks the caller.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Session ID (persists per browser tab) ──────────────────────────────────
const getSessionId = () => {
  let sid = sessionStorage.getItem('hd_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('hd_sid', sid);
  }
  return sid;
};

// ── Core write function ────────────────────────────────────────────────────
/**
 * @param {string} action      - Machine-readable verb e.g. 'TICKET_CREATED'
 * @param {object} opts
 *   @param {string} opts.category  - 'AUTH' | 'TICKET' | 'COMMENT' | 'USER_MGMT' | 'SETTINGS' | 'ADMIN' | 'SYSTEM'
 *   @param {string} opts.severity  - 'info' | 'warning' | 'error' | 'critical'
 *   @param {string} opts.detail    - Human-readable description
 *   @param {object} opts.metadata  - Arbitrary key/value payload (no passwords)
 *   @param {object} opts.actor     - Actor override for pre-auth events (LOGIN_FAILED etc.)
 */
export const logActivity = (action, {
  category = 'SYSTEM',
  severity = 'info',
  detail   = '',
  metadata = {},
  actor    = null,
} = {}) => {
  try {
    const token     = localStorage.getItem('token');
    const sessionId = getSessionId();
    const userAgent = navigator.userAgent;

    const body = JSON.stringify({ action, category, severity, detail, metadata, sessionId, userAgent });

    // Pre-auth events (LOGIN_FAILED, 2FA_INITIATED etc.) use the anonymous endpoint
    // because the user has no valid token yet. Supply actor from call-site.
    if (actor) {
      fetch(`${BASE_URL}/logs/anonymous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, category, severity, detail, metadata, sessionId, userAgent, actor }),
        keepalive: true,
      }).catch(() => {});
      return;
    }

    if (!token) return; // Not authenticated — skip silently

    fetch(`${BASE_URL}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
      keepalive: true, // survives page unload
    }).catch(() => {}); // never surface errors
  } catch {
    // Logging must never break the application
  }
};

// ── Export helper (called from ActivityLog page with already-fetched data) ─
export const exportLogsData = (logs) => {
  const json = JSON.stringify(logs, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `hiticket-activity-log-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
