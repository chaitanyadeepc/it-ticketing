import React, { useState } from 'react';
import api from '../api/api';

const STATUS_COLOR = {
  Open:          { bg: 'bg-[#22c55e]/15 border-[#22c55e]/30', text: 'text-[#22c55e]' },
  'In Progress': { bg: 'bg-[#f59e0b]/15 border-[#f59e0b]/30', text: 'text-[#f59e0b]' },
  Resolved:      { bg: 'bg-[#06b6d4]/15 border-[#06b6d4]/30', text: 'text-[#06b6d4]' },
  Closed:        { bg: 'bg-zinc-700/30 border-zinc-600/30',    text: 'text-zinc-400' },
};

const PRIORITY_COLOR = {
  Low:      'text-[#3b82f6]',
  Medium:   'text-[#f59e0b]',
  High:     'text-[#f97316]',
  Critical: 'text-[#ef4444]',
};

export default function TicketStatus() {
  const [ticketId, setTicketId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    setLoading(true);
    setError('');
    setTicket(null);
    try {
      const { data } = await api.get(`/tickets/public/${ticketId.trim().toUpperCase()}`);
      setTicket(data.ticket);
    } catch (err) {
      setError(err.response?.status === 404
        ? `No ticket found with ID "${ticketId.trim().toUpperCase()}".`
        : 'Unable to look up ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sc = ticket ? (STATUS_COLOR[ticket.status] || STATUS_COLOR.Open) : null;
  const pc = ticket ? (PRIORITY_COLOR[ticket.priority] || 'text-[#a1a1aa]') : null;

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-start px-4 py-16">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-8 h-8 rounded-lg bg-[#FF634A] flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
          </svg>
        </div>
        <span className="text-[18px] font-bold text-[#fafafa] tracking-tight">HiTicket</span>
      </div>

      <div className="w-full max-w-lg">
        <h1 className="text-[28px] font-bold text-[#fafafa] mb-2 text-center">Check Ticket Status</h1>
        <p className="text-[14px] text-[#71717a] text-center mb-8">
          Enter your ticket ID to check the current status of your support request.
        </p>

        {/* Lookup form */}
        <form onSubmit={handleLookup} className="flex gap-2 mb-6">
          <input
            value={ticketId}
            onChange={e => setTicketId(e.target.value.toUpperCase())}
            placeholder="e.g. TKT-00042"
            className="flex-1 bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[14px] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF634A] focus:ring-2 focus:ring-[#FF634A]/15 placeholder-[#52525b] font-mono tracking-wide"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !ticketId.trim()}
            className="px-5 py-3 bg-[#FF634A] hover:bg-[#e85a42] disabled:opacity-50 text-white text-[14px] font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : 'Look up'}
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-[#ef4444]/10 border border-[#ef4444]/25 rounded-xl text-[#ef4444] text-[13px]">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {error}
          </div>
        )}

        {/* Ticket result card */}
        {ticket && (
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono text-[#52525b] mb-1">{ticket.ticketId}</p>
                <h2 className="text-[17px] font-semibold text-[#fafafa] leading-snug">{ticket.title}</h2>
              </div>
              <span className={`shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border ${sc.bg} ${sc.text}`}>
                {ticket.status}
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[#27272a] pt-4">
              {[
                { label: 'Priority',  value: ticket.priority, cls: pc },
                { label: 'Category',  value: ticket.category },
                { label: 'Submitted', value: new Date(ticket.createdAt).toLocaleDateString([], { dateStyle: 'medium' }) },
                { label: 'Updated',   value: new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString([], { dateStyle: 'medium' }) },
                ...(ticket.resolvedAt ? [{ label: 'Resolved', value: new Date(ticket.resolvedAt).toLocaleDateString([], { dateStyle: 'medium' }) }] : []),
              ].map(({ label, value, cls }) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-[#52525b] mb-0.5">{label}</p>
                  <p className={`text-[13px] font-medium ${cls || 'text-[#a1a1aa]'}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Status description */}
            <div className={`rounded-xl border px-4 py-3 text-[13px] ${sc.bg} ${sc.text}`}>
              {{
                Open:          '🟢 Your ticket has been received and is in the queue.',
                'In Progress': '🔄 Our team is actively working on your issue.',
                Resolved:      '✅ Your ticket has been resolved. Please reopen if the issue persists.',
                Closed:        '🔒 This ticket is closed.',
              }[ticket.status] || 'Status updated.'}
            </div>
          </div>
        )}

        {/* Sign-in link */}
        <p className="text-center text-[12px] text-[#52525b] mt-8">
          Have an account?{' '}
          <a href="/login" className="text-[#FF634A] hover:underline font-medium">Sign in</a>
          {' '}to view all your tickets.
        </p>
      </div>
    </div>
  );
}
