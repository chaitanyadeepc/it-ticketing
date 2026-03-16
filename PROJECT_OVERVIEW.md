# HiTicket — Complete Project Overview

> IT Helpdesk Platform · React 19 + Node/Express + MongoDB
> Document Date: March 15, 2026

---

---

## Page 1 — Executive Summary & Project Purpose

### What is HiTicket?

HiTicket is a full-stack IT helpdesk and ticketing platform built for internal enterprise use. It allows employees to raise IT support requests through an AI-guided chatbot, track those requests in real time, and receive email notifications at every stage. Admins and agents manage, triage, and resolve tickets from a unified dashboard, while analysts gain visibility through built-in charts and performance metrics.

The platform is deployed as two independent services:

| Layer    | Service       | Hosting   | URL Pattern                       |
|----------|---------------|-----------|-----------------------------------|
| Frontend | `helpdesk-ai` | Vercel    | `https://helpdeskai-five.vercel.app` |
| Backend  | `helpdesk-api`| Render    | `https://<render-slug>.onrender.com` |

Both services share a single MongoDB Atlas cluster. All communication between the frontend and backend is over HTTPS via a REST API with JWT authentication.

### Core Goals

1. **Simplicity for end-users** — Raise a ticket through a guided chatbot in under 60 seconds, no training required.
2. **Efficiency for agents** — Single dashboard to view, triage, assign, and resolve all tickets, with SLA visibility and canned responses.
3. **Control for admins** — Full user lifecycle management, role assignment (user / agent / admin), bulk ticket operations, and scheduled analytics.
4. **Transparency** — Public ticket status lookup, knowledge base, full audit trail on every ticket.
5. **Security-first** — JWT + 2FA (TOTP + OTP), rate limiting, Helmet headers, NoSQL sanitization, role-gated API routes.

### Technology Choices at a Glance

| Concern           | Choice                                  | Reason                                      |
|-------------------|-----------------------------------------|---------------------------------------------|
| UI Framework      | React 19 + Vite 8                       | Fast HMR, modern concurrency features       |
| Styling           | Tailwind CSS v3                         | Utility-first, dark theme support           |
| Charts            | Recharts                                | Composable, responsive SVG charts           |
| HTTP Client       | Axios                                   | Interceptors for token injection + refresh  |
| Backend Framework | Express.js                              | Minimal, mature, flexible                   |
| Database          | MongoDB Atlas (Mongoose)                | Document model fits ticket data well        |
| Auth              | JWT + bcryptjs + speakeasy (TOTP)       | Stateless, 2FA-ready                        |
| File Storage      | Cloudinary                              | CDN + transformation for uploads            |
| Email             | Nodemailer + Gmail API (OAuth2)         | Reliable transactional email                |
| Security          | Helmet + express-rate-limit + mongo-sanitize | OWASP hardening                        |

---

---

## Page 2 — Architecture & Codebase Structure

### High-Level Architecture

```
Browser (React SPA)
       │  HTTPS REST
       ▼
  Render (Express API)   ──────  MongoDB Atlas
       │                              │
       │ OAuth2 token                 └── Users, Tickets, KbArticles
       ▼
  Gmail API (Nodemailer)
       │
       ▼
  Cloudinary (file storage)
```

The frontend is a pure SPA — all routing is client-side via React Router v7. The backend is a stateless Express API with no server-side rendering. JWT tokens are stored in `localStorage` and attached to every API call via an Axios request interceptor.

---

### Frontend Directory Structure (`helpdesk-ai/src/`)

