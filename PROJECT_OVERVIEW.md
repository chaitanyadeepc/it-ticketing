# HiTicket — Complete Project Overview

> IT Helpdesk Platform · React 19 + Node/Express + MongoDB  
> Document Date: March 2026

---

## Page 1 — Executive Summary & Project Purpose

### What is HiTicket?

HiTicket is a full-stack IT helpdesk and ticketing platform built for internal enterprise use. Employees raise IT support requests through an AI-guided chatbot, track those requests in real time, and receive email notifications at every stage. Agents and admins manage, triage, and resolve tickets from a unified dashboard with SLA visibility, knowledge base deflection, scheduled analytics, and a full audit trail.

The platform is deployed as two independent services:

| Layer | Service | Hosting | URL |
|---|---|---|---|
| Frontend | `helpdesk-ai` | Vercel | `https://hiticket.vercel.app` |
| Backend | `helpdesk-api` | Render | `https://<render-slug>.onrender.com` |

Both services share a single MongoDB Atlas cluster. All browser-to-API communication is over HTTPS via a REST API with JWT authentication.

### Core Goals

1. **Simplicity for end-users** — Raise a ticket in under 60 seconds through a guided chatbot; no training required.
2. **Efficiency for agents** — Single dashboard to view, triage, assign, and resolve; SLA breach tracking; due dates; internal notes.
3. **Control for admins** — Full user lifecycle, role assignment, bulk operations, activity log, scheduled email digests.
4. **Knowledge deflection** — KB articles surfaced in chatbot before submission reduce unnecessary tickets.
5. **Security-first** — JWT + 2FA (TOTP + OTP), token versioning, rate limiting, Helmet, NoSQL sanitization, role-gated routes.

### Technology Choices

| Concern | Choice | Reason |
|---|---|---|
| UI Framework | React 19 + Vite 8 | Fast HMR, modern concurrency |
| Styling | Tailwind CSS v3 | Utility-first, dark theme |
| Charts | Recharts | Composable SVG charts |
| HTTP Client | Axios | Request interceptors for token injection |
| Backend | Express.js | Minimal, mature, flexible |
| Database | MongoDB Atlas (Mongoose 8) | Document model fits ticket data |
| Auth | JWT + bcryptjs + speakeasy | Stateless, 2FA-ready |
| File Storage | Cloudinary | CDN + transformation |
| Email | Gmail REST API (googleapis, OAuth2) | Bypasses SMTP port 465/587 blocks on Render |
| Scheduled Jobs | node-cron | Weekly digest, Monday 08:00 UTC |
| PWA | vite-plugin-pwa (workbox) | Installable, NetworkFirst API caching |
| Security | Helmet + express-rate-limit + mongo-sanitize | OWASP hardening |

---

## Page 2 — Architecture & Codebase Structure

### High-Level Architecture

```
Browser (React SPA / PWA)
       │  HTTPS REST  (Authorization: Bearer <JWT>)
       ▼
  Vercel Edge (static assets + CDN)
       │
       ▼
  Render (Express API — helpdesk-api)
       │                    │
       ▼                    ▼
  MongoDB Atlas      Gmail REST API
       │                    │
       └────────────────────┘
                  │
                  ▼
           Cloudinary CDN
           (file attachments)
```

The frontend is a pure React SPA — all routing is client-side via React Router v7. The backend is a stateless Express REST API. JWT tokens are stored in `localStorage` and attached to every POST/GET/PATCH/DELETE request via an Axios request interceptor.

---

### Frontend Directory Structure (`helpdesk-ai/src/`)

