import React from 'react';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { formatDateTime } from '../data/mockTickets';

/**
 * TicketModal Component
 * Full ticket details modal overlay
 */
const TicketModal = ({ ticket, onClose }) => {
  if (!ticket) return null;

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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[#27272a] border border-[#27272a] rounded-[10px] w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-[#27272a]">
          <div>
            <div className="text-[12px] font-['JetBrains_Mono'] text-[#3b82f6] font-medium mb-1">
              {ticket.id}
            </div>
            <h2 className="text-[20px] font-semibold text-[#fafafa] mb-3">
              {ticket.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="medium">
                {getCategoryIcon(ticket.category)} {ticket.category}
              </Badge>
              <Badge variant={priorityVariant}>{ticket.priority}</Badge>
              <Badge variant={statusVariant}>{ticket.status}</Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#52525b] hover:text-[#fafafa] text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-[12px] text-[#52525b] font-medium mb-2">Description</h3>
            <p className="text-[#fafafa] text-[14px] leading-relaxed">{ticket.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-[12px] text-[#52525b] font-medium mb-2">Created At</h3>
              <p className="text-[#fafafa] font-['JetBrains_Mono'] text-[13px]">
                {formatDateTime(ticket.createdAt)}
              </p>
            </div>
            <div>
              <h3 className="text-[12px] text-[#52525b] font-medium mb-2">Last Updated</h3>
              <p className="text-[#fafafa] font-['JetBrains_Mono'] text-[13px]">
                {formatDateTime(ticket.updatedAt)}
              </p>
            </div>
            {ticket.assignedTo && (
              <div>
                <h3 className="text-[12px] text-[#52525b] font-medium mb-2">Assigned Agent</h3>
                <p className="text-[#fafafa] text-[14px]">{ticket.assignedTo}</p>
              </div>
            )}
            {ticket.resolvedAt && (
              <div>
                <h3 className="text-[12px] text-[#52525b] font-medium mb-2">Resolved At</h3>
                <p className="text-[#fafafa] font-['JetBrains_Mono'] text-[13px]">
                  {formatDateTime(ticket.resolvedAt)}
                </p>
              </div>
            )}
          </div>

          {/* Resolution (if resolved) */}
          {ticket.resolution && (
            <div>
              <h3 className="text-[12px] text-[#52525b] font-medium mb-2">Resolution</h3>
              <p className="text-[#fafafa] text-[14px] leading-relaxed">{ticket.resolution}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="primary" className="flex-1">
              Add Comment
            </Button>
            {ticket.status !== 'Closed' && (
              <Button variant="success">
                Mark as Resolved
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
