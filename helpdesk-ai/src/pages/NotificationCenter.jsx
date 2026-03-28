import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const TYPE_ICON = {
  ticket_update: '🎫',
  comment:       '💬',
  assignment:    '👤',
  sla_breach:    '🚨',
  due_date:      '⏰',
  auto_close:    '🔒',
  mention:       '@',
  system:        '⚙️',
};

const TYPE_LABEL = {
  ticket_update: 'Ticket Update',
  comment:       'New Comment',
  assignment:    'Assignment',
  sla_breach:    'SLA Breach',
  due_date:      'Due Date',
  auto_close:    'Auto-Closed',
  mention:       'Mention',
  system:        'System',
};

const TYPE_COLOR = {
  ticket_update: '#3b82f6',
  comment:       '#a78bfa',
  assignment:    '#34d399',
  sla_breach:    '#ef4444',
  due_date:      '#f59e0b',
  auto_close:    '#6b7280',
  mention:       '#f472b6',
  system:        '#94a3b8',
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [filter, setFilter]               = useState('all');
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const deleteOne = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setUnreadCount(prev => {
        const deleted = notifications.find(n => n._id === id);
        return deleted && !deleted.isRead ? Math.max(0, prev - 1) : prev;
      });
    } catch { /* ignore */ }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleClick = async (notif) => {
    if (!notif.isRead) await markRead(notif._id);
    if (notif.link) navigate(notif.link);
  };

  const allTypes = [...new Set(notifications.map(n => n.type))];
  const visible  = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: 'var(--color-canvas-default)', color: 'var(--color-fg-default)' }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-white text-lg"
                style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)' }}>
                🔔
              </span>
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: '#ef4444' }}>
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm mt-1 ml-0.5" style={{ color: 'var(--color-fg-subtle)' }}>
              Your activity, alerts and updates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="p-2 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-fg-subtle)' }}
              title="Refresh">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-fg-muted)', backgroundColor: 'var(--color-canvas-subtle)' }}>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll}
                className="px-3 py-1.5 text-sm rounded-lg border transition-colors text-red-400 hover:text-red-300 border-red-900/40 hover:border-red-700/60 hover:bg-red-900/20">
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-red-700/40 bg-red-900/20 text-red-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {error}
            <button onClick={load} className="ml-auto underline text-xs">Retry</button>
          </div>
        )}

        {/* Type filter pills */}
        {allTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filter === 'all'
                  ? 'text-white border-transparent'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
              style={filter === 'all' ? { backgroundColor: '#FF634A', borderColor: '#FF634A' } : {}}>
              All ({notifications.length})
            </button>
            {allTypes.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filter === t
                    ? 'text-white border-transparent'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
                style={filter === t ? { backgroundColor: TYPE_COLOR[t] || '#FF634A', borderColor: TYPE_COLOR[t] || '#FF634A' } : {}}>
                {TYPE_ICON[t]} {TYPE_LABEL[t] || t} ({notifications.filter(n => n.type === t).length})
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[68px] rounded-xl animate-pulse" style={{ backgroundColor: 'var(--color-canvas-subtle)' }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
              style={{ backgroundColor: 'var(--color-canvas-subtle)' }}>
              🔕
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--color-fg-default)' }}>
              {filter === 'all' ? "You're all caught up!" : `No ${TYPE_LABEL[filter] || filter} notifications`}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-fg-subtle)' }}>
              {filter === 'all'
                ? 'Notifications for ticket updates, comments, and assignments will appear here.'
                : <button onClick={() => setFilter('all')} className="underline">View all notifications</button>
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Unread section label */}
            {visible.some(n => !n.isRead) && (
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 px-1"
                style={{ color: 'var(--color-fg-subtle)' }}>
                Unread · {visible.filter(n => !n.isRead).length}
              </p>
            )}
            {visible.map((notif, idx) => {
              const showReadDivider = idx > 0 && !notif.isRead === false && !visible[idx - 1].isRead === true;
              const color = TYPE_COLOR[notif.type] || '#94a3b8';
              return (
                <div key={notif._id}>
                  {idx > 0 && visible[idx - 1] && !visible[idx - 1].isRead && notif.isRead && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider my-3 px-1"
                      style={{ color: 'var(--color-fg-subtle)' }}>
                      Earlier
                    </p>
                  )}
                  <div
                    onClick={() => handleClick(notif)}
                    className={`group relative flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                      notif.link ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    style={{
                      backgroundColor: notif.isRead ? 'var(--color-canvas-subtle)' : `${color}0a`,
                      borderColor: notif.isRead ? 'var(--color-border-muted)' : `${color}30`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = notif.isRead ? 'var(--color-border-default)' : `${color}60`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = notif.isRead ? 'var(--color-border-muted)' : `${color}30`; }}
                  >
                    {/* Unread dot */}
                    {!notif.isRead && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: '#FF634A' }} />
                    )}

                    {/* Type icon badge */}
                    <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base"
                      style={{ backgroundColor: `${color}18`, border: `1px solid ${color}25` }}>
                      {TYPE_ICON[notif.type] || '🔔'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug ${notif.isRead ? '' : ''}`}
                          style={{ color: notif.isRead ? 'var(--color-fg-muted)' : 'var(--color-fg-default)' }}>
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-fg-subtle)' }}>
                            {timeAgo(notif.createdAt)}
                          </span>
                          <button
                            onClick={(e) => deleteOne(notif._id, e)}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-xs transition-all hover:bg-red-500/20 hover:text-red-400"
                            style={{ color: 'var(--color-fg-subtle)' }}
                            title="Delete">
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-fg-subtle)' }}>
                        {notif.message}
                      </p>
                      {notif.ticketId && (
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                          style={{ backgroundColor: `${color}15`, color }}>
                          #{notif.ticketId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
