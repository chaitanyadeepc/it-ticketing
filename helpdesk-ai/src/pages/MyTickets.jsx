import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import TicketCard from '../components/TicketCard';
import api from '../api/api';

const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Critical'];
const CATEGORIES = ['All', 'Hardware', 'Software', 'Network', 'Access', 'Email', 'Printer', 'VPN', 'Other'];

const MyTickets = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [priority, setPriority] = useState('All');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get('/tickets');
      setTickets(data.tickets);
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || 'Failed to load tickets');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);
  useEffect(() => { const timer = setInterval(() => fetchTickets(true), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { setPage(1); }, [activeTab, priority, category, search]);

  const counts = {
    open: tickets.filter((t) => t.status === 'Open').length,
    inProgress: tickets.filter((t) => t.status === 'In Progress').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
    closed: tickets.filter((t) => t.status === 'Closed').length,
  };

  const tabs = [
    { id: 'all', label: 'All Tickets', count: tickets.length },
    { id: 'Open', label: 'Open', count: counts.open },
    { id: 'In Progress', label: 'In Progress', count: counts.inProgress },
    { id: 'Resolved', label: 'Resolved', count: counts.resolved },
    { id: 'Closed', label: 'Closed', count: counts.closed },
  ];

  const filteredTickets = tickets
    .filter((t) => activeTab === 'all' || t.status === activeTab)
    .filter((t) => priority === 'All' || t.priority === priority)
    .filter((t) => category === 'All' || t.category === category)
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.ticketId || '').toLowerCase().includes(q);
    });

  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
  const paginatedTickets = filteredTickets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const hasActiveFilters = priority !== 'All' || category !== 'All' || search !== '';

  // Normalise ticket shape for TicketCard (which expects id, not _id / ticketId)
  const normalise = (t) => ({
    ...t,
    id: t.ticketId || t._id,
    assignedTo: t.assignedTo || 'Unassigned',
  });

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 mb-5 rounded-2xl bg-gradient-to-r from-[#6366f1]/8 via-[#3b82f6]/4 to-transparent border border-[#6366f1]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">My Tickets</h1>
            <p className="text-[13px] text-[#a1a1aa]">Track and manage your support requests</p>
          {lastUpdated && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#52525b] mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-blink" />
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          </div>
          <div className="flex gap-3">
            {[
              { label: 'Open', value: counts.open, color: '#22c55e' },
              { label: 'In Progress', value: counts.inProgress, color: '#f59e0b' },
              { label: 'Resolved', value: counts.resolved, color: '#06b6d4' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-4 py-2 rounded-xl border" style={{ borderColor: `${color}30`, background: `${color}0d` }}>
                <div className="text-[20px] font-bold leading-none" style={{ color }}>{value}</div>
                <div className="text-[11px] text-[#a1a1aa] mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const TAB_COLOR = { all: '#a1a1aa', Open: '#22c55e', 'In Progress': '#f59e0b', Resolved: '#06b6d4', Closed: '#71717a' };
            const col = TAB_COLOR[tab.id] || '#a1a1aa';
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium whitespace-nowrap transition-all duration-200 border ${
                  isActive ? 'text-[#fafafa] border-transparent' : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]'
                }`}
                style={isActive ? { backgroundColor: col, borderColor: col } : {}}
              >
                {tab.id !== 'all' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : col }} />}
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-['JetBrains_Mono'] ${
                  isActive ? 'bg-black/20 text-white' : 'bg-[#27272a] text-[#a1a1aa]'
                }`}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 items-center">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or ID…"
              className="w-full bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6]"
            >
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6]"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { setPriority('All'); setCategory('All'); setSearch(''); }}
                className="text-[12px] text-[#a1a1aa] hover:text-[#fafafa] underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 space-y-3" style={{ borderLeft: '3px solid #27272a' }}>
                <div className="skeleton h-3 w-20 rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="flex gap-2">
                  <div className="skeleton h-6 w-20 rounded-full" />
                  <div className="skeleton h-6 w-16 rounded-full" />
                </div>
                <div className="skeleton h-7 w-full rounded-lg" />
                <div className="flex justify-between pt-2 border-t border-[#27272a]">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl text-[#ef4444] text-[14px]">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
            <button onClick={fetchTickets} className="ml-auto underline text-[#ef4444]/70 hover:text-[#ef4444]">Retry</button>
          </div>
        ) : paginatedTickets.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTickets.map((ticket) => (
                <TicketCard key={ticket._id} ticket={normalise(ticket)} onClick={() => navigate(`/tickets/${ticket._id}`)} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 gap-2">
                <p className="text-[13px] text-[#52525b]">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredTickets.length)} of {filteredTickets.length}
                </p>
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-[13px] bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-8 h-8 rounded-lg text-[13px] border transition-colors flex-shrink-0 ${
                        pg === page
                          ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                          : 'bg-[#27272a] border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa]'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-[13px] bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#3f3f46]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <h3 className="text-[15px] font-medium text-[#fafafa] mb-1">No tickets found</h3>
            <p className="text-[13px] text-[#a1a1aa]">No tickets match the selected filter.</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default MyTickets;
