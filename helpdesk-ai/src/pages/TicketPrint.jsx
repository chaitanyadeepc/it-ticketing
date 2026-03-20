import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';

const fmt = d => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const PRIORITY_COLOR = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
const STATUS_COLOR   = { Open: '#22c55e', 'In Progress': '#f59e0b', Resolved: '#06b6d4', Closed: '#71717a' };

export default function TicketPrint() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/tickets/${id}`)
      .then(({ data }) => { setTicket(data.ticket); setLoading(false); })
      .catch(() => { setError('Failed to load ticket'); setLoading(false); });
  }, [id]);

  // Auto-trigger print dialog once ticket loads
  useEffect(() => {
    if (!ticket) return;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [ticket]);

  if (loading) return (
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif', color: '#333', textAlign: 'center' }}>
      Loading ticket…
    </div>
  );

  if (error || !ticket) return (
    <div style={{ padding: 48, fontFamily: 'system-ui, sans-serif', color: '#c00' }}>
      {error || 'Ticket not found'}
    </div>
  );

  const pc = PRIORITY_COLOR[ticket.priority] || '#888';
  const sc = STATUS_COLOR[ticket.status] || '#888';

  const META = [
    ['Ticket ID',    ticket.ticketId],
    ['Status',       ticket.status],
    ['Priority',     ticket.priority],
    ['Category',     ticket.category],
    ['Sub-type',     ticket.subType || '—'],
    ['Submitted By', ticket.createdBy?.name || ticket.createdBy?.email || '—'],
    ['Assigned To',  ticket.assignedTo || 'Unassigned'],
    ['Created',      fmt(ticket.createdAt)],
    ['Last Updated', fmt(ticket.updatedAt)],
    ['Resolved',     fmt(ticket.resolvedAt)],
    ['Due Date',     fmt(ticket.dueDate)],
  ];

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="no-print" style={{ display:'flex', gap:12, padding:'16px 32px', background:'#f4f4f5', borderBottom:'1px solid #e4e4e7' }}>
        <button
          onClick={() => window.print()}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 20px', background:'#111', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'system-ui,sans-serif', fontSize:14, fontWeight:600 }}
        >
          🖨 Print / Save PDF
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ padding:'8px 20px', background:'transparent', color:'#555', border:'1px solid #ccc', borderRadius:8, cursor:'pointer', fontFamily:'system-ui,sans-serif', fontSize:14 }}
        >
          ← Back
        </button>
        <span style={{ marginLeft:'auto', fontSize:12, color:'#999', alignSelf:'center' }}>
          Print preview — only content below will be printed
        </span>
      </div>

      {/* Printable content */}
      <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 40px', fontFamily:'Georgia,serif', color:'#111', lineHeight:1.7 }}>

        {/* Logo + header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'2px solid #111', paddingBottom:16, marginBottom:24 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'system-ui,sans-serif', marginBottom:4 }}>
              Hi<span style={{ color:'#FF634A' }}>Ticket</span> — Support Ticket
            </div>
            <div style={{ fontFamily:'monospace', fontSize:15, color:'#555' }}>{ticket.ticketId}</div>
            <h1 style={{ margin:'8px 0 0', fontSize:18, fontWeight:700, fontFamily:'system-ui,sans-serif', color:'#111' }}>{ticket.title}</h1>
          </div>
          <div style={{ textAlign:'right', fontSize:12, color:'#888', fontFamily:'system-ui,sans-serif' }}>
            <div>Printed: {new Date().toLocaleString()}</div>
            <div style={{ marginTop:6, display:'flex', gap:8, justifyContent:'flex-end' }}>
              <span style={{ padding:'2px 8px', borderRadius:12, background:`${pc}22`, color:pc, border:`1px solid ${pc}55`, fontSize:11, fontWeight:700 }}>{ticket.priority}</span>
              <span style={{ padding:'2px 8px', borderRadius:12, background:`${sc}22`, color:sc, border:`1px solid ${sc}55`, fontSize:11, fontWeight:700 }}>{ticket.status}</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:28, fontSize:13, fontFamily:'system-ui,sans-serif' }}>
          <tbody>
            {META.map(([k, v]) => (
              <tr key={k} style={{ borderBottom:'1px solid #e5e5e5' }}>
                <td style={{ padding:'6px 12px', fontWeight:600, color:'#555', width:'30%', background:'#f9f9f9' }}>{k}</td>
                <td style={{ padding:'6px 12px', color:'#111' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Description */}
        <h2 style={{ fontSize:14, fontFamily:'system-ui,sans-serif', fontWeight:700, margin:'0 0 8px', borderBottom:'1px solid #e5e5e5', paddingBottom:6, textTransform:'uppercase', letterSpacing:'0.05em', color:'#444' }}>
          Description
        </h2>
        <p style={{ whiteSpace:'pre-wrap', fontSize:13, fontFamily:'system-ui,sans-serif', color:'#333', marginBottom:32 }}>
          {ticket.description}
        </p>

        {/* Comments */}
        {ticket.comments?.length > 0 && (
          <>
            <h2 style={{ fontSize:14, fontFamily:'system-ui,sans-serif', fontWeight:700, margin:'0 0 12px', borderBottom:'1px solid #e5e5e5', paddingBottom:6, textTransform:'uppercase', letterSpacing:'0.05em', color:'#444' }}>
              Comments ({ticket.comments.length})
            </h2>
            {ticket.comments.map((c, i) => (
              <div key={c._id || i} style={{ marginBottom:20, paddingLeft:16, borderLeft:'3px solid #ddd' }}>
                <div style={{ fontSize:12, fontFamily:'system-ui,sans-serif', color:'#666', marginBottom:5 }}>
                  <strong style={{ color:'#333' }}>{c.authorName || 'Unknown'}</strong>
                  <span style={{ margin:'0 6px' }}>·</span>
                  {new Date(c.createdAt).toLocaleString()}
                </div>
                <p style={{ margin:0, fontSize:13, fontFamily:'system-ui,sans-serif', whiteSpace:'pre-wrap', color:'#111' }}>{c.text}</p>
              </div>
            ))}
          </>
        )}

        {/* History */}
        {ticket.history?.length > 0 && (
          <>
            <h2 style={{ fontSize:14, fontFamily:'system-ui,sans-serif', fontWeight:700, margin:'32px 0 12px', borderBottom:'1px solid #e5e5e5', paddingBottom:6, textTransform:'uppercase', letterSpacing:'0.05em', color:'#444' }}>
              History ({ticket.history.length})
            </h2>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:'system-ui,sans-serif' }}>
              <thead>
                <tr style={{ background:'#f0f0f0' }}>
                  {['Action', 'By', 'When'].map(h => (
                    <th key={h} style={{ padding:'6px 10px', textAlign:'left', border:'1px solid #e5e5e5', fontWeight:600, color:'#555' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ticket.history.map((h, i) => (
                  <tr key={h._id || i}>
                    <td style={{ padding:'6px 10px', border:'1px solid #e5e5e5', color:'#333' }}>{h.action}</td>
                    <td style={{ padding:'6px 10px', border:'1px solid #e5e5e5', color:'#555' }}>{h.byName || '—'}</td>
                    <td style={{ padding:'6px 10px', border:'1px solid #e5e5e5', color:'#555' }}>{new Date(h.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop:40, paddingTop:16, borderTop:'1px solid #e5e5e5', fontSize:11, fontFamily:'system-ui,sans-serif', color:'#aaa', textAlign:'center' }}>
          Generated by HiTicket · {window.location.origin} · {new Date().toLocaleDateString()}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
        }
        @page { margin: 18mm; size: A4; }
      `}</style>
    </>
  );
}
