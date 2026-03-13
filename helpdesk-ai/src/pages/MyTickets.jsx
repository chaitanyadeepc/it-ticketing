import React, { useState, useEffect } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import TicketCard from '../components/TicketCard';
import TicketModal from '../components/TicketModal';
import api from '../api/api';

const MyTickets = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
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

  const filteredTickets = activeTab === 'all'
    ? tickets
    : tickets.filter((t) => t.status === activeTab);

  // Normalise ticket shape for TicketCard (which expects id, not _id / ticketId)
  const normalise = (t) => ({
    ...t,
    id: t.ticketId || t._id,
    assignedTo: t.assignedTo || 'Unassigned',
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
  });

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumb />
        <div className="mt-6 mb-8">
          <h1 className="text-[24px] font-semibold text-[#fafafa] mb-2">My Tickets</h1>
          <p className="text-[14px] text-[#a1a1aa]">Track and manage your support requests</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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
        ) : filteredTickets.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket._id} ticket={normalise(ticket)} onClick={() => setSelectedTicket(normalise(ticket))} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#3f3f46]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <h3 className="text-[15px] font-medium text-[#fafafa] mb-1">No tickets found</h3>
            <p className="text-[13px] text-[#a1a1aa]">No tickets match the selected filter.</p>
          </div>
        )}

        {selectedTicket && (
          <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
        )}
      </div>
    </PageWrapper>
  );
};

export default MyTickets;