```
src/
├── App.jsx                    # Root router — all routes + 3 guards + global key handlers
├── main.jsx                   # ReactDOM.createRoot entry point
├── api/
│   └── api.js                 # Axios instance (baseURL: VITE_API_URL) + auth interceptor
├── context/
│   ├── AuthContext.jsx        # Provides user, token, login(), logout() to all components
│   ├── ThemeContext.jsx       # Dark/light toggle — persisted in localStorage
│   └── ToastContext.jsx       # Global portal-rendered toast system (3s auto-dismiss)
├── hooks/
│   ├── useInactivityLogout.js # Auto-logout after configurable idle duration
│   └── useScrollHide.js       # Hides Navbar on scroll-down, reveals on scroll-up
├── pages/
│   ├── Home.jsx               # Dual-mode: authenticated dashboard (6-KPI ribbon, timeline, charts) OR marketing landing page (hero, features bento, roles, CTA)
│   ├── Login.jsx              # Auth — login, register, 2FA (TOTP + email OTP)
│   ├── Chatbot.jsx            # 4-step AI ticket wizard + KB deflection + templates
│   ├── MyTickets.jsx          # End-user ticket list — filters, sort, search
│   ├── TicketDetail.jsx       # Full ticket — comments, notes, attachments, SLA, watchers
│   ├── AdminDashboard.jsx     # Stats, charts, SLA tab, aging tab, ticket table
│   ├── UserManagement.jsx     # Admin user table — roles, activation, search
│   ├── KnowledgeBase.jsx      # Browse/search/rate/edit KB articles
│   ├── TicketStatus.jsx       # Public ticket lookup (no login required)
│   ├── Profile.jsx            # Profile editor + password change + strength meter
│   ├── Settings.jsx           # 2FA enrollment/disable, notification prefs, theme
│   ├── ActivityLog.jsx        # Admin-only audit log viewer
│   ├── Survey.jsx             # Post-resolution CSAT survey (public)
│   ├── FeedbackResults.jsx    # Admin survey results viewer
│   └── NotFound.jsx           # 404 page
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx         # Top nav — logo, links, ⌘K, ?, notification bell, avatar
│   │   ├── BottomNav.jsx      # Mobile-only bottom tab bar (Home, Tickets, Chat, KB, Profile)
│   │   ├── Breadcrumb.jsx     # Auto-generated breadcrumbs from pathname
│   │   ├── PageWrapper.jsx    # Consistent page-level padding + max-width container
│   │   └── ScrollToTop.jsx    # Auto-scroll to top on every route change
│   ├── ui/
│   │   ├── StatCard.jsx       # KPI card with trend arrow and colour indicator
│   │   ├── Badge.jsx          # Status/priority pill badge
│   │   ├── Card.jsx           # Dark glass card wrapper
│   │   ├── Modal.jsx          # Focus-trapped portal modal
│   │   └── Avatar.jsx         # Cloudinary avatar with initials fallback
│   ├── CommandPalette.jsx     # ⌘K global search + navigation palette
│   ├── OnboardingTour.jsx     # First-login 5-step animated modal (once, localStorage)
│   ├── KeyboardShortcutsModal.jsx # ? key shortcut reference (3 sections, kbd chips)
│   ├── ChatBubble.jsx         # Markdown-rendering chat message bubble
│   ├── OTPInput.jsx           # 6-digit OTP with auto-focus advancement
│   └── TicketCard.jsx         # Ticket summary card — due badge, copy ID, status chip
```

---

### Backend Directory Structure (`helpdesk-api/`)

```
helpdesk-api/
├── server.js              # Express bootstrap, middleware chain, route mounting, cron
├── middleware/
│   └── auth.js            # protect · agentOrAdmin · adminOnly JWT middleware
├── models/
│   ├── User.js            # User schema — roles, 2FA, notification prefs, bcrypt hook
│   ├── Ticket.js          # Ticket schema — all sub-schemas, dueDate, watchers, auto-ID
│   └── KbArticle.js       # KB article schema — views, helpful/notHelpful counters
├── routes/
│   ├── auth.js            # register, login, 2FA flow (4 endpoints), 2FA setup (4 endpoints)
│   ├── tickets.js         # Full ticket CRUD + notes + attachments + bulk + watch + due-date
│   ├── users.js           # profile, notifications, change-password, admin user management
│   ├── kb.js              # Knowledge base CRUD + helpful vote
│   ├── logs.js            # Activity log (admin)
│   └── feedback.js        # Survey submission + admin results
└── utils/
    ├── email.js           # HTML email builder → wrap(), send* functions
    └── storage.js         # Cloudinary upload stream + delete helpers (multer memoryStorage)
```

---

### Route Guards (Frontend)

| Guard | Logic | Redirects to |
|---|---|---|
| `ProtectedRoute` | `token` present in localStorage + auth context loaded | `/login` |
| `StaffRoute` | Authenticated + role is `agent` or `admin` | `/` |
| `AdminRoute` | Authenticated + role is exactly `admin` | `/` |
| _(public)_ | `/`, `/login`, `/status`, `/survey` | — |

---

## Page 3 — Feature Catalogue

### Authentication & Identity

