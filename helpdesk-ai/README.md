# 🤖 HelpDesk AI - Chatbot-Based IT Ticketing System

A complete, production-ready frontend for an intelligent IT ticketing system featuring conversational ticket creation, real-time tracking, and comprehensive admin dashboard.

## 🌟 Features

### 🔐 Authentication
- **Email + OTP Login**: Secure 2-step verification with countdown timer
- 6-digit OTP input with auto-focus and paste support
- Timer with urgent state indicator (<30s remaining)
- Mock OTP: `123456` for testing

### 💬 AI Chatbot Interface
- Conversational ticket creation flow
- Quick-reply buttons for category and priority selection
- Real-time ticket preview panel
- Typing indicators and smooth animations
- Categories: Hardware, Software, Network, Access, Other
- Priority levels: Critical, High, Medium, Low

### 📋 My Tickets Dashboard
- Filter by status: All, Open, In Progress, Resolved, Closed
- Responsive grid layout with animated cards
- Ticket cards show: ID, title, category, priority, status, timestamps
- **8 pre-loaded mock tickets** for testing
- Click any ticket to view full details

### 🔍 Ticket Detail Modal
- Complete ticket information and timeline
- Activity log with timestamps
- Add comments functionality
- Close ticket action
- Elevated risk badge for critical tickets
- Assigned agent information

### 📊 Admin Dashboard
- **Statistics Cards**: Total tickets, open tickets, resolved today, avg response time
- **Bar Chart**: Tickets by category (pure CSS implementation)
- **Recent Tickets Table**: Last 5 tickets with actions
- **Active Agents Panel**: 4 mock agents with online/busy status indicators
- Real-time status dots with blink animation

### 🎨 Design System
- **Background**: Deep purple (`#0d0117`) with animated grid pattern
- **Cards**: Glassmorphism with shimmer effect
- **Typography**: Inter (body) + JetBrains Mono (code/data)
- **Animations**: 15+ custom keyframe animations
- **Accessibility**: ARIA labels, keyboard navigation, reduced motion support

## 📁 Project Structure

```
helpdesk-ai/
├── index.html                 # Main HTML entry point
├── styles/
│   ├── main.css              # Variables, reset, typography, layout
│   ├── animations.css        # All keyframe animations
│   ├── components.css        # Cards, buttons, badges, inputs
│   └── pages.css             # Page-specific styles
├── scripts/
│   ├── app.js                # Main router & controller
│   ├── chatbot.js            # Chatbot flow logic
│   ├── tickets.js            # Mock ticket data & CRUD
│   ├── otp.js                # OTP input logic & timer
│   └── admin.js              # Admin dashboard logic
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Modern web browser

### Installation

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Navigate to `http://localhost:5173` (or the port shown in terminal)

### Testing Credentials

- **Email**: Any valid email format (e.g., `test@company.com`)
- **OTP**: `123456`
- **Error OTP** (for testing shake animation): `000000`

## 🎯 Usage Guide

### 1. Login Flow
1. Open the application
2. Enter any email address
3. Click "Send OTP"
4. Enter OTP: `123456`
5. Click "Verify OTP"

### 2. Creating a Ticket (Chatbot)
1. Click "Raise a Ticket" from navigation or hero page
2. Chat with the AI:
   - Describe your issue
   - Select category (Hardware, Software, Network, Access, Other)
   - Select priority (Critical, High, Medium, Low)
3. Ticket is auto-created with ID like `HD-2026-0042`
4. View ticket or navigate to "My Tickets"

### 3. Viewing Tickets
1. Go to "My Tickets"
2. Use filter tabs to sort by status
3. Click any ticket card to view full details
4. In detail modal:
   - View complete information
   - See activity timeline
   - Add comments
   - Close ticket

### 4. Admin Dashboard
1. Click "Admin" in navigation
2. View statistics and trends
3. See tickets by category chart
4. Monitor recent tickets table
5. Check active agents status

## 🎨 Design Highlights

### Color Palette
- Background: `#0d0117`
- Purple Accent: `#a855f7`
- Success: `#10b981`
- Error: `#ef4444`
- Warning: `#fbbf24`

### Animations
- **cardEnter**: Cards slide up on load (0.55s)
- **shimmer**: Diagonal light sweep (7s loop)
- **gridDrift**: Background grid animation (28s loop)
- **blink**: Status dots pulse (1.4s loop)
- **timerBlink**: Urgent timer warning (1s loop)
- **shake**: Error state shake (0.42s)
- **fadeUp**: Content fade in (0.38s)
- **typingBounce**: Chat typing indicator

### Responsive Breakpoints
- Desktop: 1440px
- Tablet: 768px
- Mobile: 375px

## 🔌 Backend Integration Points

All backend integration points are marked with comments:
```javascript
<!-- BACKEND INTEGRATION POINT -->
Replace with: GET /api/endpoint
```

### API Endpoints to Implement

**Authentication**
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/resend-otp` - Resend OTP

**Tickets**
- `GET /api/tickets` - Get all tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `PATCH /api/tickets/:id/close` - Close ticket
- `POST /api/tickets/:id/comments` - Add comment

**Admin**
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/tickets-by-category` - Category breakdown
- `GET /api/admin/recent-tickets` - Recent tickets
- `GET /api/admin/agents` - Agent status list
- `PATCH /api/tickets/:id/assign` - Assign ticket to agent

## 💾 Local Storage

Application uses localStorage for:
- `isLoggedIn`: Authentication state
- `userEmail`: User email address
- `userName`: User display name
- `tickets`: Mock ticket data (persists across sessions)

## 🛠️ Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Custom properties, Grid, Flexbox, animations
- **Vanilla JavaScript**: ES6+, no frameworks
- **Google Fonts**: Inter, JetBrains Mono
- **Vite**: Development server & build tool

## 📦 Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready for deployment.

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## ♿ Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Focus states on all inputs
- Reduced motion support (`prefers-reduced-motion`)
- Semantic HTML structure
- Color contrast compliance

## 📝 Notes

- All data is mock/simulated - no real backend calls
- OTP timer is 2:00 minutes with urgent state at <30s
- Tickets persist in localStorage between sessions
- 8 pre-loaded tickets available for testing
- Proper error states with shake animation

## 🎯 Future Enhancements

- Real-time notifications
- File attachments
- Voice input for chatbot
- Multi-language support
- Dark/Light theme toggle
- Email notifications
- Advanced search & filters
- Export tickets to PDF/CSV

## 📄 License

This project is created for demonstration purposes.

---

**Built with ❤️ using Vanilla JavaScript • No frameworks, just pure code**

© 2026 HelpDesk AI · Smart IT Support, Instantly
