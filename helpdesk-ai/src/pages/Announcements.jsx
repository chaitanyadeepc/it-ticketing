import { useEffect, useState, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TYPE_COLORS = {
  info:     { bg: 'bg-blue-900/30',  border: 'border-blue-700/50',  badge: 'bg-blue-900 text-blue-300'  },
  warning:  { bg: 'bg-amber-900/30', border: 'border-amber-700/50', badge: 'bg-amber-900 text-amber-300' },
  critical: { bg: 'bg-red-900/30',   border: 'border-red-700/50',   badge: 'bg-red-900 text-red-300'    },
};

const EMPTY_FORM = { message: '', type: 'info', isActive: true, expiresAt: '' };

export default function Announcements() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const formRef                 = useRef(null);

  const authHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = async () => {
    setLoading(true);
    const r = await fetch(`${API}/api/announcements`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const data = await r.json();
    setItems(data.announcements || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); };

  const startEdit = (ann) => {
    setForm({
      message:   ann.message,
      type:      ann.type,
      isActive:  ann.isActive,
      expiresAt: ann.expiresAt ? ann.expiresAt.slice(0, 16) : '',
    });
    setEditId(ann._id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, expiresAt: form.expiresAt || null };
      const url = editId ? `${API}/api/announcements/${editId}` : `${API}/api/announcements`;
      const method = editId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: authHdr(), body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); alert(d.error); return; }
      resetForm();
      load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (ann) => {
    await fetch(`${API}/api/announcements/${ann._id}`, {
      method: 'PATCH', headers: authHdr(),
      body: JSON.stringify({ isActive: !ann.isActive }),
    });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    await fetch(`${API}/api/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    load();
  };

  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">📢 Announcements</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage site-wide banners shown to all logged-in users</p>
        </div>

        {/* Form */}
        <div ref={formRef} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">{editId ? 'Edit Announcement' : 'New Announcement'}</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Message <span className="text-[#FF634A]">*</span></label>
              <textarea
                rows={3}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                placeholder="Enter the announcement message…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF634A] resize-none"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-sm text-zinc-400 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-[#FF634A]">
                  <option value="info">ℹ️ Info</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="critical">🚨 Critical</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-zinc-400 mb-1">Expires (optional)</label>
                <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-[#FF634A]" />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-[#FF634A]' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-zinc-400">{form.isActive ? 'Active' : 'Inactive'}</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF634A] hover:bg-[#e0552e] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editId ? 'Update' : 'Publish'}
              </button>
              {editId && (
                <button type="button" onClick={resetForm} className="px-5 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-xl hover:bg-zinc-700 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-zinc-800/50 rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-lg">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(ann => {
              const colors = TYPE_COLORS[ann.type] || TYPE_COLORS.info;
              return (
                <div key={ann._id} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border ${colors.bg} ${colors.border}`}>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>{ann.type.toUpperCase()}</span>
                      {!ann.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">INACTIVE</span>}
                      {ann.expiresAt && <span className="text-xs text-zinc-400">Expires: {fmt(ann.expiresAt)}</span>}
                    </div>
                    <p className="text-sm text-zinc-200">{ann.message}</p>
                    <p className="text-xs text-zinc-500 mt-1">Created by {ann.createdByName || '—'} · {fmt(ann.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(ann)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${ann.isActive ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-700 hover:text-amber-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-green-700 hover:text-green-400'}`}
                    >
                      {ann.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => startEdit(ann)} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => remove(ann._id)} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-red-700 hover:text-red-400 transition-colors">
                      Delete
                    </button>
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
