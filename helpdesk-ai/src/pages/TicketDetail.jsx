import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';

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

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assignValue, setAssignValue] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    api.get(`/tickets/${id}`)
      .then(({ data }) => {
        setTicket(data.ticket);
        setAssignValue(data.ticket.assignedTo || '');
        setLoading(false);
      })
      .catch(() => { setError('Failed to load ticket.'); setLoading(false); });
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const { data } = await api.patch(`/tickets/${id}`, { status: newStatus });
      setTicket(data.ticket);
    } catch {
      alert('Failed to update status');
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
    } catch {
      alert('Failed to assign ticket');
    } finally {
      setAssigning(false);
    }
  };

  const handleReopen = async () => {
    try {
      const { data } = await api.patch(`/tickets/${id}`, { status: 'Open' });
      setTicket(data.ticket);
    } catch {
      alert('Failed to reopen ticket');
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
    } catch {
      alert('Failed to add comment');
    } finally {
      setCommentLoading(false);
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="rounded-xl border border-zinc-800 p-6 mb-4" style={{ backgroundColor: 'var(--card)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">{ticket.ticketId}</p>
            <h1 className="text-xl font-semibold">{ticket.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLOR[ticket.priority] || 'bg-zinc-700 text-zinc-300'}`}>
              {ticket.priority}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[ticket.status] || 'bg-zinc-700 text-zinc-300'}`}>
              {ticket.status}
            </span>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed mb-4">{ticket.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-zinc-500 block text-xs mb-0.5">Category</span>
            <span>{ticket.category}{ticket.subType ? ` / ${ticket.subType}` : ''}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-xs mb-0.5">Raised by</span>
            <span>{ticket.createdBy?.name || ticket.createdBy?.email || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-xs mb-0.5">Created</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
          {ticket.assignedTo && (
            <div>
              <span className="text-zinc-500 block text-xs mb-0.5">Assigned to</span>
              <span>{ticket.assignedTo}</span>
            </div>
          )}
          {ticket.resolvedAt && (
            <div>
              <span className="text-zinc-500 block text-xs mb-0.5">Resolved</span>
              <span>{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Admin: Status Update + Assign */}
      {isAdmin && (
        <div className="rounded-xl border border-zinc-800 p-5 mb-4" style={{ backgroundColor: 'var(--card)' }}>
          <h2 className="text-sm font-semibold mb-3 text-zinc-300">Update Status</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                disabled={statusUpdating || ticket.status === s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                  ${ticket.status === s
                    ? 'border-violet-500 bg-violet-500/20 text-violet-300 cursor-default'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>

          <h2 className="text-sm font-semibold mb-3 text-zinc-300">Assign to Agent</h2>
          <form onSubmit={handleAssign} className="flex gap-2">
            <input
              type="text"
              value={assignValue}
              onChange={(e) => setAssignValue(e.target.value)}
              placeholder="Agent name or email…"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={assigning}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors font-medium"
            >
              {assigning ? '…' : 'Assign'}
            </button>
          </form>
        </div>
      )}

      {/* User: Reopen resolved ticket */}
      {!isAdmin && ticket.status === 'Resolved' && (
        <div className="rounded-xl border border-zinc-800 p-5 mb-4 flex items-center justify-between" style={{ backgroundColor: 'var(--card)' }}>
          <div>
            <p className="text-sm font-medium text-zinc-300">Is your issue still not resolved?</p>
            <p className="text-xs text-zinc-500 mt-0.5">Reopening will move this ticket back to Open.</p>
          </div>
          <button
            onClick={handleReopen}
            className="ml-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors font-medium whitespace-nowrap"
          >
            Reopen Ticket
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="rounded-xl border border-zinc-800 p-5" style={{ backgroundColor: 'var(--card)' }}>
        <h2 className="text-sm font-semibold mb-4 text-zinc-300">
          Comments ({ticket.comments?.length || 0})
        </h2>

        {ticket.comments?.length === 0 && (
          <p className="text-sm text-zinc-500 mb-4">No comments yet.</p>
        )}

        <div className="space-y-3 mb-4">
          {ticket.comments?.map((c, i) => (
            <div key={i} className="rounded-lg bg-zinc-800/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-violet-400">{c.authorName || 'User'}</span>
                <span className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-zinc-300">{c.text}</p>
            </div>
          ))}
        </div>

        {/* Add comment form */}
        {ticket.status !== 'Closed' && (
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={commentLoading || !comment.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors font-medium"
            >
              {commentLoading ? '...' : 'Post'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
