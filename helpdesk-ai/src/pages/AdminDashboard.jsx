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

const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Critical'];
const CATEGORIES = ['All', 'Hardware', 'Software', 'Network', 'Access', 'Email', 'Printer', 'VPN', 'Other'];
const TABLE_PAGE_SIZE = 10;

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
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [tablePage, setTablePage] = useState(1);

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
  useEffect(() => { setTablePage(1); }, [search, filterStatus, filterPriority, filterCategory]);

  const filteredTableTickets = tickets
    .filter((t) => filterStatus === 'All' || t.status === filterStatus)
    .filter((t) => filterPriority === 'All' || t.priority === filterPriority)
    .filter((t) => filterCategory === 'All' || t.category === filterCategory)
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.ticketId || '').toLowerCase().includes(q);
    });

  const tablePageCount = Math.max(1, Math.ceil(filteredTableTickets.length / TABLE_PAGE_SIZE));
  const recentTickets = filteredTableTickets.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);
  const hasTableFilters = search !== '' || filterStatus !== 'All' || filterPriority !== 'All' || filterCategory !== 'All';

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
      <div className="w-full max-w-screen-2xl mx-auto px-6 xl:px-10 py-5">
        <Breadcrumb />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-5 rounded-2xl bg-gradient-to-r from-[#f59e0b]/8 via-[#ef4444]/4 to-transparent border border-[#f59e0b]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">Admin Dashboard</h1>
            <p className="text-[13px] text-[#a1a1aa]">Overview of all support tickets</p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Total Tickets', value: stats.total,      color: '#3b82f6', sub: 'All time',        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { label: 'Open',         value: stats.open,       color: '#22c55e', sub: 'Needs attention', icon: 'M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'In Progress',  value: stats.inProgress, color: '#f59e0b', sub: 'Being handled',   icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Resolved',     value: stats.resolved,   color: '#06b6d4', sub: 'Completed',       icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          ].map(({ label, value, color, sub, icon }) => (
            <div key={label} className="rounded-xl border p-5 relative overflow-hidden" style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}0d 0%, transparent 65%)` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
                  <svg className="w-4.5 h-4.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}15` }}>{sub}</span>
              </div>
              <div className="text-[34px] font-bold leading-none mb-1 text-[#fafafa]">{value}</div>
              <div className="text-[13px] text-[#a1a1aa]">{label}</div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-20" style={{ backgroundColor: color }} />
            </div>
          ))}
        </div>

        {/* Charts row */}
        {tickets.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-4 mb-5">
            {/* Status pie */}
            <Card className="p-5 border-t-[3px]" style={{ borderTopColor: '#3b82f6' }}>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4">Status Breakdown</h2>
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
            <Card className="p-5 border-t-[3px]" style={{ borderTopColor: '#6366f1' }}>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4">Tickets by Category</h2>
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
            <Card className="p-5 border-t-[3px]" style={{ borderTopColor: '#f59e0b' }}>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4">Tickets by Priority</h2>
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

        {/* Tickets table */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-[16px] font-medium text-[#fafafa]">All Tickets</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/>
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[13px] rounded-lg pl-8 pr-3 py-1.5 w-40 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b]"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-[13px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6]"
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-[13px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6]"
              >
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-[13px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6]"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              {hasTableFilters && (
                <button
                  onClick={() => { setSearch(''); setFilterStatus('All'); setFilterPriority('All'); setFilterCategory('All'); }}
                  className="text-[12px] text-[#a1a1aa] hover:text-[#fafafa] underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {recentTickets.length === 0 ? (
            <div className="text-center py-12 text-[#52525b] text-[13px]">
              {hasTableFilters ? 'No tickets match your filters.' : 'No tickets yet'}
            </div>
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
          {tablePageCount > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#27272a]">
              <p className="text-[13px] text-[#52525b]">
                Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filteredTableTickets.length)} of {filteredTableTickets.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                  className="px-3 py-1.5 rounded-lg text-[13px] bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: tablePageCount }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setTablePage(pg)}
                    className={`w-8 h-8 rounded-lg text-[13px] border transition-colors ${
                      pg === tablePage
                        ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                        : 'bg-[#27272a] border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa]'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  onClick={() => setTablePage((p) => Math.min(tablePageCount, p + 1))}
                  disabled={tablePage === tablePageCount}
                  className="px-3 py-1.5 rounded-lg text-[13px] bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
};

export default AdminDashboard;

