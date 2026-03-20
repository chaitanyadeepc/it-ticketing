import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const P_COLOR = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e', Critical: '#ef4444', High: '#f59e0b', Medium: '#3b82f6', Low: '#22c55e' };

function buildGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarView() {
  const navigate    = useNavigate();
  const today       = new Date();
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState(today.getMonth());
  const [year, setYear]         = useState(today.getFullYear());
  const [selected, setSelected] = useState(today.getDate());

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/tickets'); setTickets(data.tickets || []); }
      catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const toDate = t => t.dueDate ? new Date(t.dueDate) : null;

  const byDate = tickets.reduce((acc, t) => {
    const d = toDate(t);
    if (!d) return acc;
    if (d.getMonth() !== month || d.getFullYear() !== year) return acc;
    const k = d.getDate();
    if (!acc[k]) acc[k] = [];
    acc[k].push(t);
    return acc;
  }, {});

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isOverdue = (t) => { const d = toDate(t); return d && d < today && t.status !== 'closed' && t.status !== 'resolved'; };

  const selectedTickets = byDate[selected] || [];
  const monthTickets    = Object.values(byDate).flat();
  const overdueCount    = monthTickets.filter(isOverdue).length;
  const upcoming = tickets
    .filter(t => { const d = toDate(t); return d && d >= today && d.getMonth() === month && d.getFullYear() === year; })
    .sort((a, b) => toDate(a) - toDate(b))
    .slice(0, 8);

  const cells = buildGrid(year, month);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 mb-6 rounded-2xl bg-gradient-to-r from-[#8b5cf6]/8 via-[#3b82f6]/4 to-transparent border border-[#8b5cf6]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">Ticket Calendar</h1>
            <p className="text-[13px] text-[#a1a1aa]">Due-date overview for {MONTHS[month]} {year}</p>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <span className="text-[12px] px-3 py-1.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] font-medium">
                {overdueCount} overdue
              </span>
            )}
            <span className="text-[12px] px-3 py-1.5 rounded-xl bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa]">
              {monthTickets.length} with due dates
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* Left: Calendar grid */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
            {/* Month navigator */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a]">
              <button onClick={prev} className="w-8 h-8 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-[15px] font-semibold text-[#fafafa]">{MONTHS[month]} {year}</span>
              <button onClick={next} className="w-8 h-8 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[#27272a]">
              {DAYS.map(d => (
                <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">{d}</div>
              ))}
            </div>

            {/* Cells */}
            {loading ? (
              <div className="h-64 flex items-center justify-center text-[#52525b] text-[13px]">Loading...</div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const dayTickets = day ? (byDate[day] || []) : [];
                  return (
                    <button key={i} disabled={!day}
                      onClick={() => day && setSelected(day)}
                      className={`min-h-[72px] p-1.5 border-r border-b border-[#27272a] transition-colors text-left last:border-r-0 ${
                        !day ? 'bg-[#111113] cursor-default' :
                        selected === day ? 'bg-[#3b82f6]/10 border-[#3b82f6]/20' :
                        isToday(day) ? 'bg-[#3b82f6]/5' :
                        'hover:bg-[#27272a]/60 cursor-pointer'
                      }`}>
                      {day && (
                        <>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] mb-1 ${
                            isToday(day) ? 'bg-[#3b82f6] text-white font-bold' : 'text-[#71717a]'
                          }`}>{day}</div>
                          <div className="flex flex-wrap gap-0.5">
                            {dayTickets.slice(0, 3).map(t => (
                              <span key={t._id} className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: isOverdue(t) ? '#ef4444' : (P_COLOR[t.priority] || '#3b82f6') }} />
                            ))}
                            {dayTickets.length > 3 && (
                              <span className="text-[9px] text-[#52525b]">+{dayTickets.length - 3}</span>
                            )}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-[#27272a]">
              {[['critical','#ef4444'],['high','#f59e0b'],['medium','#3b82f6'],['low','#22c55e']].map(([p, c]) => (
                <div key={p} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                  <span className="text-[11px] text-[#52525b] capitalize">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Side panel */}
          <div className="space-y-4">
            {/* Selected day */}
            {selected && (
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
                  <h3 className="text-[13px] font-semibold text-[#fafafa]">
                    {MONTHS[month].slice(0, 3)} {selected}
                  </h3>
                  <span className="text-[11px] text-[#52525b]">{selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''}</span>
                </div>
                {selectedTickets.length === 0 ? (
                  <p className="text-[12px] text-[#52525b] px-4 py-6 text-center">No tickets due this day</p>
                ) : (
                  <div className="divide-y divide-[#27272a]">
                    {selectedTickets.map(t => (
                      <button key={t._id} onClick={() => navigate(`/tickets/${t._id}`)}
                        className="w-full text-left px-4 py-3 hover:bg-[#27272a]/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: P_COLOR[t.priority] || '#3b82f6' }} />
                          <span className="text-[12px] font-medium text-[#fafafa] line-clamp-1 flex-1">{t.title}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#52525b] capitalize">{t.priority} · {t.status}</span>
                          {isOverdue(t) && <span className="text-[10px] text-[#ef4444] font-medium">OVERDUE</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upcoming */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#27272a]">
                <h3 className="text-[13px] font-semibold text-[#fafafa]">Upcoming Due Dates</h3>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-[12px] text-[#52525b] px-4 py-6 text-center">No upcoming due dates</p>
              ) : (
                <div className="divide-y divide-[#27272a]">
                  {upcoming.map(t => {
                    const d = toDate(t);
                    const daysLeft = Math.ceil((d - today) / 86400000);
                    return (
                      <button key={t._id} onClick={() => navigate(`/tickets/${t._id}`)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#27272a]/50 transition-colors">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: P_COLOR[t.priority] || '#3b82f6' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-[#fafafa] line-clamp-1">{t.title}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: daysLeft <= 1 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#52525b' }}>
                              {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `Due in ${daysLeft} days`}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