| Feature | Detail |
|---|---|
| Register / Login | Email + password; bcrypt cost 12; JWT issued on success, stored in localStorage |
| JWT expiry | 30-day token; `tokenVersion` in payload matches field in User doc — mismatch = 401 |
| 2FA — TOTP | speakeasy generates TOTP secret; QR code rendered via `qrcode` library; verified with `window:2` tolerance |
| 2FA — Email OTP | 6-digit random code, 10-min expiry, stored hashed in User doc; sent via Gmail API |
| 2FA login flow | Credential check → short-lived (10-min) `tempToken` issued → OTP verified → full JWT issued |
| Inactivity logout | `useInactivityLogout` hook — auto-logout after configurable idle time |
| Role system | `user` → `agent` → `admin`; only admins can promote; role enforced server-side on every route |
| Password change | `POST /users/change-password` — validates current password, bcrypt re-hashes via pre-save hook; sends `sendPasswordChanged` email |
| Password strength | 5-level meter (Weak/Fair/Good/Strong/Very Strong) computed client-side on profile page |

---

### Ticket Lifecycle

| Stage | Who | Actions |
|---|---|---|
| Creation | Any user | Via Chatbot wizard — 4 guided steps, auto-categorized, priority detected, round-robin assigned |
| Triage | Agent/Admin | Status update, reassign, internal note, due date, file attachment |
| Communication | All parties | Public comments (Markdown), email notifications on each change |
| Resolution | Agent/Admin | Status → Resolved; confetti animation; CSAT survey unlocked for user |
| Closure | Agent/Admin | Status → Closed; ticket locked |
| Deletion | Admin only | Hard delete with confirmation; bulk delete supported |

**Ticket fields:** `ticketId` (auto TKT-NNNN, gap-safe), title, description, category, subType, priority, status, createdBy, assignedTo, comments, internalNotes, history, attachments, satisfaction, resolvedAt, dueDate, watchers.

---

### Chatbot Ticket Wizard

4-step guided flow:
1. **Category** — 8 tile grid (Hardware, Software, Network, Access, Email, Printer, VPN, Other) or free text
2. **Sub-type** — dynamic chip list per category
3. **Details** — category-specific follow-up questions; KB articles surfaced here as chips before submit
4. **Confirm + Submit** — priority shown; user can confirm or adjust

Intelligence:
- **Auto-categorization** — keyword regex maps free-text to category
- **Priority detection** — keywords like "urgent", "critical", "not working" auto-elevate priority
- **Slash commands** — `/status`, `/agent`, `/template`, `/kb`, `/clear` (+ `Esc`)
- **Ticket templates** — 6 pre-built templates (Reset Password, VPN, New Laptop, Printer, Email, Software Access)
- **KB deflection** — before step 4, queries `/api/kb?q=<description>`, shows matching articles as dismissible chips

---

### Admin Dashboard

| Tab | Contents |
|---|---|
| **Overview** | KPI stat cards (total, open, in-progress, resolved, closed), date-range filter (7d/30d/90d/All), 30-day volume line chart, category distribution bar chart, agent leaderboard, ticket table with bulk actions |
| **SLA Breach** | Table of all open/in-progress tickets that have exceeded their priority SLA: Critical 4h, High 8h, Medium 24h, Low 72h |
| **Ticket Aging** | 4 bucket cards (<1d, 1–3d, 3–7d, >7d) showing ticket count + sorted table of oldest tickets |

---

### Knowledge Base

- Browse by category + full-text search
- View count per article (incremented on `GET /kb/:id`)
- **Helpful ratings** — thumbs up/down stored as `helpful` and `notHelpful` counters in KbArticle
- Staff inline editing — pencil button opens edit form (title, content, category, tags, published toggle)
- Staff create/delete
- KB articles surfaced in chatbot and on KB page alike

---

### Email Notifications

All emails use a branded HTML template (`wrap()` in `email.js`) with dark background, coral logo, and priority/status color chips. Sent via Gmail REST API (OAuth2 — port 443, never blocked by Render free tier).

| Event | Recipient | Function |
|---|---|---|
| Ticket created | Submitter | `sendTicketCreated` |
| Status changed | Submitter | `sendStatusChanged` |
| Comment added | Submitter | `sendCommentAdded` |
| Ticket assigned | Assignee | `sendTicketAssigned` |
| Ticket escalated | Submitter | `sendTicketEscalated` |
| Password changed | Account owner | `sendPasswordChanged` |
| Weekly digest | All active users (opt-in) | `sendWeeklyDigest` |

Each `send*` call checks `notificationPrefs` before sending (respects `emailEnabled`, `ticketUpdates`, `newComments`).

---

### Weekly Digest Cron

