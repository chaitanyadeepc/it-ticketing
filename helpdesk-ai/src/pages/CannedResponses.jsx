import { useEffect, useState, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
  const userRole = localStorage.getItem('role') || 'agent';

  const authHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = async () => {
    setLoading(true);
    const r = await fetch(`${API}/api/canned-responses`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const d = await r.json();
    setItems(d.cannedResponses || []);
    setLoading(false);
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
      const url = editId ? `${API}/api/canned-responses/${editId}` : `${API}/api/canned-responses`;
      const method = editId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: authHdr(), body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json(); alert(d.error); return; }
      resetForm();
      load();
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this canned response?')) return;
    await fetch(`${API}/api/canned-responses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    load();
  };

  const copyText = async (item) => {
    await fetch(`${API}/api/canned-responses/${item._id}/use`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">💬 Canned Responses</h1>
            <p className="text-zinc-400 text-sm mt-1">Shared reply templates for quick responses</p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or category…"
            className="w-full sm:w-72 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF634A]"
          />
        </div>

        {/* Form */}
        <div ref={formRef} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">{editId ? 'Edit Response' : 'New Canned Response'}</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-zinc-400 mb-1">Title <span className="text-[#FF634A]">*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required placeholder="e.g. Password Reset Instructions"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF634A]"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-sm text-zinc-400 mb-1">Category</label>
                <input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Account, Access"
                  list="categories-list"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF634A]"
                />
                <datalist id="categories-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Body <span className="text-[#FF634A]">*</span></label>
              <textarea
                rows={5}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                required
                placeholder="Enter the response text…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF634A] resize-y font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-zinc-400 mb-1">Tags (comma-separated)</label>
                <input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. reset, password, login"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF634A]"
                />
              </div>
              {userRole === 'admin' && (
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setForm(f => ({ ...f, isGlobal: !f.isGlobal }))}
                      className={`w-10 h-6 rounded-full transition-colors ${form.isGlobal ? 'bg-[#FF634A]' : 'bg-zinc-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form.isGlobal ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm text-zinc-400">{form.isGlobal ? 'Global (all agents)' : 'Personal'}</span>
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#FF634A] hover:bg-[#e0552e] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
              </button>
              {editId && (
                <button type="button" onClick={resetForm} className="px-5 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-xl hover:bg-zinc-700 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-zinc-800/50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-lg">{search ? 'No matches found' : 'No canned responses yet'}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(item => (
              <div key={item._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-zinc-100">{item.title}</span>
                      {item.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">{item.category}</span>
                      )}
                      {item.isGlobal && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-400">Global</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-2 font-mono">{item.body}</p>
                    {(item.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">#{t}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-zinc-600 mt-2">
                      Used {item.usageCount || 0} times · by {item.createdByName || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyText(item)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
                    >
                      {copied === item._id ? '✓ Copied' : 'Copy'}
                    </button>
                    <button onClick={() => startEdit(item)} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors">
                      Edit
                    </button>
                    {userRole === 'admin' && (
                      <button onClick={() => remove(item._id)} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-red-700 hover:text-red-400 transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
