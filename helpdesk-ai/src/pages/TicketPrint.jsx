import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';

const fmt   = d => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtDs = d => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'long' }) : '—';

const PRIORITY_COLOR = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
const STATUS_COLOR   = { Open: '#22c55e', 'In Progress': '#f59e0b', Resolved: '#06b6d4', Closed: '#71717a' };

/* ── Exact LogoMark replica (inline, no Tailwind dependency) ── */
function PrintLogo({ dark }) {
  const BOX = 48, SVG = 24;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      {/* Coral icon box */}
      <div style={{ width:BOX, height:BOX, borderRadius:9, backgroundColor:'#FF634A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width={SVG} height={SVG} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="4" width="18" height="12" rx="2" stroke="white" strokeWidth="1.6" fill="none"/>
          <circle cx="1"  cy="10" r="2"  fill="#FF634A"/>
          <circle cx="19" cy="10" r="2"  fill="#FF634A"/>
          <line x1="1"  y1="10" x2="3"  y2="10" stroke="white" strokeWidth="1.6"/>
          <line x1="17" y1="10" x2="19" y2="10" stroke="white" strokeWidth="1.6"/>
          <line x1="3"  y1="10" x2="17" y2="10" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
          <text x="5.5" y="9" fontSize="5" fontWeight="700" fill="white" fontFamily="system-ui,sans-serif">Hi</text>
        </svg>
      </div>
      {/* Wordmark */}
      <span style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.5px', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif', lineHeight:1 }}>
        <span style={{ color: dark ? '#ffffff' : '#0f172a' }}>Hi</span>
        <span style={{ color:'#FF634A' }}>Ticket</span>
      </span>
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────── */
function SectionHeading({ label, t }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'28px 0 12px' }}>
      <div style={{ width:4, height:18, borderRadius:2, backgroundColor:'#FF634A', flexShrink:0 }} />
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: t.accent, fontFamily:'system-ui,sans-serif' }}>
        {label}
      </span>
      <div style={{ flex:1, height:1, backgroundColor: t.border }} />
    </div>
  );
}

