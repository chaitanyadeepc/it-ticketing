# HiTicket — IT Helpdesk Platform

A full-stack IT helpdesk and ticketing platform with AI-assisted triage, knowledge base, real-time analytics, PWA support, and enterprise-grade security. Built for internal IT teams to manage, resolve, and track support requests efficiently.

**Live App:** [hiticket-five.vercel.app](https://hiticket-five.vercel.app)  
**Backend API:** Hosted on Render (auto-deploy on push)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v3, Recharts |
| Backend | Node.js 20, Express 4 |
| Database | MongoDB Atlas (Mongoose 8) |
| Auth | JWT (30-day), bcryptjs (cost 12), speakeasy (TOTP), Email OTP |
| Email | Gmail REST API via googleapis (OAuth2 — bypasses SMTP port blocks) |
| File Storage | Cloudinary (multer memoryStorage → stream upload) |
| PWA | vite-plugin-pwa (workbox NetworkFirst for API routes) |
| Scheduled Jobs | node-cron (weekly digest, Mondays 08:00 UTC) |
| Security | Helmet, express-rate-limit, express-mongo-sanitize |
| Deployment | Vercel (frontend), Render (backend) |

---

## Feature Overview

### Authentication & Security
- JWT-based sessions (30-day tokens, `tokenVersion` invalidation on logout/password change)
- **Two-factor authentication** — TOTP (Google Authenticator / Authy) via QR code, or 6-digit Email OTP (10-min expiry)
- Temporary 2FA-pending token issued between credential check and OTP verification — cannot be used for API calls
- Auth rate limiter: 10 attempts per 15 min per IP (failed attempts only)
- Password strength meter on change (5 levels: Weak → Very Strong)
- Password show/hide toggle on login and profile forms
- Inactivity auto-logout hook
- NoSQL injection protection via mongo-sanitize
- HTTP security headers via Helmet (CORP cross-origin for Cloudinary compatibility)

### Ticket Management
- **Conversational ticket creation** via AI chatbot wizard (4 guided steps)
- Auto-categorization from natural language (keyword regex)
- Priority auto-detection ("urgent", "broken", "critical" → elevate priority)
- **Round-robin auto-assignment** to least-loaded active agent
- 6 pre-built ticket templates in chatbot: Reset Password, VPN, New Laptop, Printer, Email, Software Access
- KB deflection in chatbot — matching articles shown before ticket submission
- **Statuses:** Open → In Progress → Resolved → Closed
- **Priorities:** Critical · High · Medium · Low (color-coded throughout UI)
- Due date assignment by staff — shown as badge (gray / red overdue) in ticket card
- Ticket watchers — any authenticated user can watch/unwatch; watcher count shown
- Copy ticket ID button in every ticket card (1.5s clipboard feedback)
- Sort dropdown in My Tickets: Newest / Oldest / Priority / Recently Updated
- Bulk status update and bulk delete (admin only)
- File attachments via Cloudinary (up to 5 files per ticket)
- Internal notes visible only to staff (stripped from user responses)
- Complete audit history on every field change (who, what, when)
- CSAT (Customer Satisfaction) 1–5 star rating after resolution
- Public ticket status page (no login required) — shareable link

### Admin Dashboard
- Overview / SLA Breach / Ticket Aging tabs
- Date range filter: 7d · 30d · 90d · All time
- Live KPI cards: total, open, in-progress, resolved, closed
- 30-day ticket volume line chart + category distribution bar chart
- Agent leaderboard (tickets resolved, avg resolution time)
- **SLA Breach tab** — table of open tickets past their priority SLA (Critical: 4h, High: 8h, Medium: 24h, Low: 72h)
- **Ticket Aging tab** — 4 bucket cards (<1d, 1–3d, 3–7d, >7d) + full sorted table
- Activity log viewer (admin-only admin action audit trail)
- Post-resolution survey results viewer

### User & Admin Management
- Full user table with search bar + role/status filters
- Role assignment: user → agent → admin
- Activate / deactivate accounts
- Admin can view 2FA status per user

### Knowledge Base
- Browse, search, and filter articles by category/tag
- View count tracking per article
- Helpful / Not Helpful rating (thumbs up/down) with running tallies
- Staff can create, edit (inline), and delete articles
- KB suggestions surfaced in chatbot before ticket submission

### Email Notifications
- Beautiful HTML emails with dark-themed HiTicket branding
- Priority and status color-coded chip badges in emails
- Events: ticket created, status changed, comment added, ticket assigned, ticket escalated, password changed
- Per-user notification preferences (globally on/off, ticket updates, comments, weekly digest)
- **Weekly digest** — automated cron every Monday 08:00 UTC; per-user summary of last 7 days

### Progressive Web App (PWA)
- Installable on desktop and mobile
- Service worker with `autoUpdate` registration
- NetworkFirst caching strategy for all `/api/` routes (fresh data, offline fallback)
- Theme color `#7c3aed`

### Onboarding & UX
- First-login animated **Onboarding Tour** (5 steps) — shown once, stored in localStorage
- **Keyboard Shortcuts Modal** (`?` key) — Navigation, Chatbot commands, General shortcuts
- **Command Palette** (`⌘K`) — instant global navigation
- Copy share link + Print button in ticket detail
- `?` help button in navbar triggers shortcuts modal
- Confetti animation on ticket resolution for CSAT flow
- Fully responsive — mobile, tablet, desktop; bottom tab bar on mobile

### User Roles

| Role | Capabilities |
|---|---|
| **User** | Raise tickets, track own tickets, chatbot, KB, profile, settings |
| **Agent** | All user caps + manage all tickets, internal notes, due dates, SLA visibility |
| **Admin** | All agent caps + user management, analytics, bulk delete, activity log, feedback results |

---

## All Routes (Frontend)

| Path | Component | Guard |
|---|---|---|
| `/` | Home | Public |
| `/login` | Login | Public |
| `/status` | TicketStatus | Public |
| `/survey` | Survey | Public |
| `/chatbot` or `/raise-ticket` | Chatbot | ProtectedRoute |
| `/my-tickets` | MyTickets | ProtectedRoute |
| `/tickets/:id` | TicketDetail | ProtectedRoute |
| `/knowledge-base` | KnowledgeBase | ProtectedRoute |
| `/profile` | Profile | ProtectedRoute |
| `/settings` | Settings | ProtectedRoute |
| `/admin` | AdminDashboard | StaffRoute |
| `/admin/users` | UserManagement | AdminRoute |
| `/admin/logs` | ActivityLog | AdminRoute |
| `/admin/feedback` | FeedbackResults | AdminRoute |
| `*` | NotFound | Public |

---

## All API Endpoints (Backend)

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create account (rate-limited) |
| POST | `/login` | Password login; returns `requires2FA` if 2FA enabled |
| POST | `/2fa/verify` | Verify OTP/TOTP code, return full JWT |
| POST | `/2fa/resend` | Resend email OTP |
| POST | `/2fa/setup/email` | Begin email 2FA enrollment |
| POST | `/2fa/setup/email/verify` | Confirm email 2FA enrollment |
| POST | `/2fa/setup/totp` | Generate TOTP secret + QR code |
| POST | `/2fa/setup/totp/verify` | Confirm TOTP enrollment |
| POST | `/2fa/disable` | Disable 2FA (requires current code) |

### Tickets — `/api/tickets`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public/:ticketId` | None | Public status lookup |
| GET | `/` | Any | User sees own; staff see all |
| GET | `/stats` | Staff | KPI counts |
| GET | `/:id` | Any | Single ticket (internal notes stripped for users) |
| POST | `/` | Any | Create ticket (auto-assigns) |
| PATCH | `/:id` | Any | Update status/assignee/comment/CSAT |
| POST | `/:id/notes` | Staff | Add internal note |
| POST | `/:id/attachments` | Any | Upload files (Cloudinary) |
| DELETE | `/:id/attachments/:aid` | Any | Remove attachment |
| PATCH | `/bulk` | Staff | Bulk status update |
| DELETE | `/bulk` | Admin | Bulk delete |
| DELETE | `/:id` | Admin | Hard delete |
| PATCH | `/:id/watch` | Any | Toggle watcher |
| PATCH | `/:id/due-date` | Staff | Set/clear due date |

### Users — `/api/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile` | Any | Own profile |
| PUT | `/profile` | Any | Update name, dept, phone, jobTitle, location |
| PUT | `/notifications` | Any | Update notification preferences |
| POST | `/change-password` | Any | Change password (validates current pw) |
| GET | `/` | Admin | List all users |
| PATCH | `/:id` | Admin | Update role or isActive |

### Knowledge Base — `/api/kb`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Any | List articles |
| GET | `/:id` | Any | Single article (increments views) |
| POST | `/` | Staff | Create article |
| PUT | `/:id` | Staff | Update article |
| DELETE | `/:id` | Staff | Delete article |
| POST | `/:id/helpful` | Any | Vote helpful/notHelpful |

### Other
| Route | Description |
|---|---|
| `GET /api/logs` | Activity log (admin) |
| `POST /api/feedback` | Submit survey |
| `GET /api/feedback` | List feedback (admin) |
| `GET /api/health` | Health check |

---

## Project Structure

```
IT Ticketing/
├── helpdesk-ai/          # Frontend (React + Vite)
│   ├── .npmrc            # legacy-peer-deps=true (vite-plugin-pwa compat)
│   ├── vite.config.js    # PWA plugin config (workbox NetworkFirst)
│   └── src/
│       ├── App.jsx       # Router + route guards + global key handlers
│       ├── api/api.js    # Axios instance — baseURL + auth interceptor
│       ├── context/      # AuthContext, ThemeContext, ToastContext
│       ├── hooks/        # useInactivityLogout, useScrollHide
│       ├── pages/        # All page components (14 pages)
│       └── components/   # Layout, UI primitives, OnboardingTour,
│                         # KeyboardShortcutsModal, CommandPalette, TicketCard
│
└── helpdesk-api/         # Backend (Express + MongoDB)
    ├── server.js         # App bootstrap, middleware, routes, cron
    ├── middleware/auth.js # protect · agentOrAdmin · adminOnly
    ├── models/           # User.js · Ticket.js · KbArticle.js
    ├── routes/           # auth · tickets · users · kb · logs · feedback
    └── utils/
        ├── email.js      # HTML email builder + all send* functions
        └── storage.js    # Cloudinary helpers (multer memoryStorage)
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
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hiticket
JWT_SECRET=<random 64-char secret>
CLIENT_URL=http://localhost:5173

# Gmail OAuth2 (obtain via Google Cloud Console + OAuth Playground)
EMAIL_USER=your@gmail.com
EMAIL_FROM=HiTicket <your@gmail.com>
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Deployment

### Frontend (Vercel)
1. Import `helpdesk-ai/` repo into Vercel
2. Set `VITE_API_URL=https://<your-render-url>` in Vercel environment variables
3. The `.npmrc` file (`legacy-peer-deps=true`) automatically resolves the `vite-plugin-pwa` peer dependency on Vercel's build environment

### Backend (Render)
1. Create a new Web Service pointing to `helpdesk-api/`
2. Set all environment variables from the section above
3. Build command: `npm install` · Start command: `node server.js`

---

## Security Hardening

| Concern | Implementation |
|---|---|
| Password storage | bcryptjs cost factor 12 |
| Session tokens | JWT signed with HS256, 30-day expiry, `tokenVersion` invalidation |
| 2FA intermediate | Short-lived (10m) temp token — cannot access API routes |
| Brute-force | Auth endpoints: 10 attempts / 15 min per IP; global: 200 req / 15 min |
| NoSQL injection | `express-mongo-sanitize` strips `$` and `.` from all inputs |
| XSS headers | `helmet()` sets `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, etc. |
| CORS | Explicit origin whitelist + `*.vercel.app` wildcard |
| File uploads | Stored on Cloudinary (no server disk), max 5 files per ticket |
| Request size | Body parser capped at 50kb |
| Role enforcement | Every admin/staff route double-checked in middleware (`adminOnly`, `agentOrAdmin`) |
| Internal notes | Stripped from API responses for non-staff users in ticket routes |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette |
| `⌘N` / `Ctrl+N` | New ticket (open chatbot) |
| `G` then `H` | Go to Home |
| `G` then `T` | Go to My Tickets |
| `G` then `K` | Go to Knowledge Base |
| `G` then `P` | Go to Profile |
| `?` | Open keyboard shortcuts modal |
| `Esc` | Close any open modal |

### Chatbot slash commands
| Command | Action |
|---|---|
| `/status` | Check a ticket status inline |
| `/agent` | Request agent handoff |
| `/template` | Pick from 6 pre-built ticket templates |
| `/kb` | Search knowledge base |
| `/clear` | Reset conversation |

---

## Changelog (Recent Versions)

### v3.0 — Final Polish
- `userId` now correctly stored in localStorage (fixed Watch feature)
- Password show/hide toggle on Login page
- Sort dropdown in My Tickets (Newest / Oldest / Priority / Recently Updated)
- Due-date badge + copy ticket ID button in Ticket Card
- User search bar in User Management
- KB article inline editing for staff
- Copy share link + Print button in Ticket Detail
- `?` help button in Navbar

### v2.0 — Major Feature Release
- Onboarding tour (5-step, shown once on first login)
- Keyboard shortcuts modal
- Due dates and ticket watchers
- PWA (installable, offline-capable)
- Weekly digest email cron (Mondays 08:00 UTC)
- Admin SLA Breach and Ticket Aging tabs
- Chatbot KB deflection and ticket templates
- KB helpful/not-helpful ratings
- Password change with strength meter
- Enhanced HTML email design

### v1.0 — Launch
- Core ticketing platform
- JWT + 2FA authentication
- Admin dashboard with charts
- Knowledge base
- Email notifications
- Cloudinary file attachments

