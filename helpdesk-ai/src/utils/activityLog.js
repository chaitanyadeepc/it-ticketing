/**
 * HiTicket Activity Logger
 * Writes structured log entries to localStorage.
 * Admin-only access enforced at the route level (AdminRoute).
 * Max 1000 entries — oldest are evicted automatically.
 */

const LOG_KEY = 'hd_activity_log';
const MAX_LOGS = 1000;

// ── Session ID (persists per browser tab) ──────────────────────────────────
const getSessionId = () => {
  let sid = sessionStorage.getItem('hd_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('hd_sid', sid);
  }
  return sid;
};

// ── Resolve current actor from localStorage/token ─────────────────────────
const getActor = () => {
  try {
    const token = localStorage.getItem('token');
    let tokenId = null;
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      tokenId = payload.id || payload._id || null;
    }
    return {
      id:    tokenId,
      name:  localStorage.getItem('userName')  || 'Unknown',
      email: localStorage.getItem('userEmail') || 'unknown@system',
      role:  localStorage.getItem('userRole')  || 'user',
    };
  } catch {
    return { id: null, name: 'System', email: 'system', role: 'system' };
  }
};

// ── Core write function ────────────────────────────────────────────────────
/**
 * @param {string} action      - Machine-readable verb e.g. 'TICKET_CREATED'
 * @param {object} opts
 *   @param {string} opts.category  - 'AUTH' | 'TICKET' | 'COMMENT' | 'USER_MGMT' | 'SETTINGS' | 'ADMIN' | 'SYSTEM'
 *   @param {string} opts.severity  - 'info' | 'warning' | 'error' | 'critical'
 *   @param {string} opts.detail    - Human-readable description
 *   @param {object} opts.metadata  - Arbitrary key/value payload (no passwords)
 *   @param {object} opts.actor     - Override actor (for login events where localStorage isn't set yet)
 */
export const logActivity = (action, {
  category = 'SYSTEM',
  severity = 'info',
  detail   = '',
  metadata = {},
  actor    = null,
} = {}) => {
  try {
    const logs = getLogs();
    const entry = {
      id:        Math.random().toString(36).slice(2, 9) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      actor:     actor || getActor(),
      action,
      category,
      severity,
      detail,
      metadata,
      userAgent: navigator.userAgent,
      sessionId: getSessionId(),
    };
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {
    // Logging must never break the application
  }
};

// ── Read ──────────────────────────────────────────────────────────────────
export const getLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
};

// ── Clear ─────────────────────────────────────────────────────────────────
export const clearLogs = () => {
  try { localStorage.removeItem(LOG_KEY); } catch {}
};

// ── Export as downloadable JSON ───────────────────────────────────────────
export const exportLogs = () => {
  const logs = getLogs();
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