export default function TicketPrint() {
  const { id } = useParams();
  const [ticket,  setTicket]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [dark,    setDark]    = useState(false);

  useEffect(() => {
    api.get(`/tickets/${id}`)
      .then(({ data }) => { setTicket(data.ticket); setLoading(false); })
      .catch(() => { setError('Failed to load ticket'); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!ticket) return;
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, [ticket]);

  /* ── Theme tokens ── */
  const t = dark ? {
    page      : '#09090b',
    surface   : '#18181b',
    surface2  : '#111113',
    border    : '#27272a',
    text      : '#fafafa',
    textSec   : '#a1a1aa',
    textMuted : '#71717a',
    accent    : '#a1a1aa',
    theadBg   : '#1d1d20',
    theadText : '#e4e4e7',
    rowEven   : '#141416',
    rowOdd    : '#18181b',
    commentBrd: '#3f3f46',
    codeBg    : '#1a1a1d',
  } : {
    page      : '#ffffff',
    surface   : '#f8fafc',
    surface2  : '#f1f5f9',
    border    : '#e2e8f0',
    text      : '#0f172a',
    textSec   : '#475569',
    textMuted : '#64748b',
    accent    : '#64748b',
    theadBg   : '#0f172a',
    theadText : '#f8fafc',
    rowEven   : '#f8fafc',
    rowOdd    : '#ffffff',
    commentBrd: '#cbd5e1',
    codeBg    : '#f1f5f9',
  };

  if (loading) return (
    <div style={{ padding:48, fontFamily:'system-ui,sans-serif', color:'#64748b', textAlign:'center', fontSize:15 }}>
      Loading ticket…
    </div>
  );
  if (error || !ticket) return (
    <div style={{ padding:48, fontFamily:'system-ui,sans-serif', color:'#ef4444', fontSize:15 }}>
      {error || 'Ticket not found'}
    </div>
  );

  const pc = PRIORITY_COLOR[ticket.priority] || '#888';
  const sc = STATUS_COLOR[ticket.status]     || '#888';

  const META_LEFT = [
    ['Ticket ID',    <span style={{ fontFamily:'monospace', fontSize:13, color:pc, fontWeight:700 }}>{ticket.ticketId}</span>],
    ['Status',       <span style={{ padding:'2px 10px', borderRadius:20, background:`${sc}22`, color:sc, border:`1px solid ${sc}66`, fontSize:11, fontWeight:700 }}>{ticket.status}</span>],
    ['Priority',     <span style={{ padding:'2px 10px', borderRadius:20, background:`${pc}22`, color:pc, border:`1px solid ${pc}66`, fontSize:11, fontWeight:700 }}>{ticket.priority}</span>],
    ['Category',     ticket.category],
    ['Sub-type',     ticket.subType || '—'],
    ['Due Date',     ticket.dueDate ? fmtDs(ticket.dueDate) : '—'],
  ];
  const META_RIGHT = [
    ['Submitted By', ticket.createdBy?.name || ticket.createdBy?.email || '—'],
    ['Assigned To',  ticket.assignedTo || 'Unassigned'],
    ['Department',   ticket.createdBy?.department || '—'],
    ['Created',      fmt(ticket.createdAt)],
    ['Last Updated', fmt(ticket.updatedAt)],
    ['Resolved',     ticket.resolvedAt ? fmt(ticket.resolvedAt) : '—'],
  ];

  const tdStyle = (even) => ({
    padding:'7px 12px', border:`1px solid ${t.border}`,
    background: even ? t.rowEven : t.rowOdd,
    color: t.text, fontSize:12, fontFamily:'system-ui,sans-serif', verticalAlign:'top',
  });
  const thStyle = { padding:'8px 12px', background:t.theadBg, color:t.theadText, fontWeight:600, fontSize:11, textAlign:'left', border:`1px solid ${t.border}`, letterSpacing:'0.04em', textTransform:'uppercase' };

  return (
    <>
      {/* ── Screen-only toolbar ─────────────────────────────── */}
      <div className="no-print" style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 28px', background:'#0f172a', borderBottom:'1px solid #1e293b', position:'sticky', top:0, zIndex:50 }}>
        <button
          onClick={() => window.print()}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 20px', background:'#FF634A', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'system-ui,sans-serif', fontSize:13, fontWeight:700, letterSpacing:'0.02em' }}
        >
          🖨&nbsp; Print / Save PDF
        </button>
        <button
          onClick={() => setDark(d => !d)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', background: dark ? '#fafafa' : '#18181b', color: dark ? '#0f172a' : '#fafafa', border:`1px solid ${dark ? '#e2e8f0' : '#3f3f46'}`, borderRadius:8, cursor:'pointer', fontFamily:'system-ui,sans-serif', fontSize:13, fontWeight:600 }}
        >
          {dark ? '☀️  Light mode' : '🌙  Dark mode'}
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ padding:'8px 16px', background:'transparent', color:'#94a3b8', border:'1px solid #334155', borderRadius:8, cursor:'pointer', fontFamily:'system-ui,sans-serif', fontSize:13 }}
        >
          ← Back
        </button>
        {dark && (
          <span style={{ fontSize:11, color:'#f59e0b', background:'#f59e0b18', border:'1px solid #f59e0b44', borderRadius:6, padding:'4px 10px', fontFamily:'system-ui,sans-serif' }}>
            ⚠ Enable "Background graphics" in the print dialog for dark theme
          </span>
        )}
        <span style={{ marginLeft:'auto', fontSize:11, color:'#475569', fontFamily:'system-ui,sans-serif' }}>
          Only the content below will print
        </span>
      </div>

      {/* ── Printable document ──────────────────────────────── */}
      <div id="print-root" style={{ background: t.page, minHeight:'100vh', padding:'0 0 60px' }}>
        <div style={{ maxWidth:820, margin:'0 auto', padding:'40px 48px', fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color:t.text, lineHeight:1.6 }}>

          {/* ── Page header ── */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingBottom:20, marginBottom:24, borderBottom:`2px solid ${t.border}` }}>
            <PrintLogo dark={dark} />
            <div style={{ textAlign:'right', fontFamily:'system-ui,sans-serif' }}>
              <div style={{ fontSize:10, color:t.textMuted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 }}>Support Ticket Record</div>
              <div style={{ fontSize:11, color:t.textSec }}>Printed: {new Date().toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' })}</div>
              <div style={{ marginTop:8, display:'flex', gap:6, justifyContent:'flex-end' }}>
                <span style={{ padding:'3px 10px', borderRadius:20, background:`${pc}22`, color:pc, border:`1px solid ${pc}55`, fontSize:11, fontWeight:700 }}>{ticket.priority}</span>
                <span style={{ padding:'3px 10px', borderRadius:20, background:`${sc}22`, color:sc, border:`1px solid ${sc}55`, fontSize:11, fontWeight:700 }}>{ticket.status}</span>
              </div>
            </div>
          </div>

          {/* ── Title block ── */}
          <div style={{ marginBottom:28, padding:'20px 24px', background:t.surface, borderRadius:10, border:`1px solid ${t.border}`, borderLeft:`4px solid #FF634A` }}>
            <div style={{ fontSize:11, color:t.textMuted, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>
              {ticket.ticketId}
            </div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:t.text, lineHeight:1.3, letterSpacing:'-0.3px' }}>
              {ticket.title}
            </h1>
          </div>

          {/* ── Metadata two-column ── */}
          <SectionHeading label="Ticket Details" t={t} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:4 }}>
            {[META_LEFT, META_RIGHT].map((col, ci) => (
              <table key={ci} style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <tbody>
                  {col.map(([k, v], i) => (
                    <tr key={k}>
                      <td style={{ ...tdStyle(i%2===0), fontWeight:600, color:t.textSec, width:'42%' }}>{k}</td>
                      <td style={{ ...tdStyle(i%2===0), color:t.text }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>

          {/* ── Description ── */}
          <SectionHeading label="Description" t={t} />
          <div style={{ padding:'16px 20px', background:t.surface, borderRadius:8, border:`1px solid ${t.border}`, fontSize:13, lineHeight:1.75, whiteSpace:'pre-wrap', color:t.text, marginBottom:4 }}>
            {ticket.description}
          </div>

          {/* ── Comments ── */}
          {ticket.comments?.length > 0 && (
            <>
              <SectionHeading label={`Comments (${ticket.comments.length})`} t={t} />
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {ticket.comments.map((c, i) => (
                  <div key={c._id || i} style={{ padding:'14px 16px 14px 20px', background:t.surface, borderRadius:8, border:`1px solid ${t.border}`, borderLeft:`3px solid ${t.commentBrd}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'#FF634A22', border:'1px solid #FF634A55', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#FF634A', flexShrink:0 }}>
                        {(c.authorName || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{c.authorName || 'Unknown'}</span>
                        <span style={{ fontSize:11, color:t.textMuted, marginLeft:8 }}>{fmt(c.createdAt)}</span>
                      </div>
                    </div>
                    <p style={{ margin:0, fontSize:13, whiteSpace:'pre-wrap', color:t.text, lineHeight:1.65 }}>{c.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Attachments ── */}
          {ticket.attachments?.length > 0 && (
            <>
              <SectionHeading label={`Attachments (${ticket.attachments.length})`} t={t} />
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {ticket.attachments.map((a, i) => (
                  <div key={a._id || i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:t.surface, borderRadius:7, border:`1px solid ${t.border}`, fontSize:12 }}>
                    <span style={{ fontSize:16 }}>📎</span>
                    <span style={{ color:t.text, fontWeight:500 }}>{a.filename}</span>
                    <span style={{ color:t.textMuted, fontSize:11, marginLeft:'auto' }}>{a.mimetype} · {a.size ? `${(a.size/1024).toFixed(1)} KB` : ''} · {a.uploaderName}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Satisfaction ── */}
          {ticket.satisfaction?.rating && (
            <>
              <SectionHeading label="Satisfaction Survey" t={t} />
              <div style={{ padding:'14px 18px', background:t.surface, borderRadius:8, border:`1px solid ${t.border}`, fontSize:13 }}>
                <div style={{ marginBottom:6 }}>
                  {'⭐'.repeat(ticket.satisfaction.rating)}<span style={{ color:t.textMuted }}> ({ticket.satisfaction.rating}/5)</span>
                </div>
                {ticket.satisfaction.feedback && (
                  <p style={{ margin:0, color:t.text, fontStyle:'italic' }}>"{ticket.satisfaction.feedback}"</p>
                )}
              </div>
            </>
          )}

          {/* ── History ── */}
          {ticket.history?.length > 0 && (
            <>
              <SectionHeading label={`Audit History (${ticket.history.length} events)`} t={t} />
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr>
                    {['Action / Change', 'From', 'To', 'By', 'When'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ticket.history.map((h, i) => (
                    <tr key={h._id || i}>
                      <td style={tdStyle(i%2===0)}>{h.action}{h.field ? ` (${h.field})` : ''}</td>
                      <td style={{ ...tdStyle(i%2===0), color:t.textSec }}>{h.from || '—'}</td>
                      <td style={{ ...tdStyle(i%2===0), color:t.text, fontWeight:500 }}>{h.to || '—'}</td>
                      <td style={{ ...tdStyle(i%2===0), color:t.textSec }}>{h.byName || '—'}</td>
                      <td style={{ ...tdStyle(i%2===0), color:t.textMuted, whiteSpace:'nowrap' }}>{fmt(h.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── Footer ── */}
          <div style={{ marginTop:44, paddingTop:18, borderTop:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:10, color:t.textMuted, fontFamily:'system-ui,sans-serif' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:20, height:20, borderRadius:4, backgroundColor:'#FF634A', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
                  <rect x="1" y="4" width="18" height="12" rx="2" stroke="white" strokeWidth="1.6" fill="none"/>
                  <circle cx="1" cy="10" r="2" fill="#FF634A"/>
                  <circle cx="19" cy="10" r="2" fill="#FF634A"/>
                  <line x1="1" y1="10" x2="3" y2="10" stroke="white" strokeWidth="1.6"/>
                  <line x1="17" y1="10" x2="19" y2="10" stroke="white" strokeWidth="1.6"/>
                </svg>
              </div>
              <span>Generated by <strong style={{ color:'#FF634A' }}>HiTicket</strong> · {window.location.origin}</span>
            </div>
            <span>{new Date().toLocaleDateString('en-US', { dateStyle:'long' })}</span>
          </div>

        </div>
      </div>

      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          body { margin: 0; padding: 0; background: ${t.page} !important; }

          #print-root {
            background: ${t.page} !important;
            padding: 0 !important;
            min-height: unset;
          }

          #print-root > div {
            max-width: 100% !important;
            padding: 0 !important;
          }
        }

        @page {
          size: A4 portrait;
          margin: 16mm 16mm 18mm 16mm;
        }
      `}</style>
    </>
  );
}