`node-cron` schedule: `0 8 * * 1` (every Monday 08:00 UTC). On each run:
1. Fetches all active users
2. For each user, counts tickets created in last 7 days
3. Skips users with 0 tickets that week
4. Calls `sendWeeklyDigest(user, { total, resolved, open, recentActivity })` with per-user stats

---

### User & Admin Management

- `/admin/users` — paginated user table with `userSearch` filter bar
- Per-user row shows name, email, role badge, status, 2FA indicator
- Admin can: change role (user/agent/admin), toggle isActive
- Activity log (`/admin/logs`) — all admin actions timestamped

---

### Settings & Profile

**Profile page:**
- Edit: name, department, phone, job title, location
- Avatar upload (Cloudinary)
- Password change form with strength meter and show/hide toggle
- **Quick Actions grid** (6 tiles): New Ticket, My Tickets, KB, Notifications, Export Data, Settings

**Settings page:**
- Dark/light theme toggle
- 2FA setup (email OTP or TOTP) or disable
- Notification preferences: email on/off, ticket updates, new comments, weekly digest; each pref saved immediately via `PUT /users/notifications`
- **Activity Logging** (replaces old Keyboard Shortcuts section): enable/disable toggle + 3 log levels — All Events (`detailed`), Info & Errors (`info_error`), Errors Only (`errors_only`); persisted in localStorage (`hd_log_enabled`, `hd_log_level`)

---

### Progressive Web App

- `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- Manifest: name `HiTicket`, theme color `#7c3aed`, display `standalone`
- Workbox strategy: `NetworkFirst` for all `/api/` routes (fresh data, graceful offline fallback)
- Installable on Chrome desktop + Android; Add to Home Screen on iOS

---

### Onboarding & UX Polish

| Feature | Detail |
|---|---|
| Onboarding tour | 5-step animated modal on first login; stored in `hd_onboarded` localStorage key; auto-shown after 800ms delay |
| Keyboard shortcuts modal | `?` key (or Navbar button); 3 sections: Navigation, Chatbot, General; styled `<kbd>` chips |
| Command palette | `⌘K` / `Ctrl+K`; searchable navigation to all major pages |
| Copy ticket ID | Clipboard API in TicketCard; green checkmark feedback for 1.5s |
| Due date badge | Gray "Due Mar 25" or red "Overdue · Mar 25" chip in TicketCard |
| Watcher toggle | Watch/unwatch button in TicketDetail; shows watcher count; own ID synced correctly from localStorage |
| Copy share link | Copies current URL; 2s "Copied!" feedback in TicketDetail |
| Print button | `window.print()` in TicketDetail |
| Confetti | CSS particle burst when ticket marked Resolved |
| Sort in My Tickets | Dropdown: Newest / Oldest / Priority / Recently Updated |
| Responsive | Navbar collapses to hamburger + BottomNav on mobile (`< md`) |

---

## Page 4 — Security & Data Models

### Security Implementation (OWASP Top 10)

| OWASP Risk | Mitigation |
|---|---|
| Broken Access Control | Every route: `protect` middleware (JWT verify + tokenVersion check). Role routes: `adminOnly` / `agentOrAdmin`. Users can only access own tickets. Internal notes stripped from user API responses. |
| Cryptographic Failures | bcrypt cost 12 for passwords. JWT HS256 + secret. TOTP secrets never returned in responses (`select: false`). OTP: server-side expiry enforced. |
| Injection (NoSQL) | `express-mongo-sanitize` strips `$` and `.` from req.body / query / params on every request. |
| Injection (XSS) | Helmet sets `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`. Markdown in ChatBubble rendered with escape-first approach. |
| Security Misconfiguration | Helmet: 12 HTTP security headers. CORS: explicit whitelist + `*.vercel.app`. Body limit: 50kb. `trust proxy: 1` for accurate rate-limit IPs. |
| Rate Limiting | Global: 200 req / 15 min per IP. Auth: 10 failed req / 15 min per IP (skipSuccessfulRequests). OTP resend: 5 req / 10 min. |
| Identification & Auth Failures | `tokenVersion` bump on every login/logout invalidates all prior tokens. 2FA-pending temp tokens rejected for API access. Inactivity auto-logout on frontend. |
| Software Integrity Failures | Dependencies locked via `package-lock.json`. `.npmrc` `legacy-peer-deps` only for Vercel build compat. |
| SSRF | No user-supplied URLs fetched server-side. Cloudinary upload uses memory buffer (no disk), MIME-type-validated. |
| File Upload Safety | multer: max 5 files per request. Files stored in memory → streamed to Cloudinary (no local disk). Files referenced by `publicId` for server-side delete. |

