import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import api from '../api/api';

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#6b7280'];

const exportCSV = (tickets) => {
  const header = ['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Submitted By', 'Created At'];
  const rows = tickets.map((t) => [
    t.ticketId || t._id,
    `"${t.title.replace(/"/g, '""')}"`,
    t.category,
    t.priority,
    t.status,
    t.createdBy?.name || t.createdBy?.email || 'Unknown',
    new Date(t.createdAt).toLocaleDateString(),
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const AdminDashboard = () => {
  const navigate = useNavigate();
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

  // Chart data
  const statusData = [
    { name: 'Open',        value: stats.open },
    { name: 'In Progress', value: stats.inProgress },
    { name: 'Resolved',    value: stats.resolved },
    { name: 'Closed',      value: stats.closed },
  ];

  const categoryCount = tickets.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const priorityCount = tickets.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});
  const priorityData = ['Low', 'Medium', 'High', 'Critical'].map((p) => ({
    name: p, count: priorityCount[p] || 0,
  }));

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
        <div className="mt-6 mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-semibold text-[#fafafa] mb-2">Admin Dashboard</h1>
            <p className="text-[14px] text-[#a1a1aa]">Overview of all support tickets</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Users
            </button>
            <button
              onClick={() => exportCSV(tickets)}
              disabled={tickets.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
            <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl text-[#ef4444] text-[13px]">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard value={stats.total}     label="Total Tickets"  subtitle="All time"        trend="up"  delay={0}   />
          <StatCard value={stats.open}      label="Open Tickets"   subtitle="Needs attention"  trend="down" delay={0.1} />
          <StatCard value={stats.inProgress} label="In Progress"   subtitle="Being handled"               delay={0.2} />
          <StatCard value={stats.resolved}  label="Resolved"       subtitle="All time"         trend="up"  delay={0.3} />
        </div>

        {/* Charts row */}
        {tickets.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-4 mb-8">
            {/* Status pie */}
            <Card className="p-5">
              <h2 className="text-[14px] font-medium text-[#fafafa] mb-4">Status Breakdown</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Category bar */}
            <Card className="p-5">
              <h2 className="text-[14px] font-medium text-[#fafafa] mb-4">Tickets by Category</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Priority bar */}
            <Card className="p-5">
              <h2 className="text-[14px] font-medium text-[#fafafa] mb-4">Tickets by Priority</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityData} margin={{ left: 0, right: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priorityData.map((_, i) => (
                      <Cell key={i} fill={['#3b82f6','#f59e0b','#f97316','#ef4444'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Recent tickets table */}
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
                    <tr
                      key={ticket._id}
                      onClick={() => navigate(`/tickets/${ticket._id}`)}
                      className="border-b border-[#27272a] hover:bg-[#27272a] transition-colors cursor-pointer"
                    >
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

