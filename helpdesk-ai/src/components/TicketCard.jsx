import React from 'react';
import Badge from './ui/Badge';
import { getTimeAgo } from '../data/mockTickets';

const SLA_HOURS = { Critical: 4, High: 8, Medium: 24, Low: 72 };

const getSLA = (ticket) => {
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') return null;
  const slaMs = (SLA_HOURS[ticket.priority] || 24) * 3600000;
  const deadline = new Date(ticket.createdAt).getTime() + slaMs;
  const remaining = deadline - Date.now();
  if (isNaN(deadline)) return null;
  if (remaining <= 0) return { breached: true, label: 'SLA Breached' };
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const pct = remaining / slaMs;
  return { breached: false, urgent: pct < 0.25, label: h > 0 ? `${h}h ${m}m left` : `${m}m left` };
};

/**
 * TicketCard Component
 * Card displaying ticket summary
 */
const TicketCard = ({ ticket, onClick }) => {
  const priorityVariant = ticket.priority.toLowerCase();
  const statusVariant = ticket.status.toLowerCase().replace(' ', '-');

  const getCategoryIcon = (category) => {
    const paths = {
      'Hardware':             'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2',
      'Software':             'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      'Software & Apps':      'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      'Network':              'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
      'Network & Connectivity':'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
      'Access':               'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
      'Access & Identity':    'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    };
    const d = paths[category] || 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
    return (
      <svg className="w-3.5 h-3.5 inline-block flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    );
  };

  const getStatusDotColor = (status) => {
    const colors = {
      'Open': 'bg-[#22c55e]',
      'In Progress': 'bg-[#f59e0b]',
      'Resolved': 'bg-[#3b82f6]',
      'Closed': 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const PRIORITY_COLOR = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
  const priorityStrip = PRIORITY_COLOR[ticket.priority] || '#3b82f6';

  // Avatar initials helper
  const getInitials = (name) => {
    if (!name || name === 'Unassigned') return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer relative overflow-hidden"
      style={{ borderLeft: `3px solid ${priorityStrip}` }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="text-[13px] font-['JetBrains_Mono'] font-medium text-[#3b82f6] mb-1">
            {ticket.id}
          </div>
          <h3 className="text-[14px] font-medium text-[#fafafa] mb-3">
            {ticket.title}
          </h3>
        </div>
        {ticket.priority === 'Critical' && (
          <Badge variant="high" blink>
            ⚠ Elevated Risk
          </Badge>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="medium">
          {getCategoryIcon(ticket.category)} {ticket.category}
        </Badge>
        <Badge variant={priorityVariant}>{ticket.priority}</Badge>
        <Badge variant={statusVariant}>{ticket.status}</Badge>
      </div>

      {/* SLA indicator */}
      {(() => {
        const sla = getSLA(ticket);
        if (!sla) return null;
        const color = sla.breached ? '#ef4444' : sla.urgent ? '#f97316' : '#22c55e';
        return (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${color}12`, border: `1px solid ${color}30` }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[11px] font-medium font-['JetBrains_Mono'] tracking-wide" style={{ color }}>
              {sla.label}
            </span>
          </div>
        );
      })()}

      {/* Footer */}
      <div className="flex justify-between items-center text-[12px] text-[#52525b] font-['JetBrains_Mono'] pt-4 border-t border-[#27272a]">
        <span>Created {getTimeAgo(ticket.createdAt)}</span>
        <div className="flex items-center gap-2">
          {ticket.assignedTo && ticket.assignedTo !== 'Unassigned' && (
            <div
              title={`Assigned to ${ticket.assignedTo}`}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#6366f1' }}
            >
              {getInitials(ticket.assignedTo)}
            </div>
          )}
          <span className={`w-2 h-2 rounded-full ${getStatusDotColor(ticket.status)} animate-blink`} />
          <span>{ticket.status}</span>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