---

### Data Models

#### User.js
```
{
  name:       String (required, trimmed)
  email:      String (required, unique, lowercase)
  password:   String (required, min 6, bcrypt hashed, select:false)
  role:       'user' | 'agent' | 'admin'  (default: 'user')
  department: String
  phone:      String
  jobTitle:   String
  location:   String
  isActive:   Boolean (default: true)
  tokenVersion: Number (default: 0) — incremented on login/logout
  notificationPrefs: {
    emailEnabled:  Boolean (default: true)
    ticketUpdates: Boolean (default: true)
    newComments:   Boolean (default: true)
    weeklyDigest:  Boolean (default: false)
  }
  twoFactor: {
    enabled:          Boolean (default: false)
    method:           'email' | 'totp'
    totpSecret:       String (select: false)
    pendingOtp:       String (select: false)
    pendingOtpExpiry: Date   (select: false)
  }
  createdAt, updatedAt (timestamps: true)
}
```

**Hooks:** `pre('save')` — if `password` modified, `bcrypt.hash(password, 12)`. Method `matchPassword(entered)` → `bcrypt.compare`.

#### Ticket.js
```
{
  ticketId:    String (unique, auto-generated TKT-NNNN)
  title:       String (required, trimmed)
  description: String (required)
  category:    String (required)
  subType:     String
  priority:    'Low' | 'Medium' | 'High' | 'Critical'
  status:      'Open' | 'In Progress' | 'Resolved' | 'Closed'
  createdBy:   ObjectId → User (required)
  assignedTo:  String (agent name)
  dueDate:     Date (default: null) — NEW
  watchers:    [ObjectId → User]   — NEW
  comments:    [{
    text, author (ObjectId), authorName, createdAt, updatedAt
  }]
  internalNotes: [{
    text, author (ObjectId), authorName, authorRole, createdAt, updatedAt
  }]
  history: [{
    action, field, from, to, by (ObjectId), byName, createdAt, updatedAt
  }]
  attachments: [{
    url, publicId, filename, mimetype, size, uploadedBy (ObjectId), uploaderName
  }]
  satisfaction: {
    rating (1–5), feedback, submittedAt
  }
  resolvedAt: Date
  createdAt, updatedAt (timestamps: true)
}
```

**Hooks:** `pre('save')` — if new, auto-assigns `TKT-NNNN` (finds last ticketId, increments); pushes "Ticket created" to history. If `status` modified to `Resolved`, sets `resolvedAt`.

#### KbArticle.js
```
{
  title:       String (required, trimmed)
  content:     String (required)
  category:    String (default: 'General')
  tags:        [String]
  author:      ObjectId → User
  authorName:  String
  isPublished: Boolean (default: true)
  views:       Number (default: 0)
  helpful:     Number (default: 0)    — NEW
  notHelpful:  Number (default: 0)    — NEW
  createdAt, updatedAt (timestamps: true)
}
```

---

## Page 5 — API Reference

### Middleware Chain (server.js)

```
Request
  → helmet (12 security headers)
  → trust proxy: 1
  → globalLimiter (200 req/15min)
  → cors (whitelist + *.vercel.app)
  → express.json (50kb limit)
  → express.urlencoded (50kb limit)
  → mongoSanitize
  → route handler
  → global error handler (logs stack, returns {error})
```

### Auth Routes — `/api/auth`

| Method | Path | Rate Limit | Description |
|---|---|---|---|
| POST | `/register` | authLimiter (10/15m) | Creates user; bcrypt on save; returns full JWT |
| POST | `/login` | authLimiter | Validates creds; if 2FA enabled → returns `{requires2FA, tempToken, method}`; else → full JWT + bumps tokenVersion |
| POST | `/2fa/verify` | authLimiter | Validates OTP/TOTP against `tempToken`; returns full JWT + bumps tokenVersion |
| POST | `/2fa/resend` | otpLimiter (5/10m) | Regenerates OTP for pending login (email method only) |
| POST | `/2fa/setup/email` | protect + otpLimiter | Sends setup verification OTP to user's email |
| POST | `/2fa/setup/email/verify` | protect | Confirms OTP; stores `twoFactor.enabled=true, method='email'` |
| POST | `/2fa/setup/totp` | protect | Generates TOTP secret; returns base32 secret + QR data URL |
| POST | `/2fa/setup/totp/verify` | protect | Confirms first TOTP code; enables 2FA with `method='totp'` |
| POST | `/2fa/disable` | protect | Requires valid TOTP/OTP code; disables 2FA |

