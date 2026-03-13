/**
 * APP.JS - Main Application Router & Controller
 * Handles view switching, navigation, and app initialization
 */

let currentPage = 'home';
let currentFilter = 'All';

/**
 * Initialize the application
 */
function initApp() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        navigateTo('login');
    } else {
        // Update user avatar
        const userInfo = getUserInfo();
        const initials = userInfo.name.slice(0, 2).toUpperCase();
        document.querySelectorAll('.user-avatar span').forEach(el => {
            el.textContent = initials;
        });
        
        navigateTo('home');
    }
    
    // Setup event listeners
    setupEventListeners();
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            if (page) {
                e.preventDefault();
                navigateTo(page);
                closeMobileMenu();
            }
        });
    });
    
    // User menu dropdown
    const userAvatar = document.getElementById('userAvatar');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    if (userAvatar && dropdownMenu) {
        userAvatar.addEventListener('click', () => {
            dropdownMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userAvatar.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('active');
            }
        });
    }
    
    // Logout buttons
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('mobileLogout')?.addEventListener('click', handleLogout);
    
    // Hamburger menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    
    if (hamburgerBtn && mobileDrawer) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            mobileDrawer.classList.toggle('active');
        });
    }
    
    // Modal close
    const modalClose = document.getElementById('modalClose');
    const modalOverlay = document.getElementById('ticketModal');
    
    if (modalClose && modalOverlay) {
        modalClose.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }
}

/**
 * Navigate to a page
 */
function navigateTo(page) {
    // Check if login required
    if (!isLoggedIn() && page !== 'login') {
        page = 'login';
    }
    
    currentPage = page;
    
    // Update active nav link
    document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
    
    // Hide navbar for login page
    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.style.display = page === 'login' ? 'none' : 'fixed';
    }
    
    // Render page
    renderPage(page);
    
    // Update URL hash
    window.location.hash = page;
}

/**
 * Render page content
 */
function renderPage(page) {
    const app = document.getElementById('app');
    if (!app) return;
    
    let content = '';
    
    switch (page) {
        case 'home':
            content = renderHomePage();
            break;
        case 'login':
            content = renderLoginPage();
            break;
        case 'raise-ticket':
            content = renderChatbotPage();
            break;
        case 'my-tickets':
            content = renderMyTicketsPage();
            break;
        case 'admin':
            content = renderAdminDashboard();
            break;
        default:
            content = renderHomePage();
    }
    
    app.innerHTML = content;
    
    // Page-specific initialization
    initializePage(page);
}

/**
 * Initialize page-specific functionality
 */
function initializePage(page) {
    switch (page) {
        case 'login':
            initLoginPage();
            break;
        case 'raise-ticket':
            initChatbotPage();
            break;
        case 'my-tickets':
            initTicketsPage();
            break;
    }
}

/**
 * Render Home Page
 */
function renderHomePage() {
    return `
        <div class="hero-page">
            <div class="hero-content">
                <div class="hero-logo">🤖</div>
                <h1 class="hero-title">HelpDesk AI</h1>
                <p class="hero-tagline">Smart IT Support, Instantly.</p>
                
                <div class="hero-cta">
                    <button class="btn btn-primary btn-lg" onclick="navigateTo('raise-ticket')">
                        Raise a Ticket
                    </button>
                    <button class="btn btn-secondary btn-lg" onclick="navigateTo('my-tickets')">
                        Track My Ticket
                    </button>
                </div>
            </div>
            
            <div class="hero-preview glass-card shimmer">
                <div class="chat-preview">
                    <h3 style="margin-bottom: var(--spacing-md);">Quick Support</h3>
                    <div class="chat-preview-message">
                        <span>🤖</span>
                        <span>Hi! I'm HelpDesk AI. What's your issue today?</span>
                    </div>
                    <div class="chat-preview-message" style="justify-content: flex-end;">
                        <span>My laptop won't start</span>
                        <span>👤</span>
                    </div>
                    <div class="chat-preview-message">
                        <span>🤖</span>
                        <span>I'll help you with that. Creating a ticket...</span>
                    </div>
                </div>
            </div>
            
            <div class="hero-footer">
                © 2026 HelpDesk AI · Built for Fast IT Resolution
            </div>
        </div>
    `;
}

