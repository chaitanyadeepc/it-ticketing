import { useEffect, useState, useRef } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

const Toggle = ({ enabled, onChange }) => (
  <button onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${enabled ? 'bg-[#3b82f6]' : 'bg-[#27272a]'}`}>
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const EMPTY = { title: '', body: '', category: '', tags: '', isGlobal: true };

export default function CannedResponses() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [copied, setCopied]   = useState(null);
  const formRef               = useRef(null);
  const userRole = localStorage.getItem('userRole') || localStorage.getItem('role') || 'agent';

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/canned-responses'); setItems(data.responses || data.cannedResponses || []); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(EMPTY); setEditId(null); };

  const startEdit = (item) => {
    setForm({ title: item.title, body: item.body, category: item.category || '', tags: (item.tags || []).join(', '), isGlobal: item.isGlobal });
    setEditId(item._id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      if (editId) await api.patch(`/canned-responses/${editId}`, payload);
      else        await api.post('/canned-responses', payload);
      resetForm(); load();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this canned response?')) return;
    await api.delete(`/canned-responses/${id}`);
    load();
  };

  const copyText = async (item) => {
    try { await api.post(`/canned-responses/${item._id}/use`); } catch { /* ignore */ }
    navigator.clipboard.writeText(item.body).catch(() => {});
    setCopied(item._id);
    setTimeout(() => setCopied(null), 2000);
    setItems(prev => prev.map(i => i._id === item._id ? { ...i, usageCount: (i.usageCount || 0) + 1 } : i));
  };

  const filtered = items.filter(i =>
    !search ||
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 mb-6 rounded-2xl bg-gradient-to-r from-[#6366f1]/8 via-[#3b82f6]/4 to-transparent border border-[#6366f1]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">Canned Responses</h1>
            <p className="text-[13px] text-[#a1a1aa]">Shared reply templates for quick agent responses</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#52525b] font-mono">{items.length} templates</span>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="pl-9 pr-4 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-[13px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] w-52" />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start">

          {/* Left: Form */}
          <div ref={formRef} className="bg-[#18181b] border border-[#27272a] border-t-[3px] rounded-2xl p-5" style={{ borderTopColor: editId ? '#f59e0b' : '#6366f1' }}>
            <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4">
              {editId ? 'Edit Response' : 'New Canned Response'}
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required placeholder="e.g. Password Reset Instructions"
                  className="w-full h-10 px-3.5 bg-[#111113] border border-[#27272a] rounded-lg text-[13px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Body *</label>
                <textarea rows={5} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  required placeholder="Enter the response text..."
                  className="w-full px-3.5 py-3 bg-[#111113] border border-[#27272a] rounded-lg text-[13px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 resize-y font-mono transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Category</label>
                  <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Access, Network" list="cat-list"
                    className="w-full h-10 px-3.5 bg-[#111113] border border-[#27272a] rounded-lg text-[13px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] transition-all" />
                  <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Tags</label>
                  <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="reset, password, ..."
                    className="w-full h-10 px-3.5 bg-[#111113] border border-[#27272a] rounded-lg text-[13px] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] transition-all" />
                </div>
              </div>
              {userRole === 'admin' && (
                <div className="flex items-center justify-between py-3 border-t border-[#27272a]">
                  <div>
                    <p className="text-[13px] font-medium text-[#fafafa]">{form.isGlobal ? 'Global (all agents)' : 'Personal only'}</p>
                    <p className="text-[11px] text-[#52525b]">Shared with all agents</p>
                  </div>
                  <Toggle enabled={form.isGlobal} onChange={v => setForm(f => ({ ...f, isGlobal: v }))} />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-[13px] font-semibold rounded-xl transition-colors">
                  {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
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
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-[#18181b] border border-[#27272a] rounded-2xl animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#52525b] bg-[#18181b] border border-[#27272a] rounded-2xl">
                <svg className="w-12 h-12 text-[#3f3f46] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-[14px] font-medium text-[#71717a]">{search ? 'No matches found' : 'No canned responses yet'}</p>
                <p className="text-[12px] mt-1">Create templates to speed up ticket responses</p>
              </div>
            ) : (
              filtered.map(item => (
                <div key={item._id} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 hover:border-[#3f3f46] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[13px] font-semibold text-[#fafafa]">{item.title}</span>
                        {item.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa]">{item.category}</span>
                        )}
                        {item.isGlobal && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6]">Global</span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#71717a] line-clamp-2 font-mono leading-relaxed">{item.body}</p>
                      {(item.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#27272a] text-[#52525b]">#{t}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-[#52525b] mt-2">
                        Used {item.usageCount || 0}x by {item.createdByName || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => copyText(item)}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                          copied === item._id
                            ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]'
                            : 'bg-[#27272a] border-[#3f3f46] text-[#a1a1aa] hover:border-[#52525b]'
                        }`}>
                        {copied === item._id ? 'Copied' : 'Copy'}
                      </button>
                      <button onClick={() => startEdit(item)}
                        className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:border-[#52525b] transition-colors">
                        Edit
                      </button>
                      {userRole === 'admin' && (
                        <button onClick={() => remove(item._id)}
                          className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:border-[#ef4444]/40 hover:text-[#ef4444] transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