### Ticket Routes — `/api/tickets`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public/:ticketId` | None | Returns safe fields only (ticketId, title, status, priority, category, dates) |
| GET | `/` | protect | User → own tickets; staff → all; supports `?status`, `?priority`, `?category`, `?q`, `?limit` |
| GET | `/stats` | agentOrAdmin | Counts by status |
| GET | `/:id` | protect | Full ticket; internal notes stripped for users; access denied if not owner |
| POST | `/` | protect | Create; round-robin auto-assigns to least-loaded agent; sends `sendTicketCreated` |
| PATCH | `/:id` | protect | Update status/assignedTo/comment/satisfaction; users can only reopen; triggers emails |
| POST | `/:id/notes` | agentOrAdmin | Append internal note |
| POST | `/:id/attachments` | protect | multer.array('files', 5) → Cloudinary upload stream |
| DELETE | `/:id/attachments/:aid` | protect | Cloudinary delete by publicId + remove from array |
| PATCH | `/bulk` | agentOrAdmin | Batch status update |
| DELETE | `/bulk` | adminOnly | Batch hard delete |
| DELETE | `/:id` | adminOnly | Hard delete |
| PATCH | `/:id/watch` | protect | Toggle watcher ObjectId in `watchers[]`; returns `{watching, watcherCount}` |
| PATCH | `/:id/due-date` | agentOrAdmin | Sets or clears `dueDate`; body `{dueDate: <ISO string> | null}` |

### User Routes — `/api/users`

All routes require `protect` unless noted.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile` | protect | Returns `req.user` (without password) |
| PUT | `/profile` | protect | Updates name, department, phone, jobTitle, location |
| PUT | `/notifications` | protect | Dot-notation `$set` for notificationPrefs fields |
| POST | `/change-password` | protect | Validates currentPassword; sets new pw; triggers pre-save bcrypt |
| GET | `/` | adminOnly | All users sorted by `createdAt desc` |
| PATCH | `/:id` | adminOnly | Update `role` (validated enum) or `isActive` |

### KB Routes — `/api/kb`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | protect | List articles; supports `?q` text search, `?category` |
| GET | `/:id` | protect | Single article; increments `views` |
| POST | `/` | agentOrAdmin | Create article |
| PUT | `/:id` | agentOrAdmin | Update article |
| DELETE | `/:id` | agentOrAdmin | Delete article |
| POST | `/:id/helpful` | protect | Body `{vote: 'yes'|'no'}` → increments `helpful` or `notHelpful` |

### Other Routes

| Route | Auth | Description |
|---|---|---|
| `GET /api/logs` | adminOnly | Activity log entries |
| `POST /api/feedback` | Public | Submit post-resolution survey |
| `GET /api/feedback` | adminOnly | List all feedback |
| `GET /api/health` | None | `{status: 'ok', time}` |

---

## Page 6 — UI, Design System & Flow Diagrams

### Authentication Flow

```
User enters email + password
        │
        ▼
POST /api/auth/login
        │
   ┌────┴─────────────────────────────────────────────┐
   │ Wrong credentials or inactive                     │
   │    → 401/403 error shown on Login page            │
   └──────────────────────────────────────────────────┘
        │ Correct credentials
        ▼
   2FA enabled?
   ┌────┴──────┐
  NO          YES
   │           │
   │           ▼
   │   Short-lived tempToken (10 min, type='2fa-pending')
   │           │
   │   Email OTP method?      TOTP method?
   │   ┌───────┴──────┐      └──────────────────┐
   │   │              │                          │
   │   OTP sent       User can                   User opens
   │   to email       request resend             Authenticator app
   │   └──────────────┘                          │
   │           │                                 │
   │   POST /api/auth/2fa/verify (code + tempToken)
   │           │
   │   ┌───────┴──────────────────┐
   │   │ Invalid code             │ Valid code
   │   │ → 401 error              ▼
   │                    tokenVersion++
   │                    Full JWT issued (30 days)
   │                             │
   └─────────────────────────────┘
                   │
                   ▼
   localStorage: { token, userRole, userName, userId }
   AuthContext updated → App re-renders to authenticated state
   OnboardingTour shown if hd_onboarded not in localStorage
```

### Ticket Creation Flow

```
User opens /chatbot
        │
        ▼
[Step 1] Select category (tile or free text)
   Auto-categorization applies keyword regex
        │
        ▼
[Step 2] Select sub-type chip for chosen category
        │
        ▼