```
src/
├── App.jsx              # Root router — defines all routes + route guards
├── main.jsx             # ReactDOM.createRoot entry point
├── api/
│   └── api.js           # Axios instance with baseURL + auth interceptors
├── context/
│   └── ToastContext.jsx  # Global toast notification system
├── hooks/
│   └── useInactivityLogout.js  # Auto-logout after idle period
├── pages/
│   ├── Home.jsx          # Landing page — hero, features, testimonials
│   ├── Login.jsx         # Auth — login, register, 2FA (TOTP + email OTP)
│   ├── Chatbot.jsx       # AI-guided ticket creation wizard
│   ├── MyTickets.jsx     # End-user ticket list with filters
│   ├── TicketDetail.jsx  # Full ticket view — comments, notes, SLA, attachments
│   ├── AdminDashboard.jsx # Stats, charts, heatmap, agent perf, ticket table
│   ├── UserManagement.jsx # Admin user table — roles, activation, 2FA
│   ├── KnowledgeBase.jsx  # Browse/search/create KB articles
│   ├── TicketStatus.jsx   # Public ticket lookup (no login required)
│   ├── Profile.jsx        # User profile editor
│   ├── Settings.jsx       # App preferences, notification settings
│   └── NotFound.jsx       # 404 fallback
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx       # Top nav with hide-on-scroll, mobile hamburger
│   │   ├── BottomNav.jsx    # Mobile bottom tab bar (4-5 items)
│   │   ├── Breadcrumb.jsx   # Auto-generated breadcrumbs from pathname
│   │   ├── PageWrapper.jsx  # Consistent page padding container
│   │   └── ScrollToTop.jsx  # Auto-scrolls to top on route change
│   ├── ui/
│   │   ├── LogoMark.jsx    # Animated SVG brand logo
│   │   ├── StatCard.jsx    # KPI card with trend arrow
│   │   ├── Badge.jsx       # Status/priority pill badge
│   │   ├── Card.jsx        # Dark glass card container
│   │   ├── Modal.jsx, Button.jsx, Input.jsx, Toggle.jsx, Avatar.jsx
│   │   └── EmptyState.jsx  # Empty list placeholder
│   ├── CommandPalette.jsx  # ⌘K global search/action palette
│   ├── ChatBubble.jsx      # Chat message bubble with markdown rendering
│   ├── OTPInput.jsx        # 6-digit OTP input with auto-focus
│   └── TicketCard.jsx / TicketModal.jsx
```

---

### Backend Directory Structure (`helpdesk-api/`)

```
helpdesk-api/
├── server.js         # Express app setup, middleware chain, route mounting
├── middleware/
│   └── auth.js       # protect · adminOnly · agentOrAdmin middleware
├── models/
│   ├── User.js       # User schema — roles, 2FA, notification prefs
│   ├── Ticket.js     # Ticket schema — comments, notes, history, attachments
│   └── KbArticle.js  # Knowledge base article schema
├── routes/
│   ├── auth.js       # /api/auth — register, login, 2FA, token refresh
│   ├── tickets.js    # /api/tickets — full CRUD + notes + attachments + public
│   ├── users.js      # /api/users — user list, role updates, activation
│   └── kb.js         # /api/kb — knowledge base CRUD
└── utils/
    ├── email.js      # sendTicketCreated / sendStatusChanged / sendCommentAdded
    └── storage.js    # Cloudinary upload + delete helpers (multer + memoryStorage)
```

---

### Route Guards in the Frontend

| Guard           | Condition                           | Redirects to |
|-----------------|--------------------------------------|--------------|
| `ProtectedRoute`| `token` in localStorage + authenticated flag | `/login` |
| `AdminRoute`    | Authenticated + `userRole === 'admin'` | `/`       |
| `StaffRoute`    | Authenticated + `userRole` is `agent` or `admin` | `/` |
| _(none)_        | Public routes: `/`, `/login`, `/status` | — |

---

---

## Page 3 — Feature Catalogue

### Authentication & Identity

| Feature                     | Detail                                                                   |
|-----------------------------|--------------------------------------------------------------------------|
| Register / Login            | Email + password, bcrypt-hashed (cost 12), JWT issued on success         |
| JWT expiry                  | 7-day token; `tokenVersion` field invalidates all sessions on password change |
| Two-Factor Authentication   | **TOTP** (Google Authenticator / Authy) via `speakeasy` + QR code       |
|                             | **Email OTP** — 6-digit code with 10-minute expiry via Gmail API         |
| Inactivity logout           | `useInactivityLogout` hook — auto-logout after configurable idle time    |
| Role system                 | `user` → `agent` → `admin`; only admins can promote roles                |

---

### Ticket Lifecycle

| Stage           | Who           | Actions                                                                 |
|-----------------|---------------|-------------------------------------------------------------------------|
| Creation        | Any user      | Via Chatbot wizard — auto-categorized, priority detected, round-robin assigned |
| Triage          | Agent / Admin | Update status, reassign, add internal notes, attach files               |
| Communication   | All parties   | Public comments (Markdown), email notifications on each change          |
| Resolution      | Agent / Admin | Status → Resolved; confetti animation; CSAT survey unlocked for user    |
| Closure         | Agent / Admin | Ticket locked — no further comments                                     |
| Deletion        | Admin only    | Hard delete with confirmation                                           |

**Ticket fields:** `ticketId` (auto TKT-XXXXX), title, description, category, subType, priority, status, createdBy, assignedTo, comments, internalNotes, history, attachments, satisfaction.

---

### Chatbot Ticket Wizard

