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

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/tickets');
      setTickets(data.tickets);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);
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
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
  });

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumb />
        <div className="mb-5">
          <h1 className="text-[22px] font-semibold text-[#fafafa] mb-1">My Tickets</h1>
          <p className="text-[13px] text-[#a1a1aa]">Track and manage your support requests</p>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-[7px] text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
                activeTab === tab.id ? 'bg-[#3b82f6] text-[#fafafa]' : 'bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-['JetBrains_Mono'] ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#18181b] text-[#a1a1aa]'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
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
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-[#a1a1aa] whitespace-nowrap">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3b82f6]"
            >
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-[#a1a1aa] whitespace-nowrap">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[13px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3b82f6]"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setPriority('All'); setCategory('All'); setSearch(''); }}
              className="text-[12px] text-[#a1a1aa] hover:text-[#fafafa] underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="w-6 h-6 text-[#3b82f6] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <span className="ml-3 text-[#a1a1aa] text-[14px]">Loading tickets…</span>
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
              <div className="flex items-center justify-between mt-8">
                <p className="text-[13px] text-[#52525b]">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredTickets.length)} of {filteredTickets.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-[13px] bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-8 h-8 rounded-lg text-[13px] border transition-colors ${
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
                    className="px-3 py-1.5 rounded-lg text-[13px] bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
