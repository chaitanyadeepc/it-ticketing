import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import api from '../api/api';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CHART_COLORS = ['#FF634A', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const P_COLORS = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
const PRESETS = [{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: 'All', days: 0 }];

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#fafafa', fontSize: 12 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

const Section = ({ title, children, className = '' }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 ${className}`}>
    <h2 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h2>
    {children}
  </div>
);

const Empty = ({ msg = 'No data in selected range' }) => (
  <div className="h-52 flex flex-col items-center justify-center gap-2 text-zinc-500 text-sm">
    <span className="text-3xl">📭</span>{msg}
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="w-8 h-8 border-2 border-[#FF634A] border-t-transparent rounded-full animate-spin" />
        Loading report data…
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">📊 Advanced Reports</h1>
            <p className="text-zinc-400 text-sm mt-1">Deep analytics across all tickets</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF634A] hover:bg-[#e0552e] text-white text-sm font-medium rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV ({inRange.length})
          </button>
        </div>

        {/* Date range controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          {PRESETS.map(p => (
            <button
              key={p.days}
              onClick={() => { setPreset(p.days); setCustomFrom(''); setCustomTo(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                preset === p.days && !customFrom && !customTo
                  ? 'bg-[#FF634A] border-[#FF634A] text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Custom:</span>
            <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPreset(-1); }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-[#FF634A]" />
            <span className="text-zinc-500 text-xs">—</span>
            <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPreset(-1); }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-[#FF634A]" />
          </div>
          <span className="ml-auto text-xs text-zinc-500">{inRange.length} tickets in range</span>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tickets',    value: total,                                             color: '#3b82f6', icon: '🎫' },
            { label: 'Resolved',         value: `${resolved} (${total ? Math.round(resolved/total*100) : 0}%)`, color: '#22c55e', icon: '✅' },
            { label: 'Avg Resolution',   value: avgResHr ? `${avgResHr}h` : '—',                  color: '#f59e0b', icon: '⏱' },
            { label: 'Avg CSAT',         value: avgCSAT ? `${avgCSAT} / 5` : '—',                 color: '#8b5cf6', icon: '⭐' },
          ].map(k => (
            <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-2xl mb-2">{k.icon}</p>
              <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-zinc-400 mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Row 1: Resolution trend + CSAT trend */}
        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Resolution Time Trend (avg hours, weekly)">
            {resTimeTrend.length > 1 ? (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={resTimeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="avgHours" stroke="#FF634A" strokeWidth={2} dot={false} name="Avg Hours" />
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
        <div className="grid md:grid-cols-2 gap-6">
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
        <div className="grid md:grid-cols-2 gap-6">
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
                <Bar dataKey="count" fill="#FF634A" name="Tickets" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Priority distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Priority Distribution</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['Critical', 'High', 'Medium', 'Low'].map(p => {
              const count = inRange.filter(t => t.priority === p).length;
              const pct = total ? Math.round(count / total * 100) : 0;
              return (
                <div key={p} className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: P_COLORS[p] }}>{p}</span>
                    <span className="text-zinc-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: P_COLORS[p] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent performance table */}
        {agentPerf.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-300">Agent Performance Table</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-800/50">
                    {['Agent', 'Total', 'Resolved', 'Rate', 'Avg CSAT', 'CSAT Responses'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-zinc-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agentPerf.map(a => (
                    <tr key={a.agent} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-zinc-200">{a.agent}</td>
                      <td className="px-5 py-3 text-zinc-400">{a.total}</td>
                      <td className="px-5 py-3 text-green-400">{a.resolved}</td>
                      <td className="px-5 py-3 text-zinc-400">{a.total ? Math.round(a.resolved / a.total * 100) : 0}%</td>
                      <td className="px-5 py-3">{a.avgCSAT ? <span className="text-purple-400">{a.avgCSAT}/5</span> : <span className="text-zinc-600">—</span>}</td>
                      <td className="px-5 py-3 text-zinc-500">{a.csatCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