/**
 * Render Login Page
 */
function renderLoginPage() {
    return `
        <div class="login-page">
            <div class="glass-card login-card shimmer card-enter">
                <div class="step-indicator" id="stepIndicator">
                    <div class="step active" id="step1Indicator">
                        <div class="step-number">1</div>
                        <span>Email</span>
                    </div>
                    <div class="step-arrow">→</div>
                    <div class="step" id="step2Indicator">
                        <div class="step-number">2</div>
                        <span>Verify</span>
                    </div>
                </div>
                
                <h2 class="login-title" id="loginTitle">Welcome Back</h2>
                
                <!-- Step 1: Email Input -->
                <div id="step1Content">
                    <div class="input-group">
                        <label class="input-label" for="emailInput">Email Address</label>
                        <input 
                            type="email" 
                            id="emailInput" 
                            class="input" 
                            placeholder="you@company.com"
                            autocomplete="email"
                        />
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn btn-primary" id="sendOTPBtn" onclick="handleSendOTP()">
                            Send OTP
                        </button>
                    </div>
                </div>
                
                <!-- Step 2: OTP Verification (Hidden initially) -->
                <div id="step2Content" class="hidden">
                    <p style="text-align: center; margin-bottom: var(--spacing-lg); color: rgba(255,255,255,0.7);">
                        Enter the 6-digit code sent to <span id="emailDisplay" style="color: var(--color-purple);"></span>
                    </p>
                    
                    <div class="otp-container">
                        <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" />
                        <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" />
                        <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" />
                        <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" />
                        <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" />
                        <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" />
                    </div>
                    
                    <div class="timer-display" id="otpTimer">2:00</div>
                    
                    <div class="form-actions">
                        <button class="btn btn-primary" id="verifyOTPBtn" onclick="handleVerifyOTP()">
                            Verify OTP
                        </button>
                    </div>
                    
                    <a class="resend-link" id="resendOTPLink" onclick="handleResendOTP()">
                        Didn't receive code? Resend OTP
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Chatbot Page
 */
function renderChatbotPage() {
    return `
        <div class="chatbot-page">
            <div class="chat-window">
                <div class="chat-header">
                    <h3>💬 Chat with HelpDesk AI</h3>
                </div>
                
                <div class="chat-messages" id="chatMessages"></div>
                
                <div class="chat-input-area">
                    <div class="chat-input-container">
                        <input 
                            type="text" 
                            class="chat-input" 
                            id="chatInput" 
                            placeholder="Type your message..."
                            autocomplete="off"
                        />
                        <button class="send-btn" id="sendBtn" onclick="handleChatSend()">
                            ✈️
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="ticket-preview-panel">
                <h3 style="margin-bottom: var(--spacing-lg);">📋 Ticket Preview</h3>
                <div id="ticketPreviewContent">
                    <div style="text-align: center; color: rgba(255,255,255,0.5); padding: var(--spacing-xl);">
                        Start chatting to create a ticket
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render My Tickets Page
 */
function renderMyTicketsPage() {
    const tickets = filterTicketsByStatus(currentFilter);
    
    return `
        <div class="tickets-page">
            <div class="page-header">
                <h1 class="page-title">My Tickets</h1>
                <button class="btn btn-primary" onclick="navigateTo('raise-ticket')">
                    + New Ticket
                </button>
            </div>
            
            <!-- Filter Tabs -->
            <div class="tabs">
                <button class="tab ${currentFilter === 'All' ? 'active' : ''}" onclick="filterTickets('All')">All</button>
                <button class="tab ${currentFilter === 'Open' ? 'active' : ''}" onclick="filterTickets('Open')">Open</button>
                <button class="tab ${currentFilter === 'In Progress' ? 'active' : ''}" onclick="filterTickets('In Progress')">In Progress</button>
                <button class="tab ${currentFilter === 'Resolved' ? 'active' : ''}" onclick="filterTickets('Resolved')">Resolved</button>
                <button class="tab ${currentFilter === 'Closed' ? 'active' : ''}" onclick="filterTickets('Closed')">Closed</button>
            </div>
            
            <!-- Tickets Grid -->
            <div class="tickets-grid" id="ticketsGrid">
                ${renderTicketsGrid(tickets)}
            </div>
        </div>
    `;
}

/**
 * Render tickets grid
 */
function renderTicketsGrid(tickets) {
    if (tickets.length === 0) {
        return `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-3xl); color: rgba(255,255,255,0.5);">
                <div style="font-size: 3rem; margin-bottom: var(--spacing-md);">📭</div>
                <h3>No tickets found</h3>
                <p>Try adjusting your filter or create a new ticket</p>
            </div>
        `;
    }
    
    return tickets.map((ticket, index) => `
        <div class="card ticket-card shimmer card-enter" 
             style="animation-delay: ${index * 0.05}s;"
             onclick="showTicketDetail(${JSON.stringify(ticket).replace(/"/g, '&quot;')})">
            <div class="ticket-header">
                <div>
                    <div class="ticket-id">${ticket.id}</div>
                    <div class="ticket-title">${ticket.title}</div>
                </div>
                ${ticket.priority === 'Critical' ? 
                    '<span class="badge badge-elevated-risk">⚠️ Elevated Risk</span>' : ''}
            </div>
            
            <div class="ticket-meta">
                <span class="badge badge-medium">${getCategoryIcon(ticket.category)} ${ticket.category}</span>
                <span class="badge ${getPriorityClass(ticket.priority)}">${ticket.priority}</span>
                <span class="badge ${getStatusClass(ticket.status)}">${ticket.status}</span>
            </div>
            
            <div class="ticket-footer">
                <span>Created ${getTimeAgo(ticket.createdAt)}</span>
                <span class="status-indicator">
                    <span class="status-dot ${ticket.status.toLowerCase().replace(' ', '-')}"></span>
                    ${ticket.status}
                </span>
            </div>
        </div>
    `).join('');
}

/**
 * Show ticket detail modal
 */
function showTicketDetail(ticket) {
    const modal = document.getElementById('ticketModal');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalContent) return;
    
    modalContent.innerHTML = `
        <div class="ticket-detail-header">
            <div class="ticket-detail-id">${ticket.id}</div>
            <h2 class="ticket-detail-title">${ticket.title}</h2>
            <div class="ticket-detail-meta">
                <span class="badge badge-medium">${getCategoryIcon(ticket.category)} ${ticket.category}</span>
                <span class="badge ${getPriorityClass(ticket.priority)}">${ticket.priority}</span>
                <span class="badge ${getStatusClass(ticket.status)}">${ticket.status}</span>
                ${ticket.priority === 'Critical' ? 
                    '<span class="badge badge-elevated-risk">⚠️ Elevated Risk</span>' : ''}
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Description</h4>
            <p>${ticket.description}</p>
        </div>
        
        <div class="detail-section">
            <h4>Ticket Information</h4>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Created</div>
                    <div class="info-value">${formatDateTime(ticket.createdAt)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Last Updated</div>
                    <div class="info-value">${formatDateTime(ticket.updatedAt)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Assigned To</div>
                    <div class="info-value">${ticket.assignedTo}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Reported By</div>
                    <div class="info-value">${ticket.user}</div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Activity Timeline</h4>
            <div class="timeline">
                ${ticket.timeline.map(item => `
                    <div class="timeline-item">
                        <div class="timeline-time">${formatDateTime(item.time)}</div>
                        <div class="timeline-content">${item.event}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Add Comment</h4>
            <textarea 
                class="input textarea" 
                id="commentInput" 
                placeholder="Type your comment here..."
            ></textarea>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="handleAddComment('${ticket.id}')">
                💬 Add Comment
            </button>
            ${ticket.status !== 'Closed' ? 
                `<button class="btn btn-danger" onclick="handleCloseTicket('${ticket.id}')">
                    🔒 Close Ticket
                </button>` : ''}
        </div>
    `;
    
    modal.classList.add('active');
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Filter tickets
 */
function filterTickets(status) {
    currentFilter = status;
    renderPage('my-tickets');
}

/**
 * Close mobile menu
 */
function closeMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    
    if (hamburgerBtn) hamburgerBtn.classList.remove('active');
    if (mobileDrawer) mobileDrawer.classList.remove('active');
}

/**
 * Handle logout
 */
function handleLogout(e) {
    e.preventDefault();
    logout();
    navigateTo('login');
    closeMobileMenu();
}

/**
 * Initialize login page
 */
function initLoginPage() {
    // Setup email input enter key
    const emailInput = document.getElementById('emailInput');
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendOTP();
            }
        });
        emailInput.focus();
    }
}

/**
 * Handle send OTP
 */
async function handleSendOTP() {
    const emailInput = document.getElementById('emailInput');
    const sendBtn = document.getElementById('sendOTPBtn');
    
    if (!emailInput || !sendBtn) return;
    
    const email = emailInput.value.trim();
    
    if (!email) {
        emailInput.classList.add('error');
        return;
    }
    
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    try {
        await sendOTP(email);
        
        // Show step 2
        document.getElementById('step1Content').classList.add('hidden');
        document.getElementById('step2Content').classList.remove('hidden');
        document.getElementById('step2Content').classList.add('fade-up');
        
        // Update step indicator
        document.getElementById('step1Indicator').classList.remove('active');
        document.getElementById('step2Indicator').classList.add('active');
        
        // Update title
        document.getElementById('loginTitle').textContent = 'Verify Your Email';
        document.getElementById('emailDisplay').textContent = email;
        
        // Initialize OTP inputs
        initOTPInputs();
        
        // Start timer
        startOTPTimer(120);
        
    } catch (error) {
        alert(error.message || 'Failed to send OTP');
        emailInput.classList.add('error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send OTP';
    }
}

/**
 * Handle verify OTP
 */
async function handleVerifyOTP() {
    const otp = getOTPValue();
    const verifyBtn = document.getElementById('verifyOTPBtn');
    
    if (otp.length !== 6) {
        showOTPError();
        return;
    }
    
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    
    try {
        await verifyOTP(otp);
        
        // Success
        const email = localStorage.getItem('userEmail');
        handleSuccessfulLogin(email);
        stopOTPTimer();
        
        // Navigate to home
        navigateTo('home');
        
    } catch (error) {
        showOTPError();
        clearOTP();
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify OTP';
    }
}

/**
 * Handle resend OTP
 */
async function handleResendOTP() {
    const email = localStorage.getItem('userEmail');
    
    try {
        await resendOTP(email);
        alert('OTP resent successfully!');
    } catch (error) {
        alert('Failed to resend OTP');
    }
}

/**
 * Initialize chatbot page
 */
function initChatbotPage() {
    // Setup chat input enter key
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleChatSend();
            }
        });
        chatInput.focus();
    }
    
    // Initialize chatbot
    initChatbot();
}

/**
 * Handle chat send
 */
function handleChatSend() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    const message = chatInput.value.trim();
    if (message) {
        processUserInput(message);
    }
}

/**
 * Initialize tickets page
 */
function initTicketsPage() {
    // Page is rendered, no additional initialization needed
}

/**
 * Handle add comment
 */
function handleAddComment(ticketId) {
    const commentInput = document.getElementById('commentInput');
    if (!commentInput) return;
    
    const comment = commentInput.value.trim();
    if (!comment) return;
    
    addComment(ticketId, comment);
    alert('Comment added successfully!');
    
    // Refresh modal
    const ticket = getTicketById(ticketId);
    closeModal();
    setTimeout(() => showTicketDetail(ticket), 100);
}

/**
 * Handle close ticket
 */
function handleCloseTicket(ticketId) {
    if (confirm('Are you sure you want to close this ticket?')) {
        closeTicket(ticketId);
        alert('Ticket closed successfully!');
        closeModal();
        
        // Refresh page if on tickets page
        if (currentPage === 'my-tickets') {
            renderPage('my-tickets');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Handle browser back/forward
window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1) || 'home';
    if (page !== currentPage) {
        navigateTo(page);
    }
});
