import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

const CATEGORIES = ['All', 'General', 'Hardware', 'Software', 'Network', 'Access', 'Security', 'Policies'];

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const isStaff = ['agent', 'admin'].includes(userRole);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'General', tags: '', isPublished: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    api.get('/kb').then(({ data }) => setArticles(data.articles || [])).catch(() => setError('Failed to load articles.')).finally(() => setLoading(false));
  }, []);

  const filtered = articles
    .filter(a => category === 'All' || a.category === category)
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase()) || (a.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSaveMsg('');
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const { data } = await api.post('/kb', { ...form, tags });
      setArticles(prev => [data.article, ...prev]);
      setShowCreate(false);
      setForm({ title: '', content: '', category: 'General', tags: '', isPublished: true });
      setSaveMsg('Article published!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(err.response?.data?.error || 'Failed to save article.');
    } finally {
      setSubmitting(false);
    }
  };

  const [ratedIds, setRatedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hd_kb_rated') || '[]'); } catch { return []; }
  });

  // Auto-KB: check for pre-filled draft from TicketDetail "Convert to KB Article"
  useEffect(() => {
    const draftRaw = sessionStorage.getItem('hd_kb_draft');
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw);
        setForm(f => ({
          ...f,
          title:    draft.prefillTitle    || f.title,
          content:  draft.prefillContent  || f.content,
          category: draft.prefillCategory || f.category,
        }));
        setShowCreate(true);
        sessionStorage.removeItem('hd_kb_draft');
      } catch {}
    }
  }, []);

  // Edit state for staff
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', category: 'General', tags: '', isPublished: true });
  const [editSaving, setEditSaving] = useState(false);

  const startEdit = (article) => {
    setEditingId(article._id);
    setEditForm({ title: article.title, content: article.content, category: article.category, tags: (article.tags || []).join(', '), isPublished: article.isPublished !== false });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const tags = editForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      const { data } = await api.put(`/kb/${editingId}`, { ...editForm, tags });
      setArticles(prev => prev.map(a => a._id === editingId ? data.article : a));
      if (selected?._id === editingId) setSelected(data.article);
      setEditingId(null);
      setSaveMsg('Article updated!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(err.response?.data?.error || 'Failed to update article.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleView = async (article) => {
    setSelected(article);
    try { await api.get(`/kb/${article._id}`); } catch { /* ignore */ }
  };

  const handleRate = async (vote) => {
    if (!selected || ratedIds.includes(selected._id)) return;
    try {
      const { data } = await api.post(`/kb/${selected._id}/helpful`, { vote });
      setSelected(a => ({ ...a, helpful: data.helpful, notHelpful: data.notHelpful }));
      const updated = [...ratedIds, selected._id];
      setRatedIds(updated);
      localStorage.setItem('hd_kb_rated', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const hasRated = selected ? ratedIds.includes(selected._id) : false;

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this article?')) return;
    try {
      await api.delete(`/kb/${id}`);
      setArticles(prev => prev.filter(a => a._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch { /* ignore */ }
  };

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#6366f1]/4 to-transparent border border-[#3b82f6]/15">
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-bold text-[#fafafa] mb-0.5">Knowledge Base</h1>
            <p className="text-[13px] text-[#a1a1aa]">{articles.length} article{articles.length !== 1 ? 's' : ''} — search for IT guides, FAQs, and solutions</p>
          </div>
          {isStaff && (
            <button
              onClick={() => setShowCreate(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-semibold rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              New Article
            </button>
          )}
        </div>

        {saveMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] text-[13px]">
            {saveMsg}
          </div>
        )}

        {/* Create form */}
        {showCreate && isStaff && (
          <form onSubmit={handleCreate} className="mb-6 bg-[#18181b] border border-[#3b82f6]/30 border-t-[3px] rounded-2xl p-5 space-y-3" style={{ borderTopColor: '#3b82f6' }}>
            <h2 className="text-[15px] font-semibold text-[#fafafa] mb-2">New Article</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Article title *"
                required
                className="bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b]"
              />
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#3b82f6]"
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Article content (Markdown supported) *"
              required
              rows={8}
              className="w-full bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b] resize-y font-mono"
            />
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="Tags (comma-separated)"
                className="flex-1 bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b]"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#3b82f6]" />
                <span className="text-[13px] text-[#a1a1aa]">Publish immediately</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-[13px] text-[#a1a1aa] hover:text-[#fafafa] transition-colors">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors">
                  {submitting ? 'Saving…' : 'Publish'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[13px] rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b]"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 flex-nowrap sm:flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
                  category === c
                    ? 'bg-[#3b82f6]/15 border-[#3b82f6]/35 text-[#3b82f6]'
                    : 'bg-transparent border-[#27272a] text-[#71717a] hover:text-[#fafafa]'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Layout: list + detail */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Article list */}
          <div className={`${selected ? 'hidden lg:block' : ''} lg:col-span-1 space-y-2`}>
            {loading && (
              <div className="space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-xl bg-[#18181b] border border-[#27272a] p-4 space-y-2">
                    <div className="skeleton h-4 w-2/3 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 text-[#52525b] text-[13px]">
                {search || category !== 'All' ? 'No articles match your query.' : 'No articles yet.'}
              </div>
            )}
            {!loading && filtered.map(a => (
              <button key={a._id} onClick={() => handleView(a)} className={`w-full text-left rounded-xl border p-4 transition-all ${
                selected?._id === a._id
                  ? 'bg-[#3b82f6]/10 border-[#3b82f6]/35'
                  : 'bg-[#18181b] border-[#27272a] hover:border-[#3f3f46]'
              }`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[13px] font-semibold text-[#fafafa] leading-snug line-clamp-2">{a.title}</p>
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[#27272a] text-[#71717a]">{a.category}</span>
                </div>
                <p className="text-[12px] text-[#71717a] line-clamp-2 mb-2">{a.content.slice(0, 120)}…</p>
                <div className="flex items-center gap-2 text-[10px] text-[#52525b]">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  {a.views || 0} views
                  <span className="ml-auto">{new Date(a.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Article detail */}
          {selected ? (
            <div className="lg:col-span-2 bg-[#18181b] border border-[#27272a] border-t-[3px] rounded-2xl p-6" style={{ borderTopColor: '#3b82f6' }}>
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#3b82f6]/15 text-[#3b82f6] font-medium">{selected.category}</span>
                  <h2 className="text-[20px] font-bold text-[#fafafa] mt-2 leading-snug">{selected.title}</h2>
                  <p className="text-[12px] text-[#52525b] mt-1">
                    By {selected.authorName || 'Staff'} · {new Date(selected.createdAt).toLocaleDateString([], { dateStyle: 'long' })} · {selected.views || 0} views
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 items-center">
                  {isStaff && (
                    <>
                      <button onClick={() => startEdit(selected)}
                        className="p-2 rounded-lg text-[#3f3f46] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors" title="Edit article">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(selected._id)}
                        className="p-2 rounded-lg text-[#3f3f46] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors" title="Delete article">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelected(null)} className="lg:hidden p-2 rounded-lg text-[#71717a] hover:text-[#fafafa] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Tags */}
              {editingId === selected._id ? (
                <form onSubmit={handleUpdate} className="space-y-3 mt-4 p-4 bg-[#27272a]/50 rounded-xl border border-[#3b82f6]/30">
                  <h3 className="text-[13px] font-semibold text-[#fafafa] mb-1">Edit Article</h3>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required
                    className="w-full bg-[#18181b] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b]"
                    placeholder="Article title *" />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="bg-[#18181b] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3b82f6]">
                      {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                      className="bg-[#18181b] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b]"
                      placeholder="Tags (comma-separated)" />
                  </div>
                  <textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} required
                    rows={10} className="w-full bg-[#18181b] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3b82f6] resize-y font-mono placeholder-[#52525b]"
                    placeholder="Content (Markdown supported) *" />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#a1a1aa]">
                      <input type="checkbox" checked={editForm.isPublished} onChange={e => setEditForm(f => ({ ...f, isPublished: e.target.checked }))} className="w-3.5 h-3.5 rounded accent-[#3b82f6]" />
                      Published
                    </label>
                    <button type="button" onClick={() => setEditingId(null)} className="ml-auto text-[12px] text-[#71717a] hover:text-[#fafafa]">Cancel</button>
                    <button type="submit" disabled={editSaving} className="px-4 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors">
                      {editSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
              {/* Tags */}
              {selected.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {selected.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 text-[11px] rounded-full bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]">{t}</span>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="prose prose-invert prose-sm max-w-none text-[14px] text-[#a1a1aa] leading-relaxed whitespace-pre-wrap font-[inherit]">
                {selected.content}
              </div>
              </>
              )}

              {/* Was this helpful */}
              <div className="mt-8 pt-5 border-t border-[#27272a] flex flex-wrap items-center gap-3">
                <p className="text-[13px] text-[#52525b]">Was this article helpful?</p>
                {hasRated ? (
                  <span className="text-[12px] text-[#22c55e] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Thanks for your feedback!
                  </span>
                ) : (
                  <>
                    <button onClick={() => handleRate('yes')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22c55e]/10 text-[#22c55e] text-[12px] hover:bg-[#22c55e]/20 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
                      Yes {selected?.helpful > 0 && <span className="text-[10px] opacity-70">({selected.helpful})</span>}
                    </button>
                    <button onClick={() => handleRate('no')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444] text-[12px] hover:bg-[#ef4444]/20 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg>
                      No {selected?.notHelpful > 0 && <span className="text-[10px] opacity-70">({selected.notHelpful})</span>}
                    </button>
                  </>
                )}
                <button
                  onClick={() => navigate('/raise-ticket')}
                  className="ml-auto text-[12px] text-[#3b82f6] hover:underline"
                >
                  Still need help? Open a ticket →
                </button>
              </div>
            </div>
          ) : (
            !loading && filtered.length > 0 && (
              <div className="hidden lg:flex lg:col-span-2 items-center justify-center text-[#52525b] text-[13px]">
                Select an article to read it here.
              </div>
            )
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