[Step 3] Answer detail questions
   Background: GET /api/kb?q=<description>
   → Up to 3 matching articles shown as chips
   → User can click to read or dismiss
        │
        ▼
[Step 4] Confirm — shows title, category, priority
        │
        ▼
POST /api/tickets {title, description, category, subType, priority}
        │
        ▼
Server: getNextAgent() → round-robin least-loaded agent
Ticket saved → auto ticketId TKT-NNNN
        │            └─── sendTicketCreated email (async)
        ▼
Chatbot shows "Ticket TKT-NNNN created" confirmation
TicketDetail page linked
```

### Data Transfer Flow

```
Browser                         Render (Express)              MongoDB Atlas
───────                         ────────────────              ─────────────
1. axios.get('/api/tickets')
   Header: Authorization: Bearer <JWT>
                          ──────────────▶
                          2. protect middleware:
                             jwt.verify(token, JWT_SECRET)
                             decoded.tokenVersion === user.tokenVersion?
                             User.findById(decoded.id)
                                                        ──────────────▶
                                                        3. Ticket.find(filter)
                                                        ◀──────────────
                          4. Strip internalNotes if !isStaff
                          ◀──────────────
5. React state updated
   tickets array re-rendered
```

### Email Delivery Flow

```
Post-ticket create (async, non-blocking):
        │
        ▼
sendTicketCreated(ticket, user)
        │
   Check: user.notificationPrefs.emailEnabled && ticketUpdates
        │
        ▼
   getGmailClient()
   → OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET)
   → setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN })
   → google.gmail({ version: 'v1', auth })
        │
        ▼
   buildRaw(to, subject, html)
   → RFC 2822 message string → base64url encoded
        │
        ▼
   gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
        │
        ▼
   Email delivered via Gmail REST API (port 443 — never blocked)
```

---

### Design System

**Colour Palette**

| Token | Hex | Usage |
|---|---|---|
| Brand blue (accent) | `#3b82f6` | CTA buttons, links, KPI tiles, gradient headers |
| Background | `#09090b` | Page background (dark) |
| Card surface | `#18181b` | Panels, cards, modals |
| Input / landing card | `#111113` | Form inputs, landing section cards, table heads |
| Alt section bg | `#0d0d0f` | Landing alternate sections, dark cards |
| Elevated surface | `#27272a` | Table rows, hover states |
| Border subtle | `#3f3f46` | Dividers, hover borders |
| Text primary | `#fafafa` | Headings, labels |
| Text secondary | `#a1a1aa` | Body text, captions |
| Text muted | `#52525b` | Placeholders, hints |
| Text subtle | `#71717a` | Very muted text |
| Green | `#22c55e` | Open status, success, SLA OK |
| Amber | `#f59e0b` | In Progress, SLA warning, internal notes |
| Blue | `#3b82f6` | Low priority, info, primary accent |
| Cyan | `#06b6d4` | Resolved status, timeline |
| Red | `#ef4444` | Critical priority, SLA breach, overdue, delete |
| Orange | `#f97316` | High priority |
| Purple | `#8b5cf6` | Comments, admin, KPI tile |

**Page structure (inner pages):** `PageWrapper` → `Breadcrumb` → gradient header `bg-gradient-to-r from-[#3b82f6]/8 via-[#6366f1]/4 to-transparent border border-[#3b82f6]/15` → full-width content with `w-full px-4 sm:px-6 lg:px-8 py-5` (NO `max-w-*` constraints).

**Key UI Patterns**

| Pattern | Implementation |
|---|---|
| Skeleton loaders | `.skeleton` shimmer CSS class on async-loading areas |
| Toast notifications | `ToastContext` portal — stacked, auto-dismiss 3s |
| Page transitions | `page-enter` keyframe — fade + translateY on route change |
| Command palette | `⌘K` — focuses search input; keyboard-navigable results |
| Confetti | CSS particle burst on ticket Resolved |
| Responsive nav | Navbar hamburger menu + BottomNav tabs on `< md` |
| SLA banner | Color-coded progress bar in TicketDetail header |
| Markdown | ChatBubble: escape-first regex substitution (bold, italic, code, links) |

---

## Page 7 — Deployment & Environment

### Deployment Architecture

