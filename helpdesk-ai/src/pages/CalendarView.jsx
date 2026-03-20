import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const STATUS_COLOR = { Open: '#22c55e', 'In Progress': '#f59e0b', Resolved: '#06b6d4', Closed: '#71717a' };
const P_COLOR      = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
const DOW_LABELS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const pad = n => String(n).padStart(2, '0');

export default function CalendarView() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());         // 0-indexed
  const [selDay, setSelDay] = useState(null);
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const params = userRole === 'admin' ? {} : { mine: 'true' };
    api.get('/tickets', { params })
      .then(r => setTickets(r.data.tickets || []))
      .finally(() => setLoading(false));
  }, []);

  // Map dateStr (YYYY-MM-DD) → tickets due on that day
  const byDate = useMemo(() => {
    const map = {};
    tickets.forEach(t => {
      if (!t.dueDate) return;
      const k = t.dueDate.slice(0, 10);
      (map[k] = map[k] || []).push(t);
    });
    return map;
  }, [tickets]);

  // Build the 6-week grid for the current month
  const cells = useMemo(() => {
    const firstDow   = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null); // trailing empty
    return grid;
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); setSelDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); }  else setMonth(m => m+1); setSelDay(null); };
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelDay(null); };

  const todayKey = today.toISOString().slice(0, 10);
  const selKey   = selDay ? `${year}-${pad(month+1)}-${pad(selDay)}` : null;
  const selTickets = selKey ? (byDate[selKey] || []) : [];

  const monthTickets = tickets.filter(t => t.dueDate?.startsWith(`${year}-${pad(month+1)}`));
  const overdueCount = monthTickets.filter(t => t.dueDate < todayKey && !['Resolved','Closed'].includes(t.status)).length;

  // Weeks array for rendering rows
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i+7));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">📅 Ticket Calendar</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {monthTickets.length} ticket{monthTickets.length !== 1 ? 's' : ''} due this month
              {overdueCount > 0 && <span className="text-red-400 ml-2">· {overdueCount} overdue</span>}
            </p>
          </div>
          <button onClick={() => navigate('/my-tickets')} className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors">
            ← My Tickets
          </button>
        </div>

        {/* Calendar card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Navigation bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">{MONTH_NAMES[month]} {year}</h2>
              {(year !== today.getFullYear() || month !== today.getMonth()) && (
                <button onClick={goToday} className="text-xs text-[#FF634A] hover:underline">Today</button>
              )}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-zinc-800">
            {DOW_LABELS.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-zinc-500 tracking-wide">{d}</div>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>
          ) : (
            <div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-zinc-800/50 last:border-b-0">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="min-h-[80px] border-r border-zinc-800/50 last:border-r-0 bg-zinc-900/30" />;
                    const key = `${year}-${pad(month+1)}-${pad(day)}`;
                    const dayT = byDate[key] || [];
                    const isToday = key === todayKey;
                    const isSel   = selDay === day;
                    const isPast  = key < todayKey;
                    const hasOverdue = dayT.some(t => !['Resolved','Closed'].includes(t.status)) && isPast;
                    return (
                      <div
                        key={di}
                        onClick={() => setSelDay(isSel ? null : day)}
                        className={`min-h-[80px] p-1.5 border-r border-zinc-800/50 last:border-r-0 cursor-pointer transition-colors relative select-none ${
                          isSel    ? 'bg-[#FF634A]/10' :
                          isToday  ? 'bg-zinc-800/40'  :
                          'hover:bg-zinc-800/30'
                        }`}
                      >
                        {/* Day number */}
                        <div className={`w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full mb-1 ${
                          isToday ? 'bg-[#FF634A] text-white' :
                          isSel   ? 'text-[#FF634A] bg-[#FF634A]/15' :
                          isPast  ? 'text-zinc-600' : 'text-zinc-300'
                        }`}>{day}</div>

                        {/* Ticket dots */}
                        {dayT.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {dayT.slice(0, 4).map(t => (
                              <span key={t._id} className="w-1.5 h-1.5 rounded-full block" style={{ backgroundColor: STATUS_COLOR[t.status] || '#a1a1aa' }} title={t.title} />
                            ))}
                            {dayT.length > 4 && <span className="text-[9px] text-zinc-500 leading-none">+{dayT.length-4}</span>}
                          </div>
                        )}

                        {/* Overdue indicator */}
                        {hasOverdue && (
                          <span className="absolute top-1 right-1 text-[9px] font-bold text-red-400">!</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
          {Object.entries(STATUS_COLOR).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c }} />{s}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="text-red-400 font-bold text-xs">!</span>Has overdue open tickets
          </span>
        </div>

        {/* Selected day detail panel */}
        {selDay && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">
                {MONTH_NAMES[month]} {selDay}, {year}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">{selTickets.length} ticket{selTickets.length !== 1 ? 's' : ''} due</span>
                <button onClick={() => setSelDay(null)} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {selTickets.length === 0 ? (
              <div className="px-5 py-10 text-center text-zinc-500 text-sm">No tickets due on this day</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {selTickets.map(t => (
                  <div
                    key={t._id}
                    onClick={() => navigate(`/tickets/${t._id}`)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[t.status] || '#888' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{t.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {t.ticketId} · {t.category}
                        {t.assignedTo && <> · Assigned to {t.assignedTo}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: P_COLOR[t.priority], backgroundColor: `${P_COLOR[t.priority]}15`, border: `1px solid ${P_COLOR[t.priority]}30` }}>
                        {t.priority}
                      </span>
                      <span className="text-xs text-zinc-500">{t.status}</span>
                      <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming due — next 7 days summary */}
        {(() => {
          const upcoming = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const k = d.toISOString().slice(0, 10);
            const ts = (byDate[k] || []).filter(t => !['Resolved','Closed'].includes(t.status));
            if (ts.length) upcoming.push({ key: k, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), tickets: ts });
          }
          if (!upcoming.length) return null;
          return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-200">⚡ Upcoming — Next 7 Days</h3>
              </div>
              <div className="divide-y divide-zinc-800">
                {upcoming.map(({ key, label, tickets: ts }) => (
                  <div key={key} className="px-5 py-3 flex items-start gap-4">
                    <div className="w-24 shrink-0">
                      <p className={`text-xs font-semibold ${key === todayKey ? 'text-[#FF634A]' : 'text-zinc-400'}`}>{label}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ts.map(t => (
                        <button
                          key={t._id}
                          onClick={() => navigate(`/tickets/${t._id}`)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 hover:border-zinc-500 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[t.status] }} />
                          <span className="truncate max-w-[160px]">{t.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
