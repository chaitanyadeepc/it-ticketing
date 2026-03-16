import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

// ── Label maps ─────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  student: '🎓 Student', it_staff: '🛠️ IT Staff', faculty: '📚 Faculty',
  developer: '💻 Developer', manager: '📊 Manager', other: '👤 Other',
};
const PROCESS_LABELS = {
  email: '📧 Email', phone: '📞 Phone', walkin: '🚶 Walk-in desk',
  portal: '🌐 Online portal', chat: '💬 Chat/WhatsApp', none: '🤷 No process',
};
const CHATBOT_LABELS  = { definitely: '🙌 Definitely', probably: '👍 Probably', maybe: '🤔 Maybe', no: '👎 No' };
const FREQ_LABELS     = { daily: '📆 Daily', weekly: '🗓️ Weekly', monthly: '📅 Monthly', rarely: '✅ Rarely' };
const IMP_LABELS      = { critical: '🔴 Critical', important: '🟠 Important', somewhat: '🟡 Somewhat', notimportant: '⚪ Not important' };
const PRIORITY_LABELS = {
  speed: '⚡ Fast response', tracking: '📍 Real-time tracking', ai: '🤖 AI-assisted',
  mobile: '📱 Mobile-friendly', notes: '📋 Resolution notes', availability: '🕐 24/7 availability',
};
const RESP_TIME_LABELS = {
  under1hr: '⚡ Within 1 hour',
  '1to4hrs': '⏱️ 1–4 hours',
  sameday:  '📋 Same working day',
  nextday:  '📆 Next business day',
  flexible: '😌 No expectation',
};
const NOTIF_LABELS = {
  email:  '📧 Email only',
  inapp:  '🔔 In-app notification',
  sms:    '💬 SMS / WhatsApp',
  portal: '🌐 Check portal manually',
  any:    '✅ Any method works',
};

const SAT_COLORS    = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6'];
const SAT_LABELS    = ['Very Poor', 'Poor', 'Okay', 'Good', 'Excellent'];
const STARS         = ['★', '★★', '★★★', '★★★★', '★★★★★'];

// ── Stat bar ───────────────────────────────────────────────────────────────
const StatBar = ({ label, count, total, color = '#3b82f6' }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[12px] text-[#a1a1aa] flex-shrink-0 w-44 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[#27272a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] text-[#52525b] font-mono w-20 text-right flex-shrink-0">{count} ({pct}%)</span>
    </div>
  );
};

// ── Section card ───────────────────────────────────────────────────────────
const SCard = ({ title, children, accent = '#3b82f6' }) => (
  <div className="bg-[#18181b] border border-[#27272a] border-l-[3px] rounded-xl p-5" style={{ borderLeftColor: accent }}>
    <h2 className="text-[13px] font-semibold text-[#fafafa] mb-4">{title}</h2>
    {children}
  </div>
);

