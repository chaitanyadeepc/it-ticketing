import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [filter, setFilter]               = useState('all');
  const [loading, setLoading]             = useState(true);
  const navigate = useNavigate();

  const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/notifications`, { headers: authHdr() });
      const data = await r.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await fetch(`${API}/api/notifications/${id}/read`, { method: 'PATCH', headers: authHdr() });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch(`${API}/api/notifications/read-all`, { method: 'PATCH', headers: authHdr() });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const deleteOne = async (id, e) => {
    e.stopPropagation();
    await fetch(`${API}/api/notifications/${id}`, { method: 'DELETE', headers: authHdr() });
    setNotifications(prev => prev.filter(n => n._id !== id));
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    await fetch(`${API}/api/notifications`, { method: 'DELETE', headers: authHdr() });
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleClick = async (notif) => {
    if (!notif.isRead) await markRead(notif._id);
    if (notif.link) navigate(notif.link);
  };

  const allTypes = [...new Set(notifications.map(n => n.type))];
  const visible = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const unread  = visible.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🔔 Notification Center
              {unreadCount > 0 && (
                <span className="text-sm bg-[#FF634A] text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Your recent activity and alerts</p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors">
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-700 rounded-lg transition-colors text-zinc-400 hover:text-red-400">
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Type filter pills */}
        {allTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setFilter('all')} className={`px-3 py-1 text-xs rounded-full border transition-colors ${filter === 'all' ? 'bg-[#FF634A] border-[#FF634A] text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
              All ({notifications.length})
            </button>
            {allTypes.map(t => (
              <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${filter === t ? 'bg-[#FF634A] border-[#FF634A] text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {TYPE_ICON[t]} {TYPE_LABEL[t] || t}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-zinc-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-5xl mb-4">🔕</p>
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(notif => (
              <div
                key={notif._id}
                onClick={() => handleClick(notif)}
                className={`group relative flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  notif.isRead
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {!notif.isRead && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#FF634A]" />
                )}
                <span className="text-xl shrink-0 ml-2">{TYPE_ICON[notif.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${notif.isRead ? 'text-zinc-300' : 'text-zinc-100'}`}>{notif.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{notif.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-500">{timeAgo(notif.createdAt)}</span>
                  <button
                    onClick={(e) => deleteOne(notif._id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-all"
                    aria-label="Delete"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
