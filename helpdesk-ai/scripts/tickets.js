/**
 * TICKETS.JS - Mock Ticket Data & CRUD Operations
 * Manages ticket storage and retrieval using localStorage
 */

// Mock Ticket Data
const MOCK_TICKETS = [
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

/**
 * Initialize tickets in localStorage
 */
function initTickets() {
    if (!localStorage.getItem('tickets')) {
        localStorage.setItem('tickets', JSON.stringify(MOCK_TICKETS));
    }
}

/**
 * Get all tickets from localStorage
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: GET /api/tickets
 */
function getAllTickets() {
    const tickets = localStorage.getItem('tickets');
    return tickets ? JSON.parse(tickets) : MOCK_TICKETS;
}

/**
 * Get ticket by ID
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: GET /api/tickets/:id
 */
function getTicketById(id) {
    const tickets = getAllTickets();
    return tickets.find(ticket => ticket.id === id);
}

/**
 * Filter tickets by status
 */
function filterTicketsByStatus(status) {
    const tickets = getAllTickets();
    if (status === 'All') return tickets;
    return tickets.filter(ticket => ticket.status === status);
}

/**
 * Create new ticket
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: POST /api/tickets
 */
function createTicket(ticketData) {
    const tickets = getAllTickets();
    const newTicket = {
        id: generateTicketId(),
        title: ticketData.title || 'Untitled Issue',
        description: ticketData.description || '',
        category: ticketData.category || 'Other',
        priority: ticketData.priority || 'Medium',
        status: 'Open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTo: assignAgent(),
        user: getCurrentUser(),
        timeline: [
            { time: new Date().toISOString(), event: 'Ticket created' }
        ]
    };
    
    tickets.unshift(newTicket);
    localStorage.setItem('tickets', JSON.stringify(tickets));
    return newTicket;
}

/**
 * Update ticket
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: PUT /api/tickets/:id
 */
function updateTicket(id, updates) {
    const tickets = getAllTickets();
    const index = tickets.findIndex(ticket => ticket.id === id);
    
    if (index !== -1) {
        tickets[index] = {
            ...tickets[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('tickets', JSON.stringify(tickets));
        return tickets[index];
    }
    return null;
}

/**
 * Close ticket
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: PATCH /api/tickets/:id/close
 */
function closeTicket(id) {
    return updateTicket(id, { 
        status: 'Closed',
        timeline: [
            ...getTicketById(id).timeline,
            { time: new Date().toISOString(), event: 'Ticket closed by user' }
        ]
    });
}

/**
 * Add comment to ticket
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: POST /api/tickets/:id/comments
 */
function addComment(id, comment) {
    const ticket = getTicketById(id);
    if (ticket) {
        ticket.timeline.push({
            time: new Date().toISOString(),
            event: `Comment added: ${comment}`
        });
        return updateTicket(id, { timeline: ticket.timeline });
    }
    return null;
}

/**
 * Generate unique ticket ID
 */
function generateTicketId() {
    const year = new Date().getFullYear();
    const tickets = getAllTickets();
    const maxId = tickets.reduce((max, ticket) => {
        const num = parseInt(ticket.id.split('-')[2]);
        return num > max ? num : max;
    }, 0);
    
    const newNum = String(maxId + 1).padStart(4, '0');
    return `HD-${year}-${newNum}`;
}

/**
 * Assign agent (mock random assignment)
 */
function assignAgent() {
    const agents = ['Sarah Chen', 'Mike Johnson', 'Alex Rodriguez', 'Emily Brown'];
    return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Get current user (mock)
 */
function getCurrentUser() {
    return localStorage.getItem('userName') || 'User';
}

/**
 * Get priority color class
 */
function getPriorityClass(priority) {
    const classes = {
        'Critical': 'badge-critical',
        'High': 'badge-high',
        'Medium': 'badge-medium',
        'Low': 'badge-low'
    };
    return classes[priority] || 'badge-medium';
}

/**
 * Get status color class
 */
function getStatusClass(status) {
    const classes = {
        'Open': 'badge-open',
        'In Progress': 'badge-in-progress',
        'Resolved': 'badge-resolved',
        'Closed': 'badge-closed'
    };
    return classes[status] || 'badge-open';
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
    const icons = {
        'Hardware': '🖥️',
        'Software': '💻',
        'Network': '🌐',
        'Access': '🔐',
        'Other': '📋'
    };
    return icons[category] || '📋';
}

/**
 * Format date/time
 */
function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get time ago string
 */
function getTimeAgo(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Initialize tickets when script loads
initTickets();
