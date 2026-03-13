/**
 * CHATBOT.JS - Chatbot Flow Logic
 * Manages conversational ticket creation flow
 */

let chatbotState = {
    step: 0,
    ticketData: {
        title: '',
        description: '',
        category: '',
        priority: ''
    },
    messages: []
};

/**
 * Initialize chatbot
 */
function initChatbot() {
    chatbotState = {
        step: 0,
        ticketData: {
            title: '',
            description: '',
            category: '',
            priority: ''
        },
        messages: []
    };
    
    // Send welcome message
    setTimeout(() => {
        addBotMessage('Hi! I\'m HelpDesk AI. What\'s your issue today?');
    }, 300);
}

/**
 * Add bot message to chat
 */
function addBotMessage(text, quickReplies = null) {
    const message = {
        type: 'bot',
        text: text,
        timestamp: new Date().toISOString(),
        quickReplies: quickReplies
    };
    
    chatbotState.messages.push(message);
    renderChatMessage(message);
}

/**
 * Add user message to chat
 */
function addUserMessage(text) {
    const message = {
        type: 'user',
        text: text,
        timestamp: new Date().toISOString()
    };
    
    chatbotState.messages.push(message);
    renderChatMessage(message);
    
    // Scroll to bottom
    scrollChatToBottom();
}

/**
 * Render chat message in UI
 */
function renderChatMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.type}`;
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = `chat-avatar ${message.type}`;
    avatar.innerHTML = message.type === 'bot' ? '🤖' : '👤';
    
    // Bubble
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${message.type}`;
    bubble.textContent = message.text;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    
    messagesContainer.appendChild(messageDiv);
    
    // Add quick replies if present
    if (message.quickReplies) {
        setTimeout(() => {
            renderQuickReplies(message.quickReplies);
        }, 300);
    }
    
    scrollChatToBottom();
}

/**
 * Render quick reply buttons
 */
function renderQuickReplies(replies) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const quickRepliesDiv = document.createElement('div');
    quickRepliesDiv.className = 'quick-replies fade-up';
    
    replies.forEach(reply => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.textContent = reply.text;
        btn.onclick = () => handleQuickReply(reply);
        quickRepliesDiv.appendChild(btn);
    });
    
    messagesContainer.appendChild(quickRepliesDiv);
    scrollChatToBottom();
}

/**
 * Handle quick reply button click
 */
function handleQuickReply(reply) {
    // Remove all quick reply buttons
    document.querySelectorAll('.quick-replies').forEach(el => el.remove());
    
    // Add user message
    addUserMessage(reply.text);
    
    // Process reply
    if (reply.action) {
        reply.action(reply.value);
    }
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot';
    typingDiv.id = 'typingIndicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar bot';
    avatar.innerHTML = '🤖';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(indicator);
    
    messagesContainer.appendChild(typingDiv);
    scrollChatToBottom();
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Process user input based on current step
 */
function processUserInput(input) {
    if (!input.trim()) return;
    
    // Add user message
    addUserMessage(input);
    
    // Clear input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = '';
    }
    
    // Show typing indicator
    showTypingIndicator();
    
    // Process based on step
    setTimeout(() => {
        hideTypingIndicator();
        
        switch (chatbotState.step) {
            case 0:
                // Step 1: Issue description
                chatbotState.ticketData.title = input;
                chatbotState.ticketData.description = input;
                chatbotState.step = 1;
                askCategory();
                break;
                
            default:
                addBotMessage('I\'m not sure I understand. Let me help you create a ticket.');
                break;
        }
    }, 1000);
}

/**
 * Ask for category
 */
function askCategory() {
    const categories = [
        { text: 'Hardware 🖥️', value: 'Hardware', action: selectCategory },
        { text: 'Software 💻', value: 'Software', action: selectCategory },
        { text: 'Network 🌐', value: 'Network', action: selectCategory },
        { text: 'Access 🔐', value: 'Access', action: selectCategory },
        { text: 'Other 📋', value: 'Other', action: selectCategory }
    ];
    
    addBotMessage('Got it! What type of issue is this?', categories);
    updateTicketPreview();
}

/**
 * Select category
 */
