import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import api from '../api/api';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];
const P_COLORS = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
const PRESETS = [{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: 'All', days: 0 }];

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'var(--color-canvas-subtle)', border: '1px solid var(--color-border-default)', borderRadius: 8, color: 'var(--color-fg-default)', fontSize: 12 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

const Section = ({ title, children, className = '' }) => (
  <div className={`bg-[#18181b] border border-[#27272a] rounded-xl p-5 ${className}`}>
    <h2 className="text-[13px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">{title}</h2>
    {children}
  </div>
);

const Empty = ({ msg = 'No data in selected range' }) => (
  <div className="h-52 flex flex-col items-center justify-center gap-2 text-[#52525b] text-[13px]">
    <svg className="w-10 h-10 text-[#3f3f46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
    {msg}
  </div>
);

export default function Reports() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    api.get('/tickets').then(r => setTickets(r.data.tickets || [])).finally(() => setLoading(false));
  }, []);

  const { fromDate, toDate } = useMemo(() => {
    const to = customTo ? new Date(customTo + 'T23:59:59') : new Date();
    const from = customFrom
      ? new Date(customFrom + 'T00:00:00')
      : preset === 0 ? new Date(0) : new Date(Date.now() - preset * 86_400_000);
    return { fromDate: from, toDate: to };
  }, [preset, customFrom, customTo]);

  const inRange = useMemo(() =>
    tickets.filter(t => { const d = new Date(t.createdAt); return d >= fromDate && d <= toDate; }),
    [tickets, fromDate, toDate]
  );

  // KPIs
  const total    = inRange.length;
  const resolved = inRange.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
  const withRes  = inRange.filter(t => t.resolvedAt);
  const avgResHr = withRes.length
    ? (withRes.reduce((s, t) => s + (new Date(t.resolvedAt) - new Date(t.createdAt)), 0) / withRes.length / 3_600_000).toFixed(1)
    : null;
  const withCSAT = inRange.filter(t => t.satisfaction?.rating);
  const avgCSAT  = withCSAT.length
    ? (withCSAT.reduce((s, t) => s + t.satisfaction.rating, 0) / withCSAT.length).toFixed(2)
    : null;

  // FCR (First Contact Resolution) — resolved without reassignment (single assignedTo) and never reopened
  const fcrCount = useMemo(() => {
    return inRange.filter(t => {
      if (!['Resolved', 'Closed'].includes(t.status)) return false;
      const reassigns = (t.history || []).filter(h => h.field === 'assignedTo').length;
      const reopens   = (t.history || []).filter(h => h.to === 'Open' && h.from !== null && h.from !== undefined).length;
      return reassigns <= 1 && reopens === 0;
    }).length;
  }, [inRange]);
  const fcrRate = resolved > 0 ? Math.round((fcrCount / resolved) * 100) : null;

  // Cost-per-ticket — reads hourly rate from localStorage
  const hourlyRate  = parseFloat(localStorage.getItem('hd_hourly_rate') || '0');
  const estimatedCostPerTicket = avgResHr && hourlyRate > 0
    ? (parseFloat(avgResHr) * hourlyRate).toFixed(2)
    : null;
  const totalMonthlyCost = estimatedCostPerTicket && withRes.length > 0
    ? (parseFloat(estimatedCostPerTicket) * resolved).toFixed(2)
    : null;

  // Category trend — 30-day daily buckets for each category
  const categoryTrend = useMemo(() => {
    const allCategories = [...new Set(inRange.map(t => t.category))].slice(0, 6);
    const days = 30;
    return allCategories.map(cat => {
      const data = Array.from({ length: days }, (_, i) => {
        const dayStart = new Date(Date.now() - (days - 1 - i) * 86400000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999);
        const count = inRange.filter(t => t.category === cat && new Date(t.createdAt) >= dayStart && new Date(t.createdAt) <= dayEnd).length;
        return { day: i, count };
      });
      return { category: cat, data };
    });
  }, [inRange]);

  // Ticket flow — simplified Sankey-style
  const ticketFlow = useMemo(() => {
    const assigned   = inRange.filter(t => t.assignedTo && t.assignedTo !== 'Unassigned').length;
    const unassigned = inRange.filter(t => !t.assignedTo || t.assignedTo === 'Unassigned').length;
    const resolvedFlow  = inRange.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
    const reopened   = inRange.filter(t => (t.history || []).some(h => h.to === 'Open' && h.from !== 'created')).length;
    const escalated  = inRange.filter(t => (t.history || []).some(h => h.field === 'assignedTo' && (h.history || []).length > 1)).length;
    return [
      { stage: 'Created', value: inRange.length, color: '#3b82f6' },
      { stage: 'Assigned', value: assigned, color: '#06b6d4' },
      { stage: 'Unassigned', value: unassigned, color: '#f59e0b' },
      { stage: 'Resolved', value: resolvedFlow, color: '#22c55e' },
      { stage: 'Reopened', value: reopened, color: '#f97316' },
    ];
  }, [inRange]);

  // Resolution time trend — weekly
  const resTimeTrend = useMemo(() => {
    const weeks = {};
    inRange.filter(t => t.resolvedAt).forEach(t => {
      const d = new Date(t.resolvedAt);
      const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
      const k = ws.toISOString().slice(0, 10);
      if (!weeks[k]) weeks[k] = { date: k, totalMs: 0, count: 0 };
      weeks[k].totalMs += new Date(t.resolvedAt) - new Date(t.createdAt);
      weeks[k].count++;
    });
    return Object.values(weeks)
      .sort((a, b) => a.date > b.date ? 1 : -1)
      .map(w => ({ week: w.date.slice(5), avgHours: +(w.totalMs / w.count / 3_600_000).toFixed(1) }));
  }, [inRange]);

  // CSAT over time — monthly
  const csatMonthly = useMemo(() => {
    const months = {};
    inRange.filter(t => t.satisfaction?.rating).forEach(t => {
      const k = new Date(t.createdAt).toISOString().slice(0, 7);
      if (!months[k]) months[k] = { month: k, total: 0, count: 0 };
      months[k].total += t.satisfaction.rating;
      months[k].count++;
    });
    return Object.values(months)
      .sort((a, b) => a.month > b.month ? 1 : -1)
      .map(m => ({ month: m.month.slice(2), avg: +(m.total / m.count).toFixed(2) }));
  }, [inRange]);

  // Agent performance
  const agentPerf = useMemo(() => {
    const map = {};
    inRange.filter(t => t.assignedTo).forEach(t => {
      const a = t.assignedTo;
      if (!map[a]) map[a] = { agent: a, resolved: 0, total: 0, csatTotal: 0, csatCount: 0 };
      map[a].total++;
      if (['Resolved', 'Closed'].includes(t.status)) map[a].resolved++;
      if (t.satisfaction?.rating) { map[a].csatTotal += t.satisfaction.rating; map[a].csatCount++; }
    });
    return Object.values(map)
      .map(a => ({ ...a, avgCSAT: a.csatCount ? +(a.csatTotal / a.csatCount).toFixed(2) : null }))
      .sort((a, b) => b.resolved - a.resolved)
      .slice(0, 10);
  }, [inRange]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map = {};
    inRange.forEach(t => { map[t.category] = (map[t.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [inRange]);

  // Volume by day-of-week
  const byDow = useMemo(() => {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = Array(7).fill(0);
    inRange.forEach(t => counts[new Date(t.createdAt).getDay()]++);
    return counts.map((count, i) => ({ day: DAYS[i], count }));
  }, [inRange]);

  // Monthly volume
  const monthlyVolume = useMemo(() => {
    const map = {};
    inRange.forEach(t => {
      const k = new Date(t.createdAt).toISOString().slice(0, 7);
      if (!map[k]) map[k] = { month: k, open: 0, resolved: 0 };
      if (['Resolved', 'Closed'].includes(t.status)) map[k].resolved++;
      else map[k].open++;
    });
    return Object.values(map)
      .sort((a, b) => a.month > b.month ? 1 : -1)
      .map(m => ({ ...m, month: m.month.slice(2) }));
  }, [inRange]);

  const exportCSV = () => {
    const header = ['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Assigned To', 'Submitted By', 'Created At', 'Resolved At', 'Resolution Hours', 'CSAT'];
    const rows = inRange.map(t => {
      const resHr = t.resolvedAt ? ((new Date(t.resolvedAt) - new Date(t.createdAt)) / 3_600_000).toFixed(1) : '';
      return [
        t.ticketId || t._id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.category || '', t.priority || '', t.status || '',
        t.assignedTo || '', t.createdBy?.name || t.createdBy?.email || '',
        new Date(t.createdAt).toLocaleDateString(),
        t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString() : '',
        resHr, t.satisfaction?.rating || '',
      ];
    });
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `hiticket-report-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="skeleton h-4 w-32 rounded mb-5" />
        <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5 mb-5 space-y-2">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-3 w-64 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 space-y-3">
              <div className="skeleton w-9 h-9 rounded-xl" />
              <div className="skeleton h-6 w-20 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-5">
              <div className="skeleton h-3 w-40 rounded mb-4" />
              <div className="skeleton h-52 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        <Breadcrumb />

        {/* Header banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#8b5cf6]/4 to-transparent border border-[#3b82f6]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">Advanced Reports</h1>
            <p className="text-[13px] text-[#a1a1aa]">Deep analytics across all tickets</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV ({inRange.length})
          </button>
        </div>

        {/* Date range controls */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.days}
                onClick={() => { setPreset(p.days); setCustomFrom(''); setCustomTo(''); }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  preset === p.days && !customFrom && !customTo
                    ? 'bg-[#3b82f6]/15 border-[#3b82f6]/40 text-[#3b82f6]'
                    : 'bg-[#27272a] border-[#3f3f46] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#52525b]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#52525b]">Custom:</span>
            <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPreset(-1); }}
              className="bg-[#111113] border border-[#27272a] rounded-lg px-3 py-1.5 text-[12px] text-[#fafafa] focus:outline-none focus:border-[#3b82f6]" />
            <span className="text-[#52525b] text-[11px]">—</span>
            <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPreset(-1); }}
              className="bg-[#111113] border border-[#27272a] rounded-lg px-3 py-1.5 text-[12px] text-[#fafafa] focus:outline-none focus:border-[#3b82f6]" />
          </div>
          <span className="ml-auto text-[12px] text-[#52525b]">{inRange.length} tickets in range</span>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tickets',  value: total,                                                          color: '#3b82f6', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { label: 'Resolved',       value: `${resolved} (${total ? Math.round(resolved/total*100) : 0}%)`, color: '#22c55e', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Avg Resolution', value: avgResHr ? `${avgResHr}h` : '—',                               color: '#f59e0b', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Avg CSAT',       value: avgCSAT ? `${avgCSAT} / 5` : '—',                              color: '#8b5cf6', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border p-4 sm:p-5 relative overflow-hidden" style={{ borderColor: `${k.color}30`, background: `linear-gradient(135deg, ${k.color}0d 0%, transparent 70%)` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: k.color + '18' }}>
                <svg className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: k.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  {k.icon.split(' M').map((d, i) => <path key={i} strokeLinecap="round" strokeLinejoin="round" d={(i===0?'':'M')+d} />)}
                </svg>
              </div>
              <p className="text-[22px] sm:text-[26px] font-bold leading-none mb-1" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[11px] sm:text-[12px] text-[#a1a1aa]">{k.label}</p>
              <div className="absolute -right-4 -bottom-4 w-14 h-14 rounded-full blur-2xl opacity-20" style={{ backgroundColor: k.color }} />
            </div>
          ))}
        </div>

        {/* Row 1: Resolution trend + CSAT trend */}
        <div className="grid md:grid-cols-2 gap-5">
          <Section title="Resolution Time Trend (avg hours, weekly)">
            {resTimeTrend.length > 1 ? (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={resTimeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="avgHours" stroke="#f59e0b" strokeWidth={2} dot={false} name="Avg Hours" />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty msg="Not enough resolved tickets" />}
          </Section>

          <Section title="CSAT Score Over Time (monthly average)">
            {csatMonthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={csatMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="avg" stroke="#8b5cf6" strokeWidth={2} dot name="Avg CSAT" />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty msg="No CSAT ratings in range" />}
          </Section>
        </div>

        {/* Row 2: Agent performance + Category breakdown */}
        <div className="grid md:grid-cols-2 gap-5">
          <Section title="Agent Performance (resolved vs total)">
            {agentPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={agentPerf} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis dataKey="agent" type="category" tick={{ fill: '#71717a', fontSize: 11 }} width={90} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                  <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[0,3,3,0]} />
                  <Bar dataKey="resolved" fill="#22c55e" name="Resolved" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty msg="No agent data" />}
          </Section>

          <Section title="Category Breakdown">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent*100).toFixed(0)}%)` : ''}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </Section>
        </div>

        {/* Row 3: Volume by month + by day of week */}
        <div className="grid md:grid-cols-2 gap-5">
          <Section title="Monthly Ticket Volume">
            {monthlyVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthlyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                  <Bar dataKey="resolved" stackId="a" fill="#22c55e" name="Resolved" radius={[0,0,0,0]} />
                  <Bar dataKey="open" stackId="a" fill="#3b82f6" name="Open/In Progress" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </Section>

          <Section title="Ticket Volume by Day of Week">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={byDow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#3b82f6" name="Tickets" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Priority distribution */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-[13px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">Priority Distribution</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {['Critical', 'High', 'Medium', 'Low'].map(p => {
              const count = inRange.filter(t => t.priority === p).length;
              const pct = total ? Math.round(count / total * 100) : 0;
              return (
                <div key={p} className="space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="font-medium" style={{ color: P_COLORS[p] }}>{p}</span>
                    <span className="text-[#71717a]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: P_COLORS[p] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Leaderboard */}
        {agentPerf.length > 0 && (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#a1a1aa] uppercase tracking-wider">🏆 Agent Leaderboard</h2>
              <span className="text-[11px] text-[#52525b]">Ranked by tickets resolved</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#111113]">
                    {['Rank', 'Agent', 'Resolved', 'Rate', 'Avg CSAT', 'Complexity Pts'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agentPerf.map((a, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                    // Complexity points: sum of auto-calculated complexity for resolved tickets
                    const complexityPts = inRange
                      .filter(t => t.assignedTo === a.agent && ['Resolved','Closed'].includes(t.status))
                      .reduce((s, t) => {
                        let score = 1;
                        const entries = (t.comments?.length || 0) + (t.internalNotes?.length || 0);
                        if (entries > 10) score += 2; else if (entries > 5) score += 1;
                        if ((Date.now() - new Date(t.createdAt)) / 3600000 > 72) score += 1;
                        return s + Math.min(5, score);
                      }, 0);
                    return (
                      <tr key={a.agent} className={`border-t border-[#27272a] hover:bg-[#27272a]/50 transition-colors ${idx < 3 ? 'bg-[#f59e0b]/3' : ''}`}>
                        <td className="px-5 py-3 text-[14px]">{medal}</td>
                        <td className="px-5 py-3 font-medium text-[#e4e4e7]">{a.agent}</td>
                        <td className="px-5 py-3 text-[#22c55e] font-semibold">{a.resolved}</td>
                        <td className="px-5 py-3 text-[#a1a1aa]">{a.total ? Math.round(a.resolved / a.total * 100) : 0}%</td>
                        <td className="px-5 py-3">{a.avgCSAT ? <span className="text-[#8b5cf6] font-medium">{a.avgCSAT}/5</span> : <span className="text-[#3f3f46]">—</span>}</td>
                        <td className="px-5 py-3 text-[#f59e0b] font-semibold">{complexityPts} ⭐</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── NEW: FCR + Cost-Per-Ticket KPI row ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* First Contact Resolution Rate */}
          <div className="rounded-xl border p-5 relative overflow-hidden" style={{ borderColor: '#22c55e30', background: 'linear-gradient(135deg,#22c55e0d 0%,transparent 70%)' }}>
            <div className="w-9 h-9 rounded-xl bg-[#22c55e18] flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <p className="text-[26px] font-bold leading-none mb-1 text-[#22c55e]">{fcrRate !== null ? `${fcrRate}%` : '—'}</p>
            <p className="text-[12px] text-[#a1a1aa]">First Contact Resolution Rate</p>
            <p className="text-[11px] text-[#52525b] mt-1">{fcrCount} of {resolved} resolved tickets — no reassignment or reopen</p>
          </div>

          {/* Cost Per Ticket */}
          <div className="rounded-xl border p-5 relative overflow-hidden" style={{ borderColor: '#06b6d430', background: 'linear-gradient(135deg,#06b6d40d 0%,transparent 70%)' }}>
            <div className="w-9 h-9 rounded-xl bg-[#06b6d418] flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#06b6d4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <p className="text-[26px] font-bold leading-none mb-1 text-[#06b6d4]">
              {estimatedCostPerTicket ? `$${estimatedCostPerTicket}` : '—'}
            </p>
            <p className="text-[12px] text-[#a1a1aa]">Estimated Cost Per Ticket</p>
            <p className="text-[11px] text-[#52525b] mt-1">
              {totalMonthlyCost
                ? `~$${Number(totalMonthlyCost).toLocaleString()} total for ${resolved} resolved tickets`
                : hourlyRate > 0 ? 'No resolved tickets with timing data' : 'Set hourly rate in Settings to enable'}
            </p>
          </div>

          {/* Ticket Flow Summary */}
          <div className="rounded-xl border p-5" style={{ borderColor: '#3b82f630', background: 'linear-gradient(135deg,#3b82f60d 0%,transparent 70%)' }}>
            <p className="text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Ticket Flow</p>
            <div className="space-y-2">
              {ticketFlow.map(({ stage, value, color }) => (
                <div key={stage} className="flex items-center gap-2">
                  <span className="text-[11px] text-[#71717a] w-20 flex-shrink-0">{stage}</span>
                  <div className="flex-1 h-2 bg-[#27272a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: inRange.length ? `${Math.min(100, (value / inRange.length) * 100)}%` : '0%', backgroundColor: color }} />
                  </div>
                  <span className="text-[11px] font-medium w-8 text-right" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── NEW: Category Trend Sparklines ─────────────────────────────── */}
        {categoryTrend.length > 0 && (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">30-Day Category Trends</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categoryTrend.map(({ category, data }, idx) => {
                const max = Math.max(...data.map(d => d.count), 1);
                const total30 = data.reduce((s, d) => s + d.count, 0);
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                return (
                  <div key={category} className="rounded-lg border border-[#27272a] bg-[#111113] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium text-[#fafafa] truncate">{category}</span>
                      <span className="text-[11px] font-bold ml-2 flex-shrink-0" style={{ color }}>{total30}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={42}>
                      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                        <Line type="monotone" dataKey="count" stroke={color} strokeWidth={1.5} dot={false} />
                        <YAxis domain={[0, max]} hide />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
