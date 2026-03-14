import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITY_COLOR = {
  Low: 'bg-blue-500/20 text-blue-400',
  Medium: 'bg-yellow-500/20 text-yellow-400',
  High: 'bg-orange-500/20 text-orange-400',
  Critical: 'bg-red-500/20 text-red-400',
};
const STATUS_COLOR = {
  Open: 'bg-blue-500/20 text-blue-400',
  'In Progress': 'bg-yellow-500/20 text-yellow-400',
  Resolved: 'bg-green-500/20 text-green-400',
  Closed: 'bg-zinc-500/20 text-zinc-400',
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('userRole') === 'admin';
  const { addToast } = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assignValue, setAssignValue] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [csatRating, setCsatRating] = useState(0);
  const [csatFeedback, setCsatFeedback] = useState('');
  const [csatSubmitting, setCsatSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    api.get(`/tickets/${id}`)
      .then(({ data }) => {
        setTicket(data.ticket);
        setAssignValue(data.ticket.assignedTo || '');
        setLoading(false);
      })
      .catch(() => { setError('Failed to load ticket.'); setLoading(false); });
  }, [id]);

  // Fetch agents list for admin assignment dropdown
  useEffect(() => {
    if (isAdmin) {
      api.get('/users').then(({ data }) => setAgents(data.users?.filter(u => u.isActive) || [])).catch(() => {});
    }
  }, [isAdmin]);

  const handleCsatSubmit = async (e) => {
    e.preventDefault();
    if (!csatRating) return;
    setCsatSubmitting(true);
    try {
      const { data } = await api.patch(`/tickets/${id}`, { satisfaction: { rating: csatRating, feedback: csatFeedback } });
      setTicket(data.ticket);
      addToast('Thank you for your feedback!');
    } catch {
      addToast('Failed to submit rating', 'error');
    } finally {
      setCsatSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingFiles(true);
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    try {
      const { data } = await api.post(`/tickets/${id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTicket(prev => ({ ...prev, attachments: data.attachments }));
      addToast(`${files.length} file(s) uploaded`);
    } catch (err) {
      addToast(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!window.confirm('Remove this attachment?')) return;
    try {
      await api.delete(`/tickets/${id}/attachments/${attId}`);
      setTicket(prev => ({ ...prev, attachments: prev.attachments.filter(a => a._id !== attId) }));
      addToast('Attachment removed');
    } catch {
      addToast('Failed to remove attachment', 'error');
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const { data } = await api.patch(`/tickets/${id}`, { status: newStatus });
      setTicket(data.ticket);
      addToast(`Status updated to "${newStatus}"`);
    } catch {
      addToast('Failed to update status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setAssigning(true);
    try {
      const { data } = await api.patch(`/tickets/${id}`, { assignedTo: assignValue });
      setTicket(data.ticket);
      addToast('Ticket assigned successfully');
    } catch {
      addToast('Failed to assign ticket', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleReopen = async () => {
    try {
      const { data } = await api.patch(`/tickets/${id}`, { status: 'Open' });
      setTicket(data.ticket);
      addToast('Ticket reopened');
    } catch {
      addToast('Failed to reopen ticket', 'error');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      const { data } = await api.patch(`/tickets/${id}`, { comment: comment.trim() });
      setTicket(data.ticket);
      setComment('');
      addToast('Comment posted');
    } catch {
      addToast('Failed to add comment', 'error');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this ticket? This cannot be undone.')) return;
    try {
      await api.delete(`/tickets/${id}`);
      addToast('Ticket deleted');
      navigate('/admin');
    } catch {
      addToast('Failed to delete ticket', 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-red-400">{error}</p>
      <button onClick={() => navigate(-1)} className="text-sm text-violet-400 hover:underline">Go back</button>
    </div>
  );

  const PRIORITY_ACCENT = { Low: '#3b82f6', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' };
  const STATUS_ACCENT   = { Open: '#22c55e', 'In Progress': '#f59e0b', Resolved: '#06b6d4', Closed: '#71717a' };
  const priorityColor = PRIORITY_ACCENT[ticket.priority] || '#3b82f6';
  const statusColor   = STATUS_ACCENT[ticket.status]   || '#a1a1aa';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-[#a1a1aa] hover:text-[#fafafa] mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Priority-colored header banner */}
      <div className="rounded-2xl border p-6 mb-5 relative overflow-hidden" style={{ borderColor: `${priorityColor}30`, background: `linear-gradient(135deg, ${priorityColor}0d 0%, transparent 60%)` }}>
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: priorityColor }} />
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[12px] font-mono text-[#52525b] mb-1">{ticket.ticketId}</p>
            <h1 className="text-[22px] font-bold text-[#fafafa]">{ticket.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[12px] font-semibold px-3 py-1 rounded-full border" style={{ color: priorityColor, borderColor: `${priorityColor}40`, backgroundColor: `${priorityColor}15` }}>
              {ticket.priority}
            </span>
            <span className="text-[12px] font-semibold px-3 py-1 rounded-full border" style={{ color: statusColor, borderColor: `${statusColor}40`, backgroundColor: `${statusColor}15` }}>
              {ticket.status}
            </span>
          </div>
        </div>
        <p className="text-[14px] text-[#a1a1aa] leading-relaxed mb-4">{ticket.description}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#27272a]">
          {[
            { label: 'Category', value: `${ticket.category}${ticket.subType ? ` / ${ticket.subType}` : ''}` },
            { label: 'Raised by', value: ticket.createdBy?.name || ticket.createdBy?.email || 'Unknown' },
            { label: 'Created',   value: new Date(ticket.createdAt).toLocaleDateString() },
            { label: 'Assigned',  value: ticket.assignedTo || 'Unassigned' },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-[11px] uppercase font-semibold tracking-wider text-[#52525b] block mb-0.5">{label}</span>
              <span className="text-[13px] text-[#fafafa]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Main column — comments + activity */}
        <div className="lg:col-span-2 space-y-4">

          {/* User: Reopen banner */}
          {!isAdmin && ticket.status === 'Resolved' && (
            <div className="rounded-xl border border-[#f97316]/25 bg-[#f97316]/8 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-[#fafafa]">Is your issue still not resolved?</p>
                <p className="text-[12px] text-[#a1a1aa] mt-0.5">Reopening will move this ticket back to Open.</p>
              </div>
              <button onClick={handleReopen} className="px-4 py-2 bg-[#f97316] hover:bg-[#ea6c00] text-white text-[13px] rounded-lg transition-colors font-medium whitespace-nowrap">
                Reopen Ticket
              </button>
            </div>
          )}

          {/* Comments */}
          <div className="bg-[#18181b] border border-[#27272a] border-t-[3px] rounded-xl p-5" style={{ borderTopColor: '#8b5cf6' }}>
            <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              Comments <span className="text-[12px] text-[#52525b] font-normal">({ticket.comments?.length || 0})</span>
            </h2>
            {ticket.comments?.length === 0 && (
              <p className="text-[13px] text-[#52525b] mb-4">No comments yet. Be the first to comment.</p>
            )}
            <div className="space-y-3 mb-4">
              {ticket.comments?.map((c, i) => (
                <div key={i} className="rounded-lg bg-[#27272a] border border-[#3f3f46] p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-[#8b5cf6]">{c.authorName || 'User'}</span>
                    <span className="text-[11px] text-[#52525b]">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
            {ticket.status !== 'Closed' && (
              <form onSubmit={handleComment} className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/15 placeholder-[#52525b]"
                />
                <button type="submit" disabled={commentLoading || !comment.trim()}
                  className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-[13px] rounded-lg transition-colors font-medium">
                  {commentLoading ? '...' : 'Post'}
                </button>
              </form>
            )}
          </div>

          {/* Attachments */}
          {(ticket.attachments?.length > 0 || ticket.status !== 'Closed') && (
            <div className="bg-[#18181b] border border-[#27272a] border-t-[3px] rounded-xl p-5" style={{ borderTopColor: '#06b6d4' }}>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#06b6d4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                Attachments
                <span className="text-[12px] text-[#52525b] font-normal">({ticket.attachments?.length || 0})</span>
              </h2>
              {ticket.attachments?.length > 0 && (
                <div className="space-y-2 mb-4">
                  {ticket.attachments.map((att) => (
                    <div key={att._id} className="flex items-center gap-3 p-3 rounded-lg bg-[#27272a] border border-[#3f3f46]">
                      <svg className="w-8 h-8 text-[#52525b] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        {att.mimetype?.startsWith('image') ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3.75h18A2.25 2.25 0 0123.25 6v12A2.25 2.25 0 0121 20.25H3A2.25 2.25 0 01.75 18V6A2.25 2.25 0 013 3.75z"/>
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        )}
                      </svg>
                      <div className="flex-1 min-w-0">
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="text-[13px] text-[#3b82f6] hover:underline truncate block">
                          {att.filename || 'Attachment'}
                        </a>
                        <p className="text-[11px] text-[#52525b]">
                          {att.uploaderName} · {att.size ? `${Math.round(att.size / 1024)} KB` : ''}
                        </p>
                      </div>
                      {(isAdmin || true) && (
                        <button onClick={() => handleDeleteAttachment(att._id)}
                          className="text-[#3f3f46] hover:text-[#ef4444] transition-colors flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {ticket.status !== 'Closed' && (
                <>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip" className="hidden" onChange={handleFileUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles}
                    className="flex items-center gap-2 px-4 py-2 w-full justify-center rounded-lg border border-dashed border-[#3f3f46] text-[13px] text-[#71717a] hover:text-[#fafafa] hover:border-[#06b6d4]/50 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    {uploadingFiles ? 'Uploading…' : 'Upload Screenshot or File'}
                  </button>
                  <p className="text-[10px] text-[#52525b] text-center mt-1.5">Max 8 MB per file · Images, PDF, Office docs, ZIP</p>
                </>
              )}
            </div>
          )}

          {/* Activity timeline */}
          {ticket.history?.length > 0 && (
            <div className="bg-[#18181b] border border-[#27272a] border-t-[3px] rounded-xl p-5" style={{ borderTopColor: '#06b6d4' }}>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#06b6d4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Activity
              </h2>
              <ol className="relative border-l-2 border-[#27272a] ml-2 space-y-4">
                {[...ticket.history].reverse().map((h, i) => (
                  <li key={i} className="ml-5">
                    <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-[#06b6d4]/40 border-2 border-[#06b6d4]" />
                    <p className="text-[13px] text-[#fafafa]">{h.action}</p>
                    <p className="text-[11px] text-[#52525b] mt-0.5">
                      {h.byName || 'System'} · {new Date(h.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">

          {/* Admin controls */}
          {isAdmin && (
            <div className="bg-[#18181b] border border-[#27272a] border-t-[3px] rounded-xl p-5" style={{ borderTopColor: '#f59e0b' }}>
              <h2 className="text-[13px] font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Admin Controls
              </h2>

              <p className="text-[11px] uppercase font-semibold text-[#52525b] tracking-wider mb-2">Update Status</p>
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {STATUS_OPTIONS.map((s) => {
                  const sColor = STATUS_ACCENT[s] || '#a1a1aa';
                  return (
                    <button key={s} disabled={statusUpdating || ticket.status === s}
                      onClick={() => handleStatusChange(s)}
                      className="px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all border text-left"
                      style={ticket.status === s
                        ? { borderColor: `${sColor}50`, backgroundColor: `${sColor}18`, color: sColor }
                        : { borderColor: '#27272a', color: '#a1a1aa', backgroundColor: 'transparent' }}>
                      <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ backgroundColor: ticket.status === s ? sColor : '#3f3f46' }} />
                      {s}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] uppercase font-semibold text-[#52525b] tracking-wider mb-2">Assign to Agent</p>
              <form onSubmit={handleAssign} className="flex flex-col gap-2 mb-4">
                {agents.length > 0 ? (
                  <select
                    value={assignValue}
                    onChange={(e) => setAssignValue(e.target.value)}
                    className="w-full bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2 focus:outline-none focus:border-[#f59e0b]"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a._id} value={a.name}>{a.name} ({a.email})</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={assignValue} onChange={(e) => setAssignValue(e.target.value)}
                    placeholder="Agent name or email…"
                    className="w-full bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-2 focus:outline-none focus:border-[#f59e0b] placeholder-[#52525b]" />
                )}
                <button type="submit" disabled={assigning}
                  className="w-full px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-[#09090b] text-[13px] rounded-lg transition-colors font-semibold">
                  {assigning ? 'Assigning…' : 'Assign'}
                </button>
              </form>

              <div className="pt-3 border-t border-[#27272a]">
                <button onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/25 text-[#ef4444] text-[13px] rounded-lg transition-colors font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  Delete Ticket
                </button>
              </div>
            </div>
          )}

          {/* Meta info card */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-[#fafafa] mb-3">Ticket Info</h2>
            <div className="space-y-3">
              {[
                { label: 'Category',   value: ticket.category },
                { label: 'Sub-type',   value: ticket.subType || '–' },
                { label: 'Priority',   value: ticket.priority, color: priorityColor },
                { label: 'Status',     value: ticket.status,   color: statusColor },
                { label: 'Raised by',  value: ticket.createdBy?.name || ticket.createdBy?.email || 'Unknown' },
                { label: 'Created',    value: new Date(ticket.createdAt).toLocaleDateString() },
                ...(ticket.resolvedAt ? [{ label: 'Resolved', value: new Date(ticket.resolvedAt).toLocaleDateString() }] : []),
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase font-semibold tracking-wider text-[#52525b]">{label}</span>
                  <span className="text-[12px] font-medium" style={{ color: color || '#a1a1aa' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CSAT widget */}
          {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
            ticket.satisfaction?.rating ? (
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                <h2 className="text-[13px] font-semibold text-[#fafafa] mb-3">Your Rating</h2>
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map(n => (
                    <svg key={n} className="w-5 h-5" viewBox="0 0 20 20" fill={n <= ticket.satisfaction.rating ? '#f59e0b' : '#27272a'}>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                  <span className="text-[12px] text-[#a1a1aa] ml-1">{ticket.satisfaction.rating}/5</span>
                </div>
                {ticket.satisfaction.feedback && <p className="text-[12px] text-[#71717a] italic">“{ticket.satisfaction.feedback}”</p>}
              </div>
            ) : (
              <div className="bg-[#18181b] border border-[#27272a] border-t-[3px] rounded-xl p-5" style={{ borderTopColor: '#f59e0b' }}>
                <h2 className="text-[13px] font-semibold text-[#fafafa] mb-1">How did we do?</h2>
                <p className="text-[12px] text-[#71717a] mb-3">Rate your support experience</p>
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setCsatRating(n)}
                      className="focus:outline-none transition-transform hover:scale-110">
                      <svg className="w-7 h-7" viewBox="0 0 20 20" fill={n <= csatRating ? '#f59e0b' : '#3f3f46'}>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    </button>
                  ))}
                </div>
                {csatRating > 0 && (
                  <form onSubmit={handleCsatSubmit}>
                    <textarea
                      value={csatFeedback}
                      onChange={e => setCsatFeedback(e.target.value)}
                      placeholder="Optional feedback…"
                      rows={2}
                      className="w-full bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[12px] rounded-lg px-3 py-2 focus:outline-none focus:border-[#f59e0b] placeholder-[#52525b] resize-none mb-2"
                    />
                    <button type="submit" disabled={csatSubmitting}
                      className="w-full py-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-[#09090b] text-[13px] rounded-lg font-semibold transition-colors">
                      {csatSubmitting ? 'Submitting…' : 'Submit Rating'}
                    </button>
                  </form>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
