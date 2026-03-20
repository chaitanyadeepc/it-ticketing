import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkReassignAgent, setBulkReassignAgent] = useState('');
  const [agents, setAgents] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [chartRange, setChartRange] = useState(30); // days — 7 | 30 | 90 | 0=all
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'sla' | 'aging'
  const [savedFilters, setSavedFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hd_savedFilters') || '[]'); } catch { return []; }
  });

  const saveCurrentFilter = () => {
    const name = window.prompt('Name for this filter preset:');
    if (!name?.trim()) return;
    const preset = { name: name.trim(), status: filterStatus, priority: filterPriority, category: filterCategory, savedAt: Date.now() };
    const updated = [...savedFilters, preset];
    setSavedFilters(updated);
    localStorage.setItem('hd_savedFilters', JSON.stringify(updated));
  };

  const removeSavedFilter = (idx) => {
    const updated = savedFilters.filter((_, i) => i !== idx);
    setSavedFilters(updated);
    localStorage.setItem('hd_savedFilters', JSON.stringify(updated));
  };

  const applyFilter = (f) => {
    setFilterStatus(f.status);
    setFilterPriority(f.priority);
    setFilterCategory(f.category);
  };

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [ticketsRes, statsRes] = await Promise.all([
        api.get('/tickets'),
        api.get('/tickets/stats'),
      ]);
      setTickets(ticketsRes.data.tickets);
      setStats(statsRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { const timer = setInterval(() => fetchData(true), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { setTablePage(1); }, [search, filterStatus, filterPriority, filterCategory]);

  useEffect(() => {
    api.get('/users').then(r => {
      setAgents((r.data.users || []).filter(u => u.role === 'agent' && u.isActive !== false));
    }).catch(() => {});
  }, []);

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

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const allPageSelected = recentTickets.length > 0 && recentTickets.every(t => selectedIds.has(t._id));
  const toggleSelectAll = () => allPageSelected
    ? setSelectedIds(prev => { const s = new Set(prev); recentTickets.forEach(t => s.delete(t._id)); return s; })
    : setSelectedIds(prev => { const s = new Set(prev); recentTickets.forEach(t => s.add(t._id)); return s; });

  const handleBulkStatus = async (status) => {
    setBulkLoading(true);
    try {
      await api.patch('/tickets/bulk', { ids: [...selectedIds], status });
      setSelectedIds(new Set());
      await fetchData(true);
    } catch { /* ignore */ } finally { setBulkLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Permanently delete ${selectedIds.size} ticket(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await api.delete('/tickets/bulk', { data: { ids: [...selectedIds] } });
      setSelectedIds(new Set());
      await fetchData(true);
    } catch { /* ignore */ } finally { setBulkLoading(false); }
  };

  const handleBulkReassign = async () => {
    if (!bulkReassignAgent) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selectedIds].map(id => api.patch(`/tickets/${id}`, { assignedTo: bulkReassignAgent })));
      setSelectedIds(new Set());
      setBulkReassignAgent('');
      await fetchData(true);
    } catch { /* ignore */ } finally { setBulkLoading(false); }
  };

  const resolvedWithTime = tickets.filter(t => t.resolvedAt);
  const avgResMs = resolvedWithTime.length
    ? resolvedWithTime.reduce((s, t) => s + (new Date(t.resolvedAt) - new Date(t.createdAt)), 0) / resolvedWithTime.length
    : null;
  const fmtAvgRes = avgResMs == null ? '—' : (() => {
    const h = Math.floor(avgResMs / 3600000);
    return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`;
  })();

  // 30-day line chart data (respects chartRange)
  const thirtyDayData = (() => {
    const days = chartRange === 0 ? 90 : chartRange;
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), count: 0 });
    }
    const cutoff = chartRange === 0 ? null : Date.now() - chartRange * 86400000;
    tickets.forEach(t => {
      if (cutoff && new Date(t.createdAt) < cutoff) return;
      const day = new Date(t.createdAt).toISOString().slice(0, 10);
      const entry = arr.find(d => d.date === day);
      if (entry) entry.count++;
    });
    return arr;
  })();

  // SLA thresholds (hours)
  const SLA_HOURS = { Critical: 4, High: 8, Medium: 24, Low: 72 };

  // SLA breach report — open/in-progress tickets past their SLA
  const slaBreaches = tickets.filter(t => {
    if (t.status === 'Resolved' || t.status === 'Closed') return false;
    const threshold = SLA_HOURS[t.priority];
    if (!threshold) return false;
    const ageHours = (Date.now() - new Date(t.createdAt)) / 3600000;
    return ageHours > threshold;
  }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Ticket aging — open tickets grouped by age bucket
  const agingBuckets = { '< 1 day': 0, '1–3 days': 0, '3–7 days': 0, '> 7 days': 0 };
  tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').forEach(t => {
    const days = (Date.now() - new Date(t.createdAt)) / 86400000;
    if (days < 1) agingBuckets['< 1 day']++;
    else if (days < 3) agingBuckets['1–3 days']++;
    else if (days < 7) agingBuckets['3–7 days']++;
    else agingBuckets['> 7 days']++;
  });

  // Open tickets sorted by age (oldest first) for aging table
  const agingTickets = tickets
    .filter(t => t.status === 'Open' || t.status === 'In Progress')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 20);

  // Agent leaderboard — top agents by resolved tickets
  const agentLeaderboard = (() => {
    const map = {};
    tickets.forEach(t => {
      if ((t.status === 'Resolved' || t.status === 'Closed') && t.assignedTo && t.assignedTo !== 'Unassigned') {
        map[t.assignedTo] = (map[t.assignedTo] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  })();

  // KPI trend arrows — this week vs last week
  const now = Date.now();
  const thisWeekTickets  = tickets.filter(t => now - new Date(t.createdAt) < 7  * 86400000).length;
  const lastWeekTickets  = tickets.filter(t => { const age = now - new Date(t.createdAt); return age >= 7 * 86400000 && age < 14 * 86400000; }).length;
  const thisWeekResolved = tickets.filter(t => t.status === 'Resolved' && now - new Date(t.createdAt) <  7 * 86400000).length;
  const lastWeekResolved = tickets.filter(t => t.status === 'Resolved' && (() => { const age = now - new Date(t.createdAt); return age >= 7 * 86400000 && age < 14 * 86400000; })()).length;

  const getTrend = (curr, prev) => {
    if (prev === 0) return null;
    const pct = Math.round(((curr - prev) / prev) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
  };

  // Count-up hook
  const useCountUp = (target) => {
    const [val, setVal] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
      if (typeof target !== 'number') { setVal(target); return; }
      const duration = 800;
      const steps = 30;
      const inc = target / steps;
      let current = 0;
      let step = 0;
      ref.current = setInterval(() => {
        step++;
        current = Math.round(Math.min(inc * step, target));
        setVal(current);
        if (step >= steps) clearInterval(ref.current);
      }, duration / steps);
      return () => clearInterval(ref.current);
    }, [target]);
    return val;
  };

  const getStatusDotColor = (status) => ({
    'Open': 'bg-[#22c55e]',
    'In Progress': 'bg-[#f59e0b]',
    'Resolved': 'bg-[#3b82f6]',
    'Closed': 'bg-gray-500',
  }[status] || 'bg-gray-500');

  const getPriorityVariant = (priority) => priority?.toLowerCase() || 'medium';

  if (loading) return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        {/* Header skeleton */}
        <div className="skeleton h-6 w-48 rounded mb-2" />
        <div className="skeleton h-4 w-64 rounded mb-6" />
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 space-y-3">
              <div className="flex justify-between">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
              <div className="skeleton h-8 w-16 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid lg:grid-cols-3 gap-4 mb-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-5">
              <div className="skeleton h-4 w-32 rounded mb-4" />
              <div className="skeleton h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#f59e0b]/8 via-[#ef4444]/4 to-transparent border border-[#f59e0b]/15">
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-bold text-[#fafafa] mb-0.5">Admin Dashboard</h1>
            <p className="text-[13px] text-[#a1a1aa]">Overview of all support tickets</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span className="hidden xs:inline sm:inline">Users</span>
            </button>
            <button
              onClick={() => navigate('/admin/logs')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span className="hidden xs:inline sm:inline">Activity Log</span>
            </button>
            <button
              onClick={() => navigate('/admin/feedback')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              <span className="hidden xs:inline sm:inline">Survey Results</span>
            </button>
            <button
              onClick={() => exportCSV(tickets)}
              disabled={tickets.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span className="hidden xs:inline sm:inline">Export CSV</span>
            </button>
            <button onClick={() => fetchData(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[13px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span className="hidden xs:inline sm:inline">Refresh</span>
            </button>
            {lastUpdated && (
              <span className="flex items-center gap-1.5 text-[12px] text-[#52525b]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-blink" />
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-1 mb-5 bg-[#18181b] border border-[#27272a] rounded-xl p-1 w-fit">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'sla', label: `SLA Breaches${slaBreaches.length > 0 ? ` (${slaBreaches.length})` : ''}`, warn: slaBreaches.length > 0 },
            { key: 'aging', label: 'Ticket Aging' },
          ].map(({ key, label, warn }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                activeTab === key
                  ? 'bg-[#27272a] text-[#fafafa] shadow-sm'
                  : `text-[#71717a] hover:text-[#fafafa] ${warn ? 'text-[#ef4444]' : ''}`
              }`}>
              {warn && activeTab !== key && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ef4444] mr-1.5 mb-0.5" />}
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl text-[#ef4444] text-[13px]">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        {/* SLA Breach tab */}
        {activeTab === 'sla' && (
          <Card className="p-5 mb-5 border-t-[3px]" style={{ borderTopColor: '#ef4444' }}>
            <h2 className="text-[14px] font-semibold text-[#fafafa] mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              SLA Breach Report
              {slaBreaches.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] text-[11px] font-bold">{slaBreaches.length}</span>}
            </h2>
            <p className="text-[12px] text-[#52525b] mb-4">Open tickets that exceeded their SLA threshold — Critical ≤4h, High ≤8h, Medium ≤24h, Low ≤72h.</p>
            {slaBreaches.length === 0 ? (
              <div className="text-center py-10">
                <svg className="w-8 h-8 text-[#22c55e] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-[13px] text-[#52525b]">No SLA breaches — all tickets are within targets 🎉</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-[11px] text-[#52525b] uppercase tracking-wider border-b border-[#27272a]">
                      <th className="pb-2 text-left font-semibold">Ticket</th>
                      <th className="pb-2 text-left font-semibold">Title</th>
                      <th className="pb-2 text-center font-semibold">Priority</th>
                      <th className="pb-2 text-center font-semibold">SLA</th>
                      <th className="pb-2 text-center font-semibold">Age</th>
                      <th className="pb-2 text-center font-semibold">Overdue By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaBreaches.map(t => {
                      const slaH = SLA_HOURS[t.priority] || 24;
                      const ageH = (Date.now() - new Date(t.createdAt)) / 3600000;
                      const overdueH = ageH - slaH;
                      const fmtH = h => h < 48 ? `${Math.floor(h)}h` : `${Math.floor(h/24)}d`;
                      const PCOLOR = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
                      return (
                        <tr key={t._id} className="border-b border-[#27272a]/50 last:border-0 cursor-pointer hover:bg-[#27272a]/40"
                          onClick={() => navigate(`/tickets/${t._id}`)}>
                          <td className="py-2.5 font-mono text-[11px] text-[#3b82f6]">{t.ticketId}</td>
                          <td className="py-2.5 text-[#e4e4e7] max-w-[180px] truncate">{t.title}</td>
                          <td className="py-2.5 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: PCOLOR[t.priority], background: `${PCOLOR[t.priority]}18` }}>{t.priority}</span></td>
                          <td className="py-2.5 text-center text-[#a1a1aa]">{slaH}h</td>
                          <td className="py-2.5 text-center text-[#a1a1aa]">{fmtH(ageH)}</td>
                          <td className="py-2.5 text-center text-[#ef4444] font-semibold">+{fmtH(overdueH)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Aging tab */}
        {activeTab === 'aging' && (
          <div className="mb-5 space-y-4">
            {/* Bucket summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(agingBuckets).map(([label, count]) => {
                const color = label === '> 7 days' ? '#ef4444' : label === '3–7 days' ? '#f97316' : label === '1–3 days' ? '#f59e0b' : '#22c55e';
                return (
                  <div key={label} className="rounded-xl border p-4" style={{ borderColor: `${color}30`, background: `${color}0d` }}>
                    <div className="text-[26px] font-bold mb-0.5" style={{ color }}>{count}</div>
                    <div className="text-[11px] text-[#71717a]">{label}</div>
                  </div>
                );
              })}
            </div>
            <Card className="p-5 border-t-[3px]" style={{ borderTopColor: '#f59e0b' }}>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4">Open Tickets by Age (oldest first)</h2>
              {agingTickets.length === 0 ? (
                <p className="text-[13px] text-[#52525b] text-center py-8">No open tickets.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-[11px] text-[#52525b] uppercase tracking-wider border-b border-[#27272a]">
                        <th className="pb-2 text-left font-semibold">Ticket</th>
                        <th className="pb-2 text-left font-semibold">Title</th>
                        <th className="pb-2 text-center font-semibold">Status</th>
                        <th className="pb-2 text-center font-semibold">Priority</th>
                        <th className="pb-2 text-center font-semibold">Age</th>
                        <th className="pb-2 text-left font-semibold">Assigned To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingTickets.map(t => {
                        const days = (Date.now() - new Date(t.createdAt)) / 86400000;
                        const ageColor = days > 7 ? '#ef4444' : days > 3 ? '#f97316' : days > 1 ? '#f59e0b' : '#22c55e';
                        const PCOLOR = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
                        const fmtAge = d => d < 1 ? `${Math.floor(d*24)}h` : d < 2 ? '1 day' : `${Math.floor(d)} days`;
                        return (
                          <tr key={t._id} className="border-b border-[#27272a]/50 last:border-0 cursor-pointer hover:bg-[#27272a]/40"
                            onClick={() => navigate(`/tickets/${t._id}`)}>
                            <td className="py-2.5 font-mono text-[11px] text-[#3b82f6]">{t.ticketId}</td>
                            <td className="py-2.5 text-[#e4e4e7] max-w-[180px] truncate">{t.title}</td>
                            <td className="py-2.5 text-center text-[#a1a1aa]">{t.status}</td>
                            <td className="py-2.5 text-center"><span className="text-[10px] font-bold" style={{ color: PCOLOR[t.priority] }}>{t.priority}</span></td>
                            <td className="py-2.5 text-center font-semibold" style={{ color: ageColor }}>{fmtAge(days)}</td>
                            <td className="py-2.5 text-[#71717a]">{t.assignedTo || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Stat cards */}
        {activeTab === 'overview' && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          {[
            { label: 'Total Tickets', value: stats.total,      color: '#3b82f6', sub: 'All time',        trend: getTrend(thisWeekTickets, lastWeekTickets), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { label: 'Open',         value: stats.open,       color: '#22c55e', sub: 'Needs attention', trend: null, icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
            { label: 'In Progress',  value: stats.inProgress, color: '#f59e0b', sub: 'Being handled',   trend: null, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Resolved',     value: stats.resolved,   color: '#06b6d4', sub: 'Completed',       trend: getTrend(thisWeekResolved, lastWeekResolved), icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Avg Resolution', value: fmtAvgRes,      color: '#8b5cf6', sub: `${resolvedWithTime.length} resolved`, trend: null, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          ].map(({ label, value, color, sub, icon, trend }) => {
            const AnimatedValue = () => {
              const [displayed, setDisplayed] = React.useState(0);
              const timerRef = React.useRef(null);
              React.useEffect(() => {
                if (typeof value !== 'number') return;
                const steps = 30;
                const duration = 800;
                let step = 0;
                timerRef.current = setInterval(() => {
                  step++;
                  setDisplayed(Math.round(Math.min((value / steps) * step, value)));
                  if (step >= steps) clearInterval(timerRef.current);
                }, duration / steps);
                return () => clearInterval(timerRef.current);
              }, []);
              return <>{typeof value === 'number' ? displayed : value}</>;
            };
            return (
              <div key={label} className="rounded-xl border p-5 relative overflow-hidden stat-count-enter" style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}0d 0%, transparent 65%)` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
                    <svg className="w-5 h-5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}15` }}>{sub}</span>
                </div>
                <div className="text-[34px] font-bold leading-none mb-1 text-[#fafafa]">
                  <AnimatedValue />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div className="text-[13px] text-[#a1a1aa]">{label}</div>
                  {trend && (
                    <span className={`flex items-center gap-0.5 text-[11px] font-medium ${trend.up ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {trend.up ? '↑' : '↓'} {trend.pct}%
                    </span>
                  )}
                </div>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-20" style={{ backgroundColor: color }} />
              </div>
            );
          })}
        </div>}

        {/* Charts row */}
        {activeTab === 'overview' && tickets.length > 0 && (
          <>
            {/* Line chart + leaderboard row */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              {/* Line chart with date range filter */}
              <Card className="md:col-span-2 p-5 border-t-[3px]" style={{ borderTopColor: '#22c55e' }}>
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h2 className="text-[14px] font-semibold text-[#fafafa]">Tickets Created</h2>
                  <div className="flex items-center gap-1 bg-[#27272a] rounded-lg p-0.5">
                    {[{ label: '7d', val: 7 }, { label: '30d', val: 30 }, { label: '90d', val: 90 }, { label: 'All', val: 0 }].map(({ label, val }) => (
                      <button key={val} onClick={() => setChartRange(val)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${chartRange === val ? 'bg-[#3b82f6] text-white' : 'text-[#71717a] hover:text-[#fafafa]'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={thirtyDayData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false}
                      interval={Math.floor(thirtyDayData.length / 6)} />
                    <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Agent leaderboard */}
              <Card className="p-5 border-t-[3px]" style={{ borderTopColor: '#f59e0b' }}>
                <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                  Agent Leaderboard
                </h2>
                {agentLeaderboard.length === 0 ? (
                  <p className="text-[12px] text-[#52525b]">No resolved tickets assigned yet.</p>
                ) : (
                  <ol className="space-y-2.5">
                    {agentLeaderboard.map(({ name, count }, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                      const barColors = ['#f59e0b', '#a1a1aa', '#cd7f32', '#6366f1', '#22c55e'];
                      const pct = Math.round((count / (agentLeaderboard[0]?.count || 1)) * 100);
                      return (
                        <li key={name} className="flex items-center gap-2">
                          <span className="text-[13px] w-5 text-center">{medals[i] || `${i + 1}`}</span>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: barColors[i] || '#6366f1' }}>{initials}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[12px] text-[#fafafa] truncate">{name}</span>
                              <span className="text-[11px] text-[#a1a1aa] ml-2 flex-shrink-0">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColors[i] || '#6366f1' }} />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Card>
            </div>

            {/* Status / Category / Priority charts */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
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
          </>
        )}

        {/* Heatmap + Agent performance */}
        {activeTab === 'overview' && tickets.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            {/* Day-of-week heatmap */}
            <Card className="p-5 border-t-[3px]" style={{ borderTopColor: '#6366f1' }}>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#6366f1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Ticket Volume by Day
              </h2>
              {(() => {
                const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const counts = Array(7).fill(0);
                tickets.forEach(t => { counts[new Date(t.createdAt).getDay()]++; });
                const max = Math.max(...counts, 1);
                return (
                  <div className="space-y-2">
                    {DAYS.map((day, i) => {
                      const pct = (counts[i] / max) * 100;
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <span className="text-[11px] w-7 text-[#71717a] font-medium">{day}</span>
                          <div className="flex-1 h-6 rounded-md bg-[#27272a] overflow-hidden relative">
                            <div className="h-full rounded-md transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: `rgba(99,102,241,${0.15 + (pct / 100) * 0.75})` }} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#a1a1aa]">{counts[i]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>

            {/* Agent performance table */}
            <Card className="p-5 border-t-[3px]" style={{ borderTopColor: '#22c55e' }}>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                Agent Performance
              </h2>
              {(() => {
                const agentMap = {};
                tickets.forEach(t => {
                  if (!t.assignedTo || t.assignedTo === 'Unassigned') return;
                  if (!agentMap[t.assignedTo]) agentMap[t.assignedTo] = { resolved: 0, resTimes: [], csat: [], open: 0 };
                  const a = agentMap[t.assignedTo];
                  if (t.status === 'Resolved' || t.status === 'Closed') {
                    a.resolved++;
                    if (t.resolvedAt) a.resTimes.push(new Date(t.resolvedAt) - new Date(t.createdAt));
                    if (t.satisfaction?.rating) a.csat.push(t.satisfaction.rating);
                  } else if (t.status === 'Open' || t.status === 'In Progress') {
                    a.open++;
                  }
                });
                const rows = Object.entries(agentMap)
                  .map(([name, d]) => ({
                    name,
                    resolved: d.resolved,
                    open: d.open,
                    avgRes: d.resTimes.length ? d.resTimes.reduce((s, v) => s + v, 0) / d.resTimes.length : null,
                    csat: d.csat.length ? (d.csat.reduce((s, v) => s + v, 0) / d.csat.length).toFixed(1) : null,
                  }))
                  .sort((a, b) => b.resolved - a.resolved)
                  .slice(0, 6);
                const fmtMs = ms => {
                  if (!ms) return '—';
                  const h = Math.floor(ms / 3600000);
                  return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`;
                };
                if (rows.length === 0) return <p className="text-[12px] text-[#52525b]">No assigned tickets yet.</p>;
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="text-[11px] text-[#52525b] uppercase tracking-wider border-b border-[#27272a]">
                          <th className="pb-2 text-left font-semibold">Agent</th>
                          <th className="pb-2 text-center font-semibold">Resolved</th>
                          <th className="pb-2 text-center font-semibold">Open</th>
                          <th className="pb-2 text-center font-semibold">Avg Res.</th>
                          <th className="pb-2 text-center font-semibold">CSAT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={r.name} className="border-b border-[#27272a]/50 last:border-0">
                            <td className="py-2 text-[#fafafa] font-medium">{r.name}</td>
                            <td className="py-2 text-center text-[#22c55e] font-semibold">{r.resolved}</td>
                            <td className="py-2 text-center text-[#f59e0b]">{r.open}</td>
                            <td className="py-2 text-center text-[#a1a1aa]">{fmtMs(r.avgRes)}</td>
                            <td className="py-2 text-center">
                              {r.csat ? <span className="text-[#f59e0b]">⭐ {r.csat}</span> : <span className="text-[#52525b]">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </Card>
          </div>
        )}

        {/* Tickets table */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-[16px] font-medium text-[#fafafa]">All Tickets</h2>
            {/* Saved filter presets */}
            {savedFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-[#52525b] mr-1">Saved:</span>
                {savedFilters.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#27272a] border border-[#3f3f46] text-[11px]">
                    <button onClick={() => applyFilter(f)} className="text-[#a1a1aa] hover:text-[#fafafa] transition-colors">{f.name}</button>
                    <button onClick={() => removeSavedFilter(i)} className="text-[#3f3f46] hover:text-[#ef4444] transition-colors ml-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/>
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[13px] rounded-lg pl-8 pr-3 py-1.5 w-full sm:w-40 focus:outline-none focus:border-[#3b82f6] placeholder-[#52525b]"
                />
              </div>
              <div className="flex gap-2 items-center flex-wrap">
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
                {hasTableFilters && (
                  <button
                    onClick={saveCurrentFilter}
                    title="Save current filter as preset"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[12px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                    Pin
                  </button>
                )}
              </div>
            </div>
          </div>
          {recentTickets.length === 0 ? (
            <div className="text-center py-12 text-[#52525b] text-[13px]">
              {hasTableFilters ? 'No tickets match your filters.' : 'No tickets yet'}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[12px] text-[#52525b] border-b border-[#27272a]">
                      <th className="pb-3 w-8">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-[#3f3f46] bg-[#18181b] accent-[#FF634A] cursor-pointer"
                        />
                      </th>
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
                        <td className="py-4 w-8" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ticket._id)}
                            onChange={() => toggleSelect(ticket._id)}
                            className="rounded border-[#3f3f46] bg-[#18181b] accent-[#FF634A] cursor-pointer"
                          />
                        </td>
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

              {/* Mobile stacked cards */}
              <div className="sm:hidden space-y-3">
                {recentTickets.map((ticket) => {
                  const PRIMAP = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
                  const STMAP = { 'Open': '#22c55e', 'In Progress': '#f59e0b', 'Resolved': '#06b6d4', 'Closed': '#71717a' };
                  const pc = PRIMAP[ticket.priority] || '#a1a1aa';
                  const sc = STMAP[ticket.status] || '#a1a1aa';
                  return (
                    <div key={ticket._id}
                      onClick={() => navigate(`/tickets/${ticket._id}`)}
                      className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 cursor-pointer active:scale-[0.99] transition-transform"
                      style={{ borderLeft: `3px solid ${pc}` }}>
                      <div className="flex items-start gap-2 mb-2">
                        <input type="checkbox" checked={selectedIds.has(ticket._id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(ticket._id); }}
                          onClick={e => e.stopPropagation()}
                          className="mt-0.5 rounded border-[#3f3f46] bg-[#18181b] accent-[#FF634A] cursor-pointer flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono text-[#3b82f6] mb-0.5">
                            {ticket.ticketId || ticket._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[14px] font-medium text-[#fafafa] leading-tight">{ticket.title}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: pc, backgroundColor: `${pc}18` }}>{ticket.priority}</span>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: sc }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-blink" style={{ backgroundColor: sc }} />
                          {ticket.status}
                        </span>
                        <span className="text-[11px] text-[#52525b] ml-auto">{ticket.createdBy?.name || ticket.createdBy?.email || 'Unknown'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {tablePageCount > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 pt-4 border-t border-[#27272a] gap-2">
              <p className="text-[13px] text-[#52525b]">
                Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filteredTableTickets.length)} of {filteredTableTickets.length}
              </p>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                  className="px-3 py-1.5 rounded-lg text-[13px] bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  ← Prev
                </button>
                {Array.from({ length: tablePageCount }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setTablePage(pg)}
                    className={`w-8 h-8 rounded-lg text-[13px] border transition-colors flex-shrink-0 ${
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
                  className="px-3 py-1.5 rounded-lg text-[13px] bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 rounded-2xl bg-[#18181b] border border-[#3f3f46] shadow-2xl max-w-[calc(100vw-2rem)] overflow-x-auto">
          <span className="text-[13px] font-semibold text-[#fafafa] whitespace-nowrap">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-[#3f3f46] flex-shrink-0" />
          <button
            onClick={() => handleBulkStatus('Resolved')}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-lg bg-[#06b6d4]/15 border border-[#06b6d4]/30 text-[#06b6d4] text-[12px] font-medium hover:bg-[#06b6d4]/25 disabled:opacity-50 transition-colors"
          >
            Mark Resolved
          </button>
          <button
            onClick={() => handleBulkStatus('Closed')}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-lg bg-[#71717a]/15 border border-[#71717a]/30 text-[#a1a1aa] text-[12px] font-medium hover:bg-[#71717a]/25 disabled:opacity-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] text-[12px] font-medium hover:bg-[#ef4444]/25 disabled:opacity-50 transition-colors"
          >
            Delete
          </button>
          <div className="w-px h-4 bg-[#3f3f46] flex-shrink-0" />
          <select
            value={bulkReassignAgent}
            onChange={e => setBulkReassignAgent(e.target.value)}
            className="bg-[#27272a] border border-[#3f3f46] text-[#fafafa] text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#FF634A] max-w-[140px]"
          >
            <option value="">Reassign to…</option>
            {agents.map(a => <option key={a._id} value={a.name}>{a.name}</option>)}
          </select>
          <button
            onClick={handleBulkReassign}
            disabled={bulkLoading || !bulkReassignAgent}
            className="px-3 py-1.5 rounded-lg bg-[#6366f1]/15 border border-[#6366f1]/30 text-[#818cf8] text-[12px] font-medium hover:bg-[#6366f1]/25 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            Reassign
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[#52525b] hover:text-[#a1a1aa] transition-colors ml-1"
            title="Deselect all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </PageWrapper>
  );
};

export default AdminDashboard;

