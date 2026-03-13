/**
 * ADMIN.JS - Admin Dashboard Logic
 * Manages admin statistics, charts, and agent monitoring
 */

/**
 * Get dashboard statistics
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: GET /api/admin/stats
 */
function getDashboardStats() {
    const tickets = getAllTickets();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'Open').length,
        resolvedToday: tickets.filter(t => {
            const updated = new Date(t.updatedAt);
            updated.setHours(0, 0, 0, 0);
            return t.status === 'Resolved' && updated.getTime() === today.getTime();
        }).length,
        avgResponseTime: '2.5h' // Mock data
    };
    
    // Calculate trends (mock)
    stats.totalTrend = 'up';
    stats.openTrend = 'down';
    stats.resolvedTrend = 'up';
    stats.responseTrend = 'down';
    
    return stats;
}

/**
 * Get tickets by category for chart
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: GET /api/admin/tickets-by-category
 */
function getTicketsByCategory() {
    const tickets = getAllTickets();
    const categories = {
        'Hardware': 0,
        'Software': 0,
        'Network': 0,
        'Access': 0,
        'Other': 0
    };
    
    tickets.forEach(ticket => {
        if (categories.hasOwnProperty(ticket.category)) {
            categories[ticket.category]++;
        }
    });
    
    return categories;
}

/**
 * Get recent tickets for admin table
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: GET /api/admin/recent-tickets?limit=5
 */
function getRecentTickets(limit = 5) {
    const tickets = getAllTickets();
    return tickets
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
}

/**
 * Get agents status
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: GET /api/admin/agents
 */
function getAgentsStatus() {
    return [
        {
            name: 'Sarah Chen',
            role: 'Senior Support Engineer',
            status: 'online',
            activeTickets: 3
        },
        {
            name: 'Mike Johnson',
            role: 'Support Engineer',
            status: 'online',
            activeTickets: 2
        },
        {
            name: 'Alex Rodriguez',
            role: 'Support Engineer',
            status: 'busy',
            activeTickets: 5
        },
        {
            name: 'Emily Brown',
            role: 'Junior Support Engineer',
            status: 'online',
            activeTickets: 1
        }
    ];
}

/**
 * Render admin dashboard
 */
