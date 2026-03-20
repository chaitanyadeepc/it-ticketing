import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const TYPE_STYLES = {
  critical: 'bg-red-950/80 border-red-500/50 text-red-200',
  warning:  'bg-amber-950/80 border-amber-500/50 text-amber-200',
  info:     'bg-blue-950/80 border-blue-500/50 text-blue-200',
};
const TYPE_ICONS = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };
const STORAGE_KEY = 'dismissed_announcements';

const getDismissed = () => {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const location = useLocation();

  // All hooks must be called unconditionally — early return is AFTER this
  useEffect(() => {
    const hiddenPaths = ['/', '/login', '/register'];
    if (hiddenPaths.includes(location.pathname)) {
      setAnnouncements([]);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    fetch(`${API}/api/announcements/active`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const dismissed = getDismissed();
        setAnnouncements(data.announcements.filter(a => !dismissed.includes(a._id)));
      })
      .catch(() => {});
  }, [location.pathname]);

  const hiddenPaths = ['/', '/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;

  const dismiss = (id) => {
    const dismissed = getDismissed();
    if (!dismissed.includes(id)) sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed, id]));
    setAnnouncements(prev => prev.filter(a => a._id !== id));
  };

  if (!announcements.length) return null;

  return (
    <div className="flex flex-col gap-1">
      {announcements.map(ann => (
        <div key={ann._id} className={`flex items-center gap-3 px-4 py-2 border-b text-sm ${TYPE_STYLES[ann.type] || TYPE_STYLES.info}`}>
          <span>{TYPE_ICONS[ann.type]}</span>
          <p className="flex-1">{ann.message}</p>
          <button onClick={() => dismiss(ann._id)} className="ml-auto p-1 rounded hover:opacity-70 transition-opacity" aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