export default function FeedbackResults() {
  const navigate = useNavigate();
  const [stats, setStats]         = useState(null);
  const [feedback, setFeedback]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded]   = useState(null);

  const fetchAll = useCallback(async (pg = 1) => {
    setLoading(pg === 1);
    setError('');
    try {
      const [sr, lr] = await Promise.all([
        api.get('/feedback/stats'),
        api.get(`/feedback?page=${pg}&limit=15`),
      ]);
      setStats(sr.data);
      setFeedback(lr.data.feedback || []);
      setTotal(lr.data.total || 0);
      setTotalPages(lr.data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(page); }, [page]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/feedback/${id}`);
      setFeedback((prev) => prev.filter((f) => f._id !== id));
      setTotal((t) => t - 1);
      if (stats) setStats((s) => ({ ...s, total: s.total - 1 }));
    } catch {
      setError('Failed to delete response');
    }
  };

  const exportCSV = () => {
    if (!feedback.length) return;
    const headers = ['Date', 'Role', 'Current Process', 'Satisfaction', 'Priorities', 'Would Use Chatbot', 'Issue Frequency', 'Response Time Expectation', 'Notif. Preference', 'Status Importance', 'Suggestions'];
      const rows = feedback.map((f) => [
        new Date(f.createdAt).toLocaleDateString('en-GB'),
        f.role, f.currentProcess, f.satisfaction,
        (f.priorities || []).join('; '),
        f.wouldUseChatbot, f.issueFrequency,
        f.responseTime || '', f.notifPreference || '',
        f.statusImportance,
        `"${(f.suggestions || '').replace(/"/g, '""')}"`,
      ]);
    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `hiticket-survey-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/survey`);
  };

  // ── Summary values ─────────────────────────────────────────────────────
  const positiveIntent = stats
    ? Math.round(
        (((stats.chatbot?.definitely || 0) + (stats.chatbot?.probably || 0)) / Math.max(stats.total, 1)) * 100
      )
    : 0;
  const topRole = stats && stats.roles
    ? Object.entries(stats.roles).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;

  return (
    <PageWrapper>
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-5 overflow-x-hidden">
        <Breadcrumb />

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-5 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#8b5cf6]/4 to-transparent border border-[#3b82f6]/15">
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-bold text-[#fafafa] mb-0.5">Survey Results</h1>
            <p className="text-[13px] text-[#a1a1aa]">
              {stats?.total || 0} responses · admin access only
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] text-[12px] font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              Copy Survey Link
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] text-[12px] font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 text-[12px] text-[#a1a1aa] hover:text-white transition-colors px-2 py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              Back
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl text-[#ef4444] text-[13px]">{error}</div>
        ) : !stats || stats.total === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-14 text-center">
            <div className="w-12 h-12 bg-[#27272a] rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <p className="text-[14px] font-medium text-[#fafafa] mb-2">No survey responses yet</p>
            <p className="text-[12px] text-[#52525b] mb-5">Share the link with users to start collecting feedback.</p>
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-medium rounded-lg transition-colors"
            >
              Copy Survey Link
            </button>
          </div>
        ) : (
          <>
            {/* Summary stat chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Responses',    value: stats.total,                  color: '#3b82f6' },
                { label: 'Avg Satisfaction',   value: `${stats.avgSatisfaction} / 5`, color: '#f59e0b' },
                { label: 'Would Use Chatbot',  value: `${positiveIntent}%`,          color: '#22c55e' },
                { label: 'Top Role',           value: ROLE_LABELS[topRole]?.slice(3) || '—', color: '#a855f7' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                  <div className="text-[22px] sm:text-[26px] font-bold mb-1" style={{ color }}>{value}</div>
                  <div className="text-[11px] text-[#52525b]">{label}</div>
                </div>
              ))}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {/* Satisfaction distribution */}
              <SCard title="Satisfaction Distribution" accent="#f59e0b">
                {[5, 4, 3, 2, 1].map((n) => (
                  <StatBar
                    key={n}
                    label={`${STARS[n - 1]}  ${SAT_LABELS[n - 1]}`}
                    count={stats.satisfactionDist?.[n] || 0}
                    total={stats.total}
                    color={SAT_COLORS[n - 1]}
                  />
                ))}
              </SCard>

              {/* Role breakdown */}
              <SCard title="Respondent Roles" accent="#8b5cf6">
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.roles?.[key] || 0} total={stats.total} color="#8b5cf6" />
                ))}
              </SCard>

              {/* What matters most */}
              <SCard title="What Matters Most (multi-select)" accent="#f59e0b">
                <p className="text-[11px] text-[#52525b] mb-3">% of respondents who chose each priority</p>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.priorities?.[key] || 0} total={stats.total} color="#f59e0b" />
                ))}
              </SCard>

              {/* Would use chatbot */}
              <SCard title="Would Use AI Chatbot?" accent="#22c55e">
                {Object.entries(CHATBOT_LABELS).map(([key, label]) => (
                  <StatBar
                    key={key}
                    label={label}
                    count={stats.chatbot?.[key] || 0}
                    total={stats.total}
                    color={['definitely', 'probably'].includes(key) ? '#22c55e' : '#52525b'}
                  />
                ))}
              </SCard>

              {/* Issue frequency */}
              <SCard title="How Often They Face IT Issues" accent="#3b82f6">
                {Object.entries(FREQ_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.frequency?.[key] || 0} total={stats.total} color="#3b82f6" />
                ))}
              </SCard>

              {/* Status importance */}
              <SCard title="Importance of Real-Time Status" accent="#ef4444">
                {Object.entries(IMP_LABELS).map(([key, label]) => (
                  <StatBar
                    key={key}
                    label={label}
                    count={stats.importance?.[key] || 0}
                    total={stats.total}
                    color={key === 'critical' ? '#ef4444' : key === 'important' ? '#f97316' : key === 'somewhat' ? '#f59e0b' : '#52525b'}
                  />
                ))}
              </SCard>

              {/* Response time expectation */}
              <SCard title="Response Time Expectation" accent="#06b6d4">
                <p className="text-[11px] text-[#52525b] mb-3">How quickly users expect their first response</p>
                {Object.entries(RESP_TIME_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.responseTime?.[key] || 0} total={stats.total} color="#06b6d4" />
                ))}
              </SCard>

              {/* Notification preference */}
              <SCard title="Preferred Notification Method" accent="#a855f7">
                <p className="text-[11px] text-[#52525b] mb-3">How users prefer to receive ticket updates</p>
                {Object.entries(NOTIF_LABELS).map(([key, label]) => (
                  <StatBar key={key} label={label} count={stats.notifPreference?.[key] || 0} total={stats.total} color="#a855f7" />
                ))}
              </SCard>
            </div>

            {/* Individual responses table */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-[#fafafa]">Individual Responses</h2>
                <span className="text-[11px] text-[#52525b]">{total} total</span>
              </div>

              {feedback.length === 0 ? (
                <div className="p-8 text-center text-[13px] text-[#52525b]">No responses on this page</div>
              ) : (
                <div className="divide-y divide-[#27272a]">
                  {feedback.map((f) => (
                    <div key={f._id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono text-[#3f3f46]">
                            {new Date(f.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#8b5cf6]/10 text-[#a78bfa]">
                            {ROLE_LABELS[f.role]}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
                            {'⭐'.repeat(f.satisfaction)} {f.satisfaction}/5
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                            ['definitely', 'probably'].includes(f.wouldUseChatbot)
                              ? 'bg-[#22c55e]/10 text-[#22c55e]'
                              : 'bg-[#52525b]/10 text-[#a1a1aa]'
                          }`}>
                            {CHATBOT_LABELS[f.wouldUseChatbot]}
                          </span>
                        </div>
                        <button
                          onClick={() => setExpanded(expanded === f._id ? null : f._id)}
                          className="text-[11px] text-[#52525b] hover:text-[#a1a1aa] transition-colors flex-shrink-0"
                        >
                          {expanded === f._id ? '▲ Less' : '▼ More'}
                        </button>
                      </div>

                      {expanded === f._id && (
                        <div className="mt-3 pt-3 border-t border-[#27272a] grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                          <div><span className="text-[#52525b]">Current process: </span><span className="text-[#a1a1aa]">{PROCESS_LABELS[f.currentProcess]}</span></div>
                          <div><span className="text-[#52525b]">Issue frequency: </span><span className="text-[#a1a1aa]">{FREQ_LABELS[f.issueFrequency]}</span></div>
                          <div><span className="text-[#52525b]">Status importance: </span><span className="text-[#a1a1aa]">{IMP_LABELS[f.statusImportance]}</span></div>
                          <div><span className="text-[#52525b]">Priorities: </span><span className="text-[#a1a1aa]">{(f.priorities || []).map((p) => PRIORITY_LABELS[p]).join(', ') || '—'}</span></div>
                          {f.responseTime && <div><span className="text-[#52525b]">Response expectation: </span><span className="text-[#a1a1aa]">{RESP_TIME_LABELS[f.responseTime]}</span></div>}
                          {f.notifPreference && <div><span className="text-[#52525b]">Notif. preference: </span><span className="text-[#a1a1aa]">{NOTIF_LABELS[f.notifPreference]}</span></div>}
                          {f.suggestions && (
                            <div className="sm:col-span-2 p-3 bg-[#09090b] rounded-lg border border-[#27272a] mt-1">
                              <p className="text-[10px] text-[#52525b] mb-1 uppercase tracking-widest">Suggestions</p>
                              <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{f.suggestions}</p>
                            </div>
                          )}
                          <div className="sm:col-span-2 flex justify-end mt-1">
                            <button
                              onClick={() => handleDelete(f._id)}
                              className="text-[11px] text-[#ef4444] hover:text-[#f87171] transition-colors"
                            >
                              Delete response
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#27272a]">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-[12px] bg-[#27272a] hover:bg-[#3f3f46] rounded-lg text-[#a1a1aa] disabled:opacity-40 transition-colors"
                  >← Prev</button>
                  <span className="text-[12px] text-[#52525b]">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-[12px] bg-[#27272a] hover:bg-[#3f3f46] rounded-lg text-[#a1a1aa] disabled:opacity-40 transition-colors"
                  >Next →</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