```
GitHub (monorepo: /IT Ticketing/)
       │
       ├── helpdesk-ai/ ──── Vercel project
       │                         - Build: npm run build (Vite)
       │                         - Output: dist/
       │                         - Env: VITE_API_URL
       │                         - .npmrc: legacy-peer-deps=true
       │
       └── helpdesk-api/ ─── Render Web Service
                                 - Start: node server.js
                                 - Env: MONGO_URI, JWT_SECRET, CLIENT_URL,
                                        EMAIL_USER, EMAIL_FROM,
                                        GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
                                        GMAIL_REFRESH_TOKEN,
                                        CLOUDINARY_CLOUD_NAME,
                                        CLOUDINARY_API_KEY,
                                        CLOUDINARY_API_SECRET
```

### Environment Variables

**Backend (`helpdesk-api/.env`)**
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hiticket
JWT_SECRET=<random 64-char secret>
CLIENT_URL=https://hiticket.vercel.app

EMAIL_USER=your@gmail.com
EMAIL_FROM=HiTicket <your@gmail.com>
GMAIL_CLIENT_ID=<google-cloud-oauth-client-id>
GMAIL_CLIENT_SECRET=<google-cloud-oauth-client-secret>
GMAIL_REFRESH_TOKEN=<refresh-token-from-oauth-playground>

CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

**Frontend (`helpdesk-ai/.env`)**
```
VITE_API_URL=https://<your-render-slug>.onrender.com/api
```

---

## Page 8 — Changelog & Roadmap

### All Implemented Features (by version)

**v1.0 — Core Platform**
- JWT authentication + bcrypt
- Ticket CRUD with status/priority/category
- Admin dashboard (charts, leaderboard)
- Knowledge base
- Gmail API email notifications
- Cloudinary file attachments
- Role system (user/agent/admin)
- Command palette (⌘K)
- Public ticket status page

**v2.0 — Major Feature Release**
- TOTP 2FA (QR code enrollment via speakeasy)
- Email OTP 2FA
- Admin SLA Breach tab + Ticket Aging tab
- Date range filter in Admin Dashboard (7d/30d/90d/All)
- Chatbot KB deflection (articles surfaced before ticket submit)
- 6 ticket templates in chatbot (`/template`)
- KB helpful/not-helpful ratings
- Password change with 5-level strength meter
- Onboarding tour (5-step, first-login, animated)
- Keyboard shortcuts modal (`?` key)
- Due date assignment and display (badge in TicketCard)
- Ticket watchers (toggle watch, watcher count)
- PWA (vite-plugin-pwa, workbox NetworkFirst)
- Weekly digest cron (node-cron Monday 08:00 UTC)
- Enhanced HTML email design (branded dark theme)
- `sendTicketAssigned`, `sendTicketEscalated`, `sendPasswordChanged` emails
- Post-resolution survey + admin feedback results page
- Activity log page (admin)

**v4.0 — UI Overhaul & Quality of Life**
- Home page complete dual-mode rewrite: new authenticated dashboard + new landing page
- Reports page full-screen rewrite with `PageWrapper` + `Breadcrumb` + gradient header
- Settings: Activity Logging replaces Keyboard Shortcuts; 3 log levels; gap fix
- Profile: Quick Actions 6-tile grid replaces recent tickets section
- Navbar: longest-match active-state algorithm (no multi-item highlight)
- Global styled selects: `appearance: none` + SVG chevron in `index.css`
- Chatbot: live history via `useEffect` on every message
- `activityLog.js`: added `errors_only` severity level
- Stale SW / PWA cache resolved via forced redeploy + SW unregister

**v3.0 — Polish & Bug Fixes**
- `userId` correctly stored in localStorage (critical fix for Watch feature)
- Password show/hide toggle on Login page
- Sort dropdown in My Tickets (Newest / Oldest / Priority / Recently Updated)
- Due-date badge in TicketCard (gray → red overdue)
- Copy ticket ID button in TicketCard (clipboard API, 1.5s feedback)
- User search bar in User Management
- KB article inline editing for staff
- Copy share link + Print button in TicketDetail
- `?` help button in Navbar
- Logout clears `userId` from localStorage
- `.npmrc` `legacy-peer-deps=true` for Vercel vite@8 / vite-plugin-pwa compat

### Roadmap

| Feature | Priority | Notes |
|---|---|---|
| WebSocket / SSE live updates | High | Real-time comments without polling |
| SSO (Google / Microsoft OAuth) | Medium | passport.js OAuth2 strategy |
| Multi-language / i18n | Medium | react-i18next |
| Mobile app | Low | React Native sharing this API |
| AI priority prediction | Low | OpenAI / fine-tuned classifier |
| Multi-tenant / department isolation | Low | Workspace scoping |

---

*HiTicket · Built with React 19, Express, MongoDB Atlas · March 2026*
