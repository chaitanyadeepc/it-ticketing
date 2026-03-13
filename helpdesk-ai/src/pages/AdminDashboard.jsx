import React, { useState, useEffect } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import api from '../api/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, statsRes] = await Promise.all([
        api.get('/tickets'),
        api.get('/tickets/stats'),
      ]);
      setTickets(ticketsRes.data.tickets);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const recentTickets = tickets.slice(0, 10);

  const getStatusDotColor = (status) => ({
    'Open': 'bg-[#22c55e]',
    'In Progress': 'bg-[#f59e0b]',
    'Resolved': 'bg-[#3b82f6]',
    'Closed': 'bg-gray-500',
  }[status] || 'bg-gray-500');

  const getPriorityVariant = (priority) => priority?.toLowerCase() || 'medium';

  if (loading) return (
    <PageWrapper>
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-6 h-6 text-[#3b82f6] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <span className="ml-3 text-[#a1a1aa] text-[14px]">Loading dashboard…</span>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumb />
        <div className="mt-6 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-[#fafafa] mb-2">Admin Dashboard</h1>
            <p className="text-[14px] text-[#a1a1aa]">Overview of all support tickets</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl text-[#ef4444] text-[13px]">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard value={stats.total} label="Total Tickets" subtitle="All time" trend="up" delay={0} />
          <StatCard value={stats.open} label="Open Tickets" subtitle="Needs attention" trend="down" delay={0.1} />
          <StatCard value={stats.inProgress} label="In Progress" subtitle="Being handled" delay={0.2} />
          <StatCard value={`${stats.resolved}`} label="Resolved" subtitle="All time" trend="up" delay={0.3} />
        </div>

        <Card className="p-6">
          <h2 className="text-[16px] font-medium text-[#fafafa] mb-6">Recent Tickets</h2>
          {recentTickets.length === 0 ? (
            <div className="text-center py-12 text-[#52525b] text-[13px]">No tickets yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[12px] text-[#52525b] border-b border-[#27272a]">
                    <th className="pb-3 font-medium">Ticket ID</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Submitted by</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((ticket) => (
                    <tr key={ticket._id} className="border-b border-[#27272a] hover:bg-[#27272a] transition-colors">
                      <td className="py-4 font-['JetBrains_Mono'] text-[12px] text-[#3b82f6]">
                        {ticket.ticketId || ticket._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-4 text-[#fafafa] text-[14px] max-w-xs truncate">{ticket.title}</td>
                      <td className="py-4">
                        <Badge variant={getPriorityVariant(ticket.priority)}>{ticket.priority}</Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getStatusDotColor(ticket.status)} animate-blink`} />
                          <span className="text-[13px] text-[#a1a1aa]">{ticket.status}</span>
                        </div>
                      </td>
                      <td className="py-4 text-[#a1a1aa] text-[13px]">
                        {ticket.createdBy?.name || ticket.createdBy?.email || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
};

export default AdminDashboard;