The **Chatbot page** is a conversational 4-step flow:
1. **Describe issue** — free text or select from 8 category tiles (Hardware, Software, Network, Access, Email, Printer, VPN, Other)
2. **Sub-type selection** — dynamic chip list per category
3. **Detail gathering** — category-specific follow-up questions
4. **Priority confirmation + submit**

Additional intelligence:
- **Auto-categorization** — keyword regex matching detects category from natural language description
- **Priority detection** — keywords like "urgent", "broken", "not working" elevate priority
- **Duplicate detection** — free-text descriptions trigger a background search for similar open tickets; results appear in the sidebar with links, allowing the user to dismiss or proceed

---

### Agent & Admin Features

| Feature                  | Role     | Description                                                              |
|--------------------------|----------|--------------------------------------------------------------------------|
| Admin Dashboard          | Admin+Agent | Stats cards, 30-day line chart, status pie, category/priority bars, agent leaderboard, day-of-week heatmap, agent performance table |
| Ticket table             | Admin+Agent | Search, filter by status/priority/category, saved filter presets, pagination, bulk status update, bulk delete |
| SLA breach alerts        | All      | Banner on TicketDetail — green/amber/red based on priority SLA vs elapsed time |
| Internal Notes           | Agent+Admin | Private notes hidden from end-users; amber-themed locked panel           |
| Canned Responses         | Agent+Admin | Dropdown in comment box; 4 default templates, localStorage-customizable  |
| First Response Time      | All      | Calculated client-side from `createdAt` → first `comments[0].createdAt` |
| Round-robin assignment   | System   | On ticket creation, new tickets auto-assigned to the least-loaded agent  |
| Agent leaderboard        | Admin    | Top 5 agents by resolved ticket count with progress bars                 |
| Agent performance table  | Admin    | Per-agent: resolved, open, avg resolution time, avg CSAT                 |
| Day-of-week heatmap      | Admin    | Bar chart showing ticket volume by day (Sun–Sat)                         |
| User Management          | Admin    | Table of all users — activate/deactivate, change roles, revoke 2FA      |
| Export CSV               | Admin    | Downloads filtered ticket list as CSV                                    |

---

### Knowledge Base

- **Browse** — Article list with category filter + full-text search
- **Read** — Article viewer with tags, view count, author, "Was this helpful?" feedback
- **Create / Delete** — Agent/admin only; Markdown content; category + tags; publish flag
- **API** — `GET /api/kb` (public), `POST/PUT/DELETE /api/kb/:id` (staff only)

---

### Public Ticket Status Page

- **URL:** `/status` — no authentication required
- Enter a ticket ID (e.g. `TKT-00042`) to see: status, priority, category, creation and update dates
- Useful for sharing ticket status with non-registered stakeholders
- Backed by `GET /api/tickets/public/:ticketId` — returns only safe, non-sensitive fields

---

### Notifications

Email notifications are sent asynchronously (never blocking the API response) via Gmail API OAuth2 + Nodemailer for:
- Ticket created (to submitter)
- Status changed (to submitter)
- Comment added (to submitter)

User preferences control which emails are delivered (`notificationPrefs` in User model).

---

---

## Page 4 — Security & Data Model

### Security Implementation

HiTicket addresses all OWASP Top 10 relevant to this stack:

| OWASP Risk                        | Mitigation Implemented                                             |
|-----------------------------------|---------------------------------------------------------------------|
| Broken Access Control             | Every protected route uses `protect` middleware (JWT verify). Role-specific routes use `adminOnly` or `agentOrAdmin`. Users can only read/modify their own tickets. Internal notes stripped from non-staff responses. |
| Cryptographic Failures            | Passwords hashed with bcrypt (cost factor 12). JWT signed with `HS256` + secret key. TOTP secrets never exposed in API responses. OTP expiry enforced. |
| Injection (NoSQL)                 | `express-mongo-sanitize` strips `$` and `.` from req.body/query/params. Mongoose schema validation rejects unexpected types. |
| Injection (XSS)                   | Helmet sets strict `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`. Markdown is rendered with manual escaping before innerHTML in ChatBubble. |
| Security Misconfiguration         | Helmet middleware configures 12 HTTP security headers. CORS whitelist restricts origins to known domains. Body size capped at 50KB. |
| Rate Limiting                     | Global: 200 req / 15 min per IP. Auth routes: 10 req / 15 min per IP (separate stricter limiter). |
| Vulnerable Components             | All dependencies pinned to non-EOL versions. No known high CVEs. |
| Authentication Failures           | 2FA enforced when enabled. `tokenVersion` field invalidates all existing tokens on password reset. Inactivity auto-logout on frontend. |
| SSRF                              | No server-side URL fetching from user input. Cloudinary upload uses memory storage and validated mime types. |
| File upload safety                | Multer restricts mimetype to images, PDF, Office docs, and ZIP. Max 8 MB per file. Cloudinary stores files with public IDs, CDN-served with signed URLs. |