function selectCategory(category) {
    chatbotState.ticketData.category = category;
    chatbotState.step = 2;
    
    showTypingIndicator();
    setTimeout(() => {
        hideTypingIndicator();
        askPriority();
        updateTicketPreview();
    }, 800);
}

/**
 * Ask for priority
 */
function askPriority() {
    const priorities = [
        { text: 'Critical 🔴', value: 'Critical', action: selectPriority },
        { text: 'High 🟠', value: 'High', action: selectPriority },
        { text: 'Medium 🟡', value: 'Medium', action: selectPriority },
        { text: 'Low 🟢', value: 'Low', action: selectPriority }
    ];
    
    addBotMessage('How urgent is this issue?', priorities);
}

/**
 * Select priority and create ticket
 */
function selectPriority(priority) {
    chatbotState.ticketData.priority = priority;
    chatbotState.step = 3;
    
    showTypingIndicator();
    setTimeout(() => {
        hideTypingIndicator();
        
        // Create the ticket
        const ticket = createTicket(chatbotState.ticketData);
        
        // Show success message
        const responseTime = priority === 'Critical' ? '30 minutes' : 
                            priority === 'High' ? '2 hours' : 
                            priority === 'Medium' ? '4 hours' : '24 hours';
        
        addBotMessage(
            `Perfect! I've created Ticket ${ticket.id} for you. ` +
            `Our team will respond within ${responseTime}. ` +
            `You can track your ticket status in the "My Tickets" section.`
        );
        
        updateTicketPreview();
        
        // Show view ticket button
        setTimeout(() => {
            showTicketCreatedActions(ticket.id);
        }, 500);
        
    }, 1000);
}

/**
 * Show actions after ticket creation
 */
function showTicketCreatedActions(ticketId) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'chat-message bot';
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar bot';
    avatar.innerHTML = '🤖';
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';
    bubble.innerHTML = `
        <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-primary btn-sm" onclick="viewTicket('${ticketId}')">
                View Ticket
            </button>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('my-tickets')">
                My Tickets
            </button>
        </div>
    `;
    
    actionsDiv.appendChild(avatar);
    actionsDiv.appendChild(bubble);
    
    messagesContainer.appendChild(actionsDiv);
    scrollChatToBottom();
}

/**
 * Update ticket preview panel
 */
function updateTicketPreview() {
    const previewPanel = document.getElementById('ticketPreviewContent');
    if (!previewPanel) return;
    
    const { title, category, priority } = chatbotState.ticketData;
    
    previewPanel.innerHTML = `
        <div class="preview-section">
            <div class="preview-label">Ticket ID</div>
            <div class="preview-value" style="font-family: var(--font-mono); color: var(--color-purple);">
                ${chatbotState.step >= 3 ? generateTicketId() : 'Pending...'}
            </div>
        </div>
        
        <div class="preview-section">
            <div class="preview-label">Title</div>
            <div class="preview-value">
                ${title || 'Not specified yet'}
            </div>
        </div>
        
        <div class="preview-section">
            <div class="preview-label">Category</div>
            <div class="preview-value">
                ${category ? `<span class="badge badge-medium">${getCategoryIcon(category)} ${category}</span>` : 'Not selected'}
            </div>
        </div>
        
        <div class="preview-section">
            <div class="preview-label">Priority</div>
            <div class="preview-value">
                ${priority ? `<span class="badge ${getPriorityClass(priority)}">${priority}</span>` : 'Not selected'}
            </div>
        </div>
        
        <div class="preview-section">
            <div class="preview-label">Status</div>
            <div class="preview-value">
                ${chatbotState.step >= 3 ? 
                    '<span class="status-indicator"><span class="status-dot open"></span> Open</span>' : 
                    'Creating...'}
            </div>
        </div>
    `;
}

/**
 * Scroll chat to bottom
 */
function scrollChatToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}

/**
 * Reset chatbot
 */
function resetChatbot() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    
    initChatbot();
    updateTicketPreview();
}

/**
 * View created ticket
 */
function viewTicket(ticketId) {
    const ticket = getTicketById(ticketId);
    if (ticket) {
        showTicketDetail(ticket);
    }
}