function renderAdminDashboard() {
    const stats = getDashboardStats();
    const categoryData = getTicketsByCategory();
    const recentTickets = getRecentTickets(5);
    const agents = getAgentsStatus();
    
    return `
        <div class="admin-page">
            <div class="page-header">
                <h1 class="page-title">Admin Dashboard</h1>
            </div>
            
            <!-- Stats Row -->
            <div class="stats-row">
                <div class="card stat-card shimmer card-enter">
                    <div class="stat-value">
                        ${stats.total}
                        <span class="stat-trend ${stats.totalTrend}">
                            ${stats.totalTrend === 'up' ? '↑' : '↓'}
                        </span>
                    </div>
                    <div class="stat-label">Total Tickets</div>
                    <div class="stat-subtitle">All time</div>
                </div>
                
                <div class="card stat-card shimmer card-enter animation-delay-1">
                    <div class="stat-value" style="color: var(--color-success);">
                        ${stats.open}
                        <span class="stat-trend ${stats.openTrend}">
                            ${stats.openTrend === 'up' ? '↑' : '↓'}
                        </span>
                    </div>
                    <div class="stat-label">Open Tickets</div>
                    <div class="stat-subtitle">Pending resolution</div>
                </div>
                
                <div class="card stat-card shimmer card-enter animation-delay-2">
                    <div class="stat-value" style="color: var(--color-purple);">
                        ${stats.resolvedToday}
                        <span class="stat-trend ${stats.resolvedTrend}">
                            ${stats.resolvedTrend === 'up' ? '↑' : '↓'}
                        </span>
                    </div>
                    <div class="stat-label">Resolved Today</div>
                    <div class="stat-subtitle">Last 24 hours</div>
                </div>
                
                <div class="card stat-card shimmer card-enter animation-delay-3">
                    <div class="stat-value" style="color: var(--color-warning);">
                        ${stats.avgResponseTime}
                        <span class="stat-trend ${stats.responseTrend}">
                            ${stats.responseTrend === 'up' ? '↑' : '↓'}
                        </span>
                    </div>
                    <div class="stat-label">Avg Response Time</div>
                    <div class="stat-subtitle">Current week</div>
                </div>
            </div>
            
            <!-- Chart Section -->
            <div class="chart-section">
                <div class="card chart-container shimmer card-enter animation-delay-4">
                    <h3>Tickets by Category</h3>
                    <div class="bar-chart" id="categoryChart">
                        ${renderBarChart(categoryData)}
                    </div>
                </div>
            </div>
            
            <!-- Recent Tickets Table -->
            <div class="table-section">
                <div class="card shimmer card-enter animation-delay-5">
                    <h3 style="margin-bottom: var(--spacing-lg);">Recent Tickets</h3>
                    <div style="overflow-x: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Ticket ID</th>
                                    <th>Title</th>
                                    <th>User</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentTickets.map(ticket => `
                                    <tr>
                                        <td>
                                            <span style="font-family: var(--font-mono); color: var(--color-purple); font-weight: 600;">
                                                ${ticket.id}
                                            </span>
                                        </td>
                                        <td>${truncateText(ticket.title, 40)}</td>
                                        <td>${ticket.user}</td>
                                        <td>
                                            <span class="badge ${getPriorityClass(ticket.priority)}">
                                                ${ticket.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${getStatusClass(ticket.status)}">
                                                ${ticket.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="viewTicket('${ticket.id}')">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Agents Panel -->
            <div class="agents-panel card shimmer card-enter animation-delay-6">
                <h3 style="margin-bottom: var(--spacing-lg);">Active Agents</h3>
                <div class="agent-list">
                    ${agents.map(agent => `
                        <div class="agent-item">
                            <div class="agent-status ${agent.status}"></div>
                            <div class="agent-info">
                                <div class="agent-name">${agent.name}</div>
                                <div class="agent-role">${agent.role} • ${agent.activeTickets} active tickets</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render bar chart (CSS-based)
 */
function renderBarChart(data) {
    const maxValue = Math.max(...Object.values(data));
    
    return Object.entries(data).map(([category, count]) => {
        const height = maxValue > 0 ? (count / maxValue) * 100 : 0;
        
        return `
            <div class="chart-bar">
                <div class="bar-fill" style="height: ${height}%;">
                    <div class="bar-value">${count}</div>
                </div>
                <div class="bar-label">${category}</div>
            </div>
        `;
    }).join('');
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Assign ticket to agent
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: PATCH /api/tickets/:id/assign
 * Body: { agentId }
 */
function assignTicketToAgent(ticketId, agentName) {
    return updateTicket(ticketId, {
        assignedTo: agentName,
        timeline: [
            ...getTicketById(ticketId).timeline,
            { time: new Date().toISOString(), event: `Assigned to ${agentName}` }
        ]
    });
}

/**
 * Get admin analytics
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: GET /api/admin/analytics
 */
function getAdminAnalytics() {
    const tickets = getAllTickets();
    
    return {
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'Open').length,
        inProgressTickets: tickets.filter(t => t.status === 'In Progress').length,
        resolvedTickets: tickets.filter(t => t.status === 'Resolved').length,
        closedTickets: tickets.filter(t => t.status === 'Closed').length,
        byPriority: {
            critical: tickets.filter(t => t.priority === 'Critical').length,
            high: tickets.filter(t => t.priority === 'High').length,
            medium: tickets.filter(t => t.priority === 'Medium').length,
            low: tickets.filter(t => t.priority === 'Low').length
        },
        byCategory: getTicketsByCategory()
    };
}
