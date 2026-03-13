/**
 * Mock Ticket Data
 * BACKEND INTEGRATION POINT: GET /api/tickets
 */

export const mockTickets = [
  {
    id: 'HD-2026-0001',
    title: 'Laptop won\'t start - black screen',
    description: 'My laptop doesn\'t turn on at all. When I press the power button, nothing happens. No lights, no sounds.',
    category: 'Hardware',
    priority: 'Critical',
    status: 'In Progress',
    createdAt: '2026-03-13T08:30:00Z',
    updatedAt: '2026-03-13T10:15:00Z',
    assignedTo: 'Sarah Chen',
    user: 'John Doe',
    timeline: [
      { time: '2026-03-13T08:30:00Z', event: 'Ticket created' },
      { time: '2026-03-13T08:45:00Z', event: 'Assigned to Sarah Chen' },
      { time: '2026-03-13T10:15:00Z', event: 'Agent responded: Checking hardware diagnostics' }
    ]
  },
  {
    id: 'HD-2026-0002',
    title: 'Cannot access email - password reset needed',
    description: 'I forgot my email password and cannot access my account. Need urgent help as I have important emails.',
    category: 'Access',
    priority: 'High',
    status: 'Open',
    createdAt: '2026-03-12T14:20:00Z',
    updatedAt: '2026-03-12T14:20:00Z',
    assignedTo: 'Mike Johnson',
    user: 'Jane Smith',
    timeline: [
      { time: '2026-03-12T14:20:00Z', event: 'Ticket created' },
      { time: '2026-03-12T14:25:00Z', event: 'Assigned to Mike Johnson' }
    ]
  },
  {
    id: 'HD-2026-0003',
    title: 'Software installation error - Adobe Creative Cloud',
    description: 'Getting error code 182 when trying to install Adobe Creative Cloud on Windows 11.',
    category: 'Software',
    priority: 'Medium',
    status: 'In Progress',
    createdAt: '2026-03-11T09:15:00Z',
    updatedAt: '2026-03-13T11:00:00Z',
    assignedTo: 'Alex Rodriguez',
    user: 'David Lee',
    timeline: [
      { time: '2026-03-11T09:15:00Z', event: 'Ticket created' },
      { time: '2026-03-11T09:30:00Z', event: 'Assigned to Alex Rodriguez' },
      { time: '2026-03-13T11:00:00Z', event: 'Agent provided installation guide' }
    ]
  },
  {
    id: 'HD-2026-0004',
    title: 'WiFi keeps disconnecting every 10 minutes',
    description: 'Office WiFi connection drops randomly every 10-15 minutes. This is affecting my productivity.',
    category: 'Network',
    priority: 'High',
    status: 'Open',
    createdAt: '2026-03-13T07:00:00Z',
    updatedAt: '2026-03-13T07:00:00Z',
    assignedTo: 'Sarah Chen',
    user: 'Emily Brown',
    timeline: [
      { time: '2026-03-13T07:00:00Z', event: 'Ticket created' }
    ]
  },
  {
    id: 'HD-2026-0005',
    title: 'Printer not working - shows offline',
    description: 'The shared printer on floor 3 shows as offline. Already tried restarting it.',
    category: 'Hardware',
    priority: 'Low',
    status: 'Resolved',
    createdAt: '2026-03-10T13:45:00Z',
    updatedAt: '2026-03-11T16:30:00Z',
    assignedTo: 'Mike Johnson',
    user: 'Robert Wilson',
    timeline: [
      { time: '2026-03-10T13:45:00Z', event: 'Ticket created' },
      { time: '2026-03-10T14:00:00Z', event: 'Assigned to Mike Johnson' },
      { time: '2026-03-11T10:00:00Z', event: 'Agent on-site checking printer' },
      { time: '2026-03-11T16:30:00Z', event: 'Resolved: Printer driver updated' }
    ]
  },
  {
    id: 'HD-2026-0006',
    title: 'VPN connection timing out',
    description: 'Cannot connect to company VPN from home. Connection keeps timing out after authentication.',
    category: 'Network',
    priority: 'Medium',
    status: 'In Progress',
    createdAt: '2026-03-12T16:00:00Z',
    updatedAt: '2026-03-13T09:00:00Z',
    assignedTo: 'Alex Rodriguez',
    user: 'Lisa Anderson',
    timeline: [
      { time: '2026-03-12T16:00:00Z', event: 'Ticket created' },
      { time: '2026-03-12T16:15:00Z', event: 'Assigned to Alex Rodriguez' },
      { time: '2026-03-13T09:00:00Z', event: 'Agent requested network logs' }
    ]
  },
  {
    id: 'HD-2026-0007',
    title: 'Request access to HR portal',
    description: 'New employee needing access to the HR portal for benefits enrollment.',
    category: 'Access',
    priority: 'Low',
    status: 'Closed',
    createdAt: '2026-03-08T10:00:00Z',
    updatedAt: '2026-03-09T14:00:00Z',
    assignedTo: 'Mike Johnson',
    user: 'Tom Harris',
    timeline: [
      { time: '2026-03-08T10:00:00Z', event: 'Ticket created' },
      { time: '2026-03-08T10:30:00Z', event: 'Assigned to Mike Johnson' },
      { time: '2026-03-09T11:00:00Z', event: 'Access granted' },
      { time: '2026-03-09T14:00:00Z', event: 'Closed: User confirmed access working' }
    ]
  },
  {
    id: 'HD-2026-0008',
    title: 'Outlook crashing when opening attachments',
    description: 'Microsoft Outlook crashes every time I try to open PDF attachments. This started yesterday.',
    category: 'Software',
    priority: 'High',
    status: 'Open',
    createdAt: '2026-03-13T11:30:00Z',
    updatedAt: '2026-03-13T11:30:00Z',
    assignedTo: 'Sarah Chen',
    user: 'Maria Garcia',
    timeline: [
      { time: '2026-03-13T11:30:00Z', event: 'Ticket created' },
      { time: '2026-03-13T11:35:00Z', event: 'Assigned to Sarah Chen' }
    ]
  }
];

export const AGENTS = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Senior Support Engineer',
    status: 'online',
    activeTickets: 3
  },
  {
    id: 2,
    name: 'Mike Johnson',
    role: 'Support Engineer',
    status: 'online',
    activeTickets: 2
  },
  {
    id: 3,
    name: 'Alex Rodriguez',
    role: 'Support Engineer',
    status: 'busy',
    activeTickets: 5
  },
  {
    id: 4,
    name: 'Emily Brown',
    role: 'Junior Support Engineer',
    status: 'online',
    activeTickets: 1
  }
];

// Helper functions
export const getTicketsByStatus = (tickets, status) => {
  if (status === 'All') return tickets;
  return tickets.filter(ticket => ticket.status === status);
};

export const getTicketCounts = (tickets) => {
  return {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
    closed: tickets.filter(t => t.status === 'Closed').length
  };
};

export const getTicketById = (tickets, id) => {
  return tickets.find(ticket => ticket.id === id);
};

export const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTimeAgo = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
