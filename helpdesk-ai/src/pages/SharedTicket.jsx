import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

const STATUS_COLOR = {
  Open:        '#3b82f6',
  'In Progress': '#f59e0b',
  Resolved:    '#22c55e',
  Closed:      '#71717a',
};
const PRIORITY_COLOR = {
  Low: '#22c55e', Medium: '#3b82f6', High: '#f97316', Critical: '#ef4444',
};

export default function SharedTicket() {
  const { token } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/tickets/share/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setTicket(data.ticket);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090b' }}>
        <div className="w-6 h-6 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#09090b' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <h1 className="text-[20px] font-bold text-[#fafafa] mb-2">Link Invalid or Expired</h1>
          <p className="text-[13px] text-[#71717a] mb-6">{error}</p>
          <Link to="/status" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl text-[13px] font-medium transition-colors">
            Check ticket by ID instead
          </Link>
        </div>
      </div>
    );
  }

  const statusColor  = STATUS_COLOR[ticket.status]   || '#71717a';
  const priorityColor = PRIORITY_COLOR[ticket.priority] || '#3b82f6';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090b' }}>
      {/* Minimal header */}
      <div className="bg-[#18181b] border-b border-[#27272a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="text-[14px] font-semibold text-[#fafafa]">IT Help Desk</span>
        </div>
        <span className="text-[11px] text-[#52525b] bg-[#27272a] px-2.5 py-1 rounded-full">Read-only share view</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Ticket card */}
        <div
          className="rounded-2xl border p-6 mb-5 relative overflow-hidden"
          style={{ borderColor: `${priorityColor}30`, background: `linear-gradient(135deg, ${priorityColor}0d 0%, transparent 60%)` }}
        >
          <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: priorityColor }} />
          <p className="text-[12px] font-mono text-[#52525b] mb-1">{ticket.ticketId}</p>
          <h1 className="text-[22px] font-bold text-[#fafafa] mb-3">{ticket.title}</h1>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[12px] font-semibold px-3 py-1 rounded-full border" style={{ color: priorityColor, borderColor: `${priorityColor}40`, backgroundColor: `${priorityColor}15` }}>
              {ticket.priority}
            </span>
            <span className="text-[12px] font-semibold px-3 py-1 rounded-full border" style={{ color: statusColor, borderColor: `${statusColor}40`, backgroundColor: `${statusColor}15` }}>
              {ticket.status}
            </span>
            <span className="text-[12px] text-[#71717a] px-3 py-1 rounded-full border border-[#27272a] bg-[#27272a]">
              {ticket.category}
            </span>
          </div>

          {ticket.description && (
            <p className="text-[14px] text-[#a1a1aa] leading-relaxed mb-4">{ticket.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#27272a] text-[13px]">
            <div>
              <span className="text-[11px] uppercase font-semibold tracking-wider text-[#52525b] block mb-0.5">Created</span>
              <span className="text-[#a1a1aa]">{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold tracking-wider text-[#52525b] block mb-0.5">Last Updated</span>
              <span className="text-[#a1a1aa]">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
            </div>
            {ticket.resolvedAt && (
              <div>
                <span className="text-[11px] uppercase font-semibold tracking-wider text-[#52525b] block mb-0.5">Resolved</span>
                <span className="text-[#22c55e]">{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-center text-[#3f3f46]">
          This is a read-only shared view. Login to access full ticket details.
        </p>
      </div>
    </div>
  );
}