---

### Data Models

#### User

```
User {
  name, email, password (hashed),
  role: 'user' | 'agent' | 'admin',
  department, phone, jobTitle, location,
  isActive, tokenVersion,
  notificationPrefs { emailEnabled, ticketUpdates, newComments, weeklyDigest },
  twoFactor { enabled, method: 'email'|'totp', totpSecret, pendingOtp, pendingOtpExpiry },
  createdAt, updatedAt
}
```

#### Ticket

```
Ticket {
  ticketId (auto: TKT-NNNNN),
  title, description, category, subType,
  priority: 'Low' | 'Medium' | 'High' | 'Critical',
  status:   'Open' | 'In Progress' | 'Resolved' | 'Closed',
  createdBy (ref: User), assignedTo (string),
  comments:      [ { text, author, authorName, createdAt } ],
  internalNotes: [ { text, author, authorName, authorRole, createdAt } ],
  history:       [ { action, field, from, to, by, byName, createdAt } ],
  attachments:   [ { url, publicId, filename, mimetype, size, uploaderName } ],
  satisfaction:  { rating (1–5), feedback, submittedAt },
  resolvedAt, createdAt, updatedAt
}
```

#### KbArticle

```
KbArticle {
  title, content, category, tags[],
  author (ref: User), authorName,
  isPublished, views,
  createdAt, updatedAt
}
```

---

### API Surface

| Method   | Endpoint                            | Auth           | Description                         |
|----------|-------------------------------------|----------------|-------------------------------------|
| POST     | `/api/auth/register`                | Public         | Register new user                   |
| POST     | `/api/auth/login`                   | Public         | Login, receive JWT + 2FA challenge  |
| POST     | `/api/auth/verify-2fa`              | Public         | Complete 2FA, receive JWT           |
| GET      | `/api/tickets`                      | Protected      | List tickets (own for users, all for staff) |
| POST     | `/api/tickets`                      | Protected      | Create ticket (auto-assigns)         |
| GET      | `/api/tickets/stats`                | Agent+Admin    | Dashboard KPI counts                |
| GET      | `/api/tickets/public/:ticketId`     | Public         | Public status lookup                |
| GET      | `/api/tickets/:id`                  | Protected      | Get one ticket                      |
| PATCH    | `/api/tickets/:id`                  | Protected      | Update ticket (status, comment, assign, CSAT) |
| POST     | `/api/tickets/:id/notes`            | Agent+Admin    | Add internal note                   |
| POST     | `/api/tickets/:id/attachments`      | Protected      | Upload files (multipart)            |
| DELETE   | `/api/tickets/:id/attachments/:aid` | Protected      | Remove attachment                   |
| PATCH    | `/api/tickets/bulk`                 | Agent+Admin    | Bulk status update                  |
| DELETE   | `/api/tickets/bulk`                 | Admin only     | Bulk delete                         |
| DELETE   | `/api/tickets/:id`                  | Admin only     | Delete single ticket                |
| GET      | `/api/users`                        | Admin          | List all users                      |
| PATCH    | `/api/users/:id`                    | Admin          | Update role / isActive              |
| GET      | `/api/kb`                           | Public         | List published articles             |
| GET      | `/api/kb/:id`                       | Public         | Get article (increments views)      |
| POST     | `/api/kb`                           | Agent+Admin    | Create article                      |
| PUT      | `/api/kb/:id`                       | Agent+Admin    | Update article                      |
| DELETE   | `/api/kb/:id`                       | Agent+Admin    | Delete article                      |

---

---

## Page 5 — UI Design System, Deployment & Roadmap

### Design System

HiTicket uses a custom dark design language built entirely in Tailwind CSS. There are no external component libraries — every UI element (cards, badges, modals, inputs, stat cards, breadcrumbs) is purpose-built.

**Colour Palette**

