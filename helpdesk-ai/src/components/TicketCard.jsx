import React from 'react';
import Badge from './ui/Badge';
import { getTimeAgo } from '../data/mockTickets';

/**
 * TicketCard Component
 * Card displaying ticket summary
 */
const TicketCard = ({ ticket, onClick }) => {
  const priorityVariant = ticket.priority.toLowerCase();
  const statusVariant = ticket.status.toLowerCase().replace(' ', '-');

  const getCategoryIcon = (category) => {
    const icons = {
      'Hardware': '🖥️',
      'Software': '💻',
      'Network': '🌐',
      'Access': '🔐',
      'Other': '📋'
    };
    return icons[category] || '📋';
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

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer"
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

      {/* Footer */}
      <div className="flex justify-between items-center text-[12px] text-[#52525b] font-['JetBrains_Mono'] pt-4 border-t border-[#27272a]">
        <span>Created {getTimeAgo(ticket.createdAt)}</span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusDotColor(ticket.status)} animate-blink`} />
          <span>{ticket.status}</span>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
