import { useEffect, useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

const Toggle = ({ enabled, onChange }) => (
  <button onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${enabled ? 'bg-[#3b82f6]' : 'bg-[#27272a]'}`}>
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const TYPE_CFG = {
  info:     { color: '#3b82f6', badge: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20', border: 'border-[#3b82f6]/25', dot: '#3b82f6',
              icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  warning:  { color: '#f59e0b', badge: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20', border: 'border-[#f59e0b]/25', dot: '#f59e0b',
              icon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
  critical: { color: '#ef4444', badge: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20', border: 'border-[#ef4444]/25', dot: '#ef4444',
              icon: 'M12 9v4m0 4h.01M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z' },
};

const EMPTY = { title: '', body: '', type: 'info', isActive: true };

export default function Announcements() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/announcements'); setItems(data.announcements || []); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(EMPTY); setEditId(null); };

  const startEdit = (item) => {
    setForm({ title: item.title, body: item.body, type: item.type || 'info', isActive: item.isActive });
    setEditId(item._id);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await api.patch(`/announcements/${editId}`, form);
      else        await api.post('/announcements', form);
      resetForm(); load();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    load();
  };

  const toggleActive = async (item) => {
    await api.patch(`/announcements/${item._id}`, { isActive: !item.isActive });
    load();
  };

  const activeCount   = items.filter(i => i.isActive).length;
  const criticalCount = items.filter(i => i.type === 'critical' && i.isActive).length;

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 mb-6 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#8b5cf6]/4 to-transparent border border-[#3b82f6]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">Announcements</h1>
            <p className="text-[13px] text-[#a1a1aa]">Platform-wide notices displayed to all users</p>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                {criticalCount} critical
              </span>
            )}
            <span className="text-[12px] px-3 py-1.5 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
              {activeCount} active
            </span>
            <span className="text-[12px] text-[#52525b]">{items.length} total</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">

          {/* Left: Form */}
          <div className="bg-[#18181b] border border-[#27272a] border-t-[3px] rounded-2xl p-5" style={{ borderTopColor: editId ? '#f59e0b' : '#3b82f6' }}>
            <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4">
              {editId ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required placeholder="Announcement title..."
                  className="w-full h-10 px-3.5 bg-[#111113] border border-[#27272a] rounded-lg text-[13px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Message *</label>
                <textarea rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  required placeholder="Announcement message..."
                  className="w-full px-3.5 py-3 bg-[#111113] border border-[#27272a] rounded-lg text-[13px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 resize-none transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Type</label>
                <div className="flex gap-2">
                  {Object.keys(TYPE_CFG).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all capitalize ${
                        form.type === t
                          ? `bg-[${TYPE_CFG[t].color}]/15 border-[${TYPE_CFG[t].color}]/40 text-[${TYPE_CFG[t].color}]`
                          : 'bg-[#27272a] border-[#3f3f46] text-[#52525b] hover:text-[#a1a1aa]'
                      }`}
                      style={form.type === t ? { background: TYPE_CFG[t].color + '18', borderColor: TYPE_CFG[t].color + '50', color: TYPE_CFG[t].color } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-[#27272a]">
                <div>
                  <p className="text-[13px] font-medium text-[#fafafa]">Active</p>
                  <p className="text-[11px] text-[#52525b]">Show to all users</p>
                </div>
                <Toggle enabled={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-[13px] font-semibold rounded-xl transition-colors">
                  {saving ? 'Saving...' : editId ? 'Update' : 'Publish'}
                </button>
                {editId && (
                  <button type="button" onClick={resetForm}
                    className="px-5 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] text-[13px] rounded-xl transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right: List */}
          <div className="space-y-3 min-w-0">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 bg-[#18181b] border border-[#27272a] rounded-2xl animate-pulse" />
              ))
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#18181b] border border-[#27272a] rounded-2xl">
                <svg className="w-12 h-12 text-[#3f3f46] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 9h5.318M5.436 13.683L4 19h16l-1.436-5.317M5.436 13.683l12.128 0" />
                </svg>
                <p className="text-[14px] font-medium text-[#71717a]">No announcements yet</p>
                <p className="text-[12px] text-[#52525b] mt-1">Create one to notify all users</p>
              </div>
            ) : (
              items.map(item => {
                const cfg = TYPE_CFG[item.type] || TYPE_CFG.info;
                return (
                  <div key={item._id}
                    className={`bg-[#18181b] border rounded-2xl p-4 transition-colors hover:border-[#3f3f46] ${item.isActive ? cfg.border : 'border-[#27272a] opacity-60'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: cfg.color + '18' }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: cfg.color }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-[#fafafa]">{item.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${cfg.badge}`}>
                              {item.type}
                            </span>
                            {!item.isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#27272a] border border-[#3f3f46] text-[#52525b]">Inactive</span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#a1a1aa] leading-relaxed line-clamp-2">{item.body}</p>
                          <p className="text-[11px] text-[#52525b] mt-1.5">
                            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Toggle enabled={item.isActive} onChange={() => toggleActive(item)} />
                        <button onClick={() => startEdit(item)}
                          className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:border-[#52525b] transition-colors ml-1">
                          Edit
                        </button>
                        <button onClick={() => remove(item._id)}
                          className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:border-[#ef4444]/40 hover:text-[#ef4444] transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