| Token            | Hex       | Usage                                   |
|------------------|-----------|-----------------------------------------|
| Brand coral      | `#FF634A` | CTA buttons, logo, primary accent       |
| Background       | `#141414` | Page background                         |
| Card surface     | `#18181b` | Panels, cards, modals                   |
| Elevated surface | `#27272a` | Inputs, table rows, hover states        |
| Border subtle    | `#3f3f46` | Dividers, borders                       |
| Text primary     | `#fafafa` | Headings, labels                        |
| Text secondary   | `#a1a1aa` | Body text, captions                     |
| Text muted       | `#52525b` | Placeholders, hints                     |
| Green success    | `#22c55e` | Open status, SLA on track               |
| Amber warning    | `#f59e0b` | In Progress, SLA warning, internal notes |
| Blue info        | `#3b82f6` | Low priority, info states               |
| Cyan accent      | `#06b6d4` | Resolved status, activity timeline      |
| Red danger       | `#ef4444` | Critical priority, SLA breached, delete |
| Purple accent    | `#8b5cf6` | Comments, admin actions                 |

**Typography:** System font stack via Tailwind's `font-sans`. Monospace used for ticket IDs and code blocks. Font sizes follow a compact scale (10–22px) for high information density.

**Motion:** CSS keyframe animations for confetti (resolved tickets), skeleton loaders, stat-count-up, page-enter fade-slide. All transitions use `duration-200/300` for snappy feel.

---

### Key UI Patterns

| Pattern                | Implementation                                                         |
|------------------------|------------------------------------------------------------------------|
| Page transitions       | `page-enter` CSS class on route wrapper — fade + translate-Y           |
| Skeleton loaders       | `.skeleton` CSS class with shimmer animation on all async pages        |
| Toast notifications    | `ToastContext` — portal-rendered toasts, stacked, auto-dismiss 3s      |
| Command Palette        | `⌘K` / `Ctrl+K` — fuzzy search categories + quick navigation          |
| Confetti               | CSS-particle burst on ticket resolved                                  |
| Responsive layout      | Mobile-first; Navbar collapses to hamburger + BottomNav on `< md`     |
| SLA progress bar       | Inline coloured bar in TicketDetail header banner                      |
| Markdown rendering     | Manual escape + regex substitution (bold, italic, code, links)         |

---

### Deployment

**Frontend — Vercel**
- Auto-deploys on push to `main` branch of `helpdesk-ai`
- Build command: `npm run build` (Vite, outputs to `dist/`)
- Environment variables: `VITE_API_URL` pointing to the Render backend

**Backend — Render**
- Auto-deploys on push to `main` branch of `helpdesk-api`
- Start command: `node server.js`
- Environment variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `GMAIL_*`, `CLOUDINARY_*`
- Free tier — instance spins down after 15 min inactivity; first request may take ~30s

**Database — MongoDB Atlas**
- Shared M0 cluster (free tier)
- Network access: IP whitelist includes `0.0.0.0/0` for Render dynamic IPs
- Collections: `users`, `tickets`, `kbarticles`

**Git Strategy**
- Single monorepo root for shared git history
- Both `helpdesk-ai/` and `helpdesk-api/` live as subdirectories under `/IT Ticketing/`
- Separate Vercel and Render projects pointed at the subdirectory roots

---

### Known Limitations & Future Roadmap

**Current limitations**
- Real-time (WebSocket/SSE) — comments and ticket updates require manual refresh or a 30-second poll interval in AdminDashboard
- Render free tier cold-start latency (~30s) on first API call after inactivity
- CSAT "Was this helpful?" buttons on KB articles are visual only — no backend persistence for article votes
- No scheduled email digests yet (backend structure is in place via notification prefs)

**Planned enhancements**
| Feature                        | Priority | Notes                                               |
|--------------------------------|----------|-----------------------------------------------------|
| WebSocket / SSE for live updates | High    | Socket.io or Server-Sent Events for comment feed    |
| Email digest (weekly report)   | Medium   | Node-cron + scheduled Mongoose query                |
| SSO (Google / Microsoft OAuth) | Medium   | passport.js with OAuth2 strategy                    |
| Audit log page                 | Medium   | Expose `ticket.history` in a dedicated admin view   |
| IP session management          | Low      | Store login IPs; admin can revoke by IP             |
| Mobile app                     | Low      | React Native with shared API                        |
| AI priority prediction         | Low      | Fine-tuned classification model or OpenAI API call  |
| Multi-tenant / department isolation | Low | Workspace scoping per department                   |

---

### Quick Start Reference

```bash
# Clone
git clone <repo-url>

# Backend
cd helpdesk-api
cp .env.example .env        # fill MONGO_URI, JWT_SECRET, GMAIL_*, CLOUDINARY_*
npm install
npm run dev                 # listens on :4000

# Frontend
cd helpdesk-ai
cp .env.example .env        # set VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # opens on :5173
```

Default admin account is created by registering first — then manually set `role: 'admin'` in MongoDB Atlas, or use the User Management page once an admin exists.

---

*HiTicket · Built with React 19, Express, MongoDB Atlas · March 2026*
