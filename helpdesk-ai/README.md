# HiTicket — IT Helpdesk Platform

A full-stack IT ticketing and helpdesk platform with AI-assisted triage, real-time analytics, and enterprise-grade security. Built for internal IT teams to manage, resolve, and track support requests efficiently.

**Frontend:** [helpdeskai-five.vercel.app](https://helpdeskai-five.vercel.app)  
**Backend API:** Hosted on Render

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT, bcryptjs, TOTP (speakeasy), Email OTP |
| Email | Nodemailer + Gmail API (OAuth2) |
| File Storage | Cloudinary |
| Security | Helmet, express-rate-limit, express-mongo-sanitize |
| Deployment | Vercel (frontend), Render (backend) |

---

## Core Features

### Authentication & Security
- JWT-based session management with secure HttpOnly tokens
- Two-factor authentication — supports both **TOTP** (authenticator app) and **Email OTP**
- QR code enrollment for TOTP setup
- Rate limiting on all auth endpoints
- Input sanitization against NoSQL injection (mongo-sanitize)
- HTTP security headers via Helmet

### Ticket Management
- Create, update, close, and track support tickets
- **Priority levels:** Critical, High, Medium, Low — with SLA badge tracking
- **Statuses:** Open → In Progress → Resolved → Closed
- **Categories:** Hardware, Software, Network, Access, Other
- AI-assisted chatbot interface for conversational ticket creation
- Bulk ticket actions for admins
- Ticket comments with Markdown support
- CSAT (Customer Satisfaction) rating on ticket resolution
- Email notifications on ticket events via Gmail API

### Admin Dashboard
- Live KPI cards with trend indicators
- 30-day ticket volume line chart
- Tickets-by-category breakdown
- Agent leaderboard (tickets resolved)
- Full user management — create, edit, deactivate accounts, assign roles
- Agent assignment to tickets

### User Roles
| Role | Capabilities |
|---|---|
| **User** | Raise tickets, track own tickets, chat with bot, view profile |
| **Agent** | All user capabilities + work assigned tickets, add internal notes |
| **Admin** | All agent capabilities + user management, analytics, bulk actions |

### Other Features
- Command palette (⌘K) for fast navigation
- Real-time notification bell (last 5 ticket updates)
- Dark / Light theme with persistent preference
- Fully responsive — works on mobile, tablet, and desktop
- Profile management with avatar upload (Cloudinary)
- Settings page — password change, 2FA enrollment/disable, notification preferences

---

## Project Structure

```
helpdesk-ai/          # Frontend (React + Vite)
├── src/
│   ├── pages/        # Login, Home, MyTickets, AdminDashboard,
│   │                 # TicketDetail, UserManagement, Profile, Settings
│   ├── components/   # Layout (Navbar), UI primitives, reusable widgets
│   ├── context/      # Auth, Theme
│   ├── hooks/        # useScrollHide, custom hooks
│   └── api/          # Axios instance with interceptors

helpdesk-api/         # Backend (Express + MongoDB)
├── routes/
│   ├── auth.js       # Register, login, 2FA, logout
│   ├── tickets.js    # CRUD, comments, CSAT, bulk actions
│   └── users.js      # User management, profile, avatar
├── models/           # Mongoose schemas
├── middleware/        # Auth guard, role check, rate limit
└── server.js
```

---

## Getting Started (Local)

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)
- Gmail OAuth2 credentials (for email features)
- Cloudinary account (for avatar uploads)

### Frontend
```bash
cd helpdesk-ai
npm install
npm run dev          # http://localhost:5173
```

### Backend
```bash
cd helpdesk-api
cp .env.example .env  # fill in MONGO_URI, JWT_SECRET, Gmail & Cloudinary creds
npm install
npm run dev           # http://localhost:4000
```

### Environment variables (backend)
```
MONGO_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173
GMAIL_USER=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

