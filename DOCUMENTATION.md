# HiTicket — Full Technical Documentation

> Complete reference covering architecture, authentication, data flows, encryption, UI system, API, security, and deployment.  
> Version: 4.0 · Date: March 2026

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Repository Structure](#2-repository-structure)
3. [Authentication & Encryption](#3-authentication--encryption)
4. [Data Transfer Flows](#4-data-transfer-flows)
5. [Database Models](#5-database-models)
6. [API Reference](#6-api-reference)
7. [Frontend Pages](#7-frontend-pages)
8. [Component Library](#8-component-library)
9. [Email System](#9-email-system)
10. [File Upload System](#10-file-upload-system)
11. [Security Implementation](#11-security-implementation)
12. [Chatbot Logic](#12-chatbot-logic)
13. [Admin Dashboard Logic](#13-admin-dashboard-logic)
14. [Progressive Web App](#14-progressive-web-app)
15. [Scheduled Jobs](#15-scheduled-jobs)
16. [Deployment & CI/CD](#16-deployment--cicd)
17. [Environment Variables](#17-environment-variables)
18. [Keyboard Shortcuts & UX Features](#18-keyboard-shortcuts--ux-features)
19. [Error Handling](#19-error-handling)
20. [Changelog](#20-changelog)

---

## 1. System Architecture

### Overview

HiTicket is a decoupled full-stack web application with three infrastructure tiers:

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENT TIER                                                        │
│                                                                     │
│  Browser / PWA                                                      │
│  React 19 SPA (Vite 8)                                              │
│  Tailwind CSS v3 · Recharts · React Router v7 · Axios               │
│                                                                     │
│  Hosted: Vercel (CDN-distributed static assets)                     │
│  URL: https://hiticket.vercel.app                                   │
└───────────────────────┬─────────────────────────────────────────────┘
                        │  HTTPS (port 443) REST JSON
                        │  Authorization: Bearer <JWT>
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  APPLICATION TIER                                                   │
│                                                                     │
│  Node.js 20 + Express 4                                             │
│  helmet · cors · express-rate-limit · express-mongo-sanitize        │
│  jsonwebtoken · bcryptjs · speakeasy · multer · node-cron           │
│                                                                     │
│  Hosted: Render Web Service                                         │
│  Port: 10000 (Render assigns; $PORT env var)                        │
└─────┬─────────────────────────────────────────────────────────┬─────┘
      │  Mongoose ODM (TLS)                                      │  OAuth2 (HTTPS)
      ▼                                                          ▼
┌─────────────────────┐                              ┌────────────────────────┐
│  MongoDB Atlas      │                              │  Gmail REST API        │
│  (shared M0 cluster)│                              │  (googleapis v1)       │
│  Collections:       │                              │  Port 443 only         │
│  · users            │                              └────────────────────────┘
│  · tickets          │
│  · kbarticles       │                              ┌────────────────────────┐
│  · activitylogs     │                              │  Cloudinary CDN        │
│  · feedbacks        │                              │  File storage +        │
└─────────────────────┘                              │  transformation        │
                                                     └────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Stateless JWT (not sessions) | Scales horizontally; no server-side session store needed on Render |
| Gmail REST API not SMTP | Render free tier blocks outbound ports 465/587; REST API uses port 443 |
| Cloudinary not local disk | Render ephemeral filesystem; Cloudinary provides CDN + resize transforms |
| MongoDB not SQL | Ticket sub-documents (comments, history, attachments) map naturally to BSON |
| React SPA not SSR | No SEO requirement; SPA simplifies deployment to static CDN |
| Vite not CRA | 10x faster HMR; native ESM; better tree-shaking |
| vite-plugin-pwa | Enables offline capability and home-screen install without a separate service worker |

---

## 2. Repository Structure

```
/IT Ticketing/                    ← git root
├── helpdesk-ai/                  ← Frontend
│   ├── .npmrc                    ← legacy-peer-deps=true (PWA compat)
│   ├── vite.config.js            ← Vite + PWA plugin config
│   ├── tailwind.config.js        ← Tailwind theme + content paths
│   ├── postcss.config.js         ← autoprefixer
│   ├── index.html                ← Root HTML (title, favicon, PWA meta)
│   ├── package.json              ← Dependencies: react@19, vite@8, etc.
│   └── src/
│       ├── App.jsx               ← Router root + route guards + key handlers
│       ├── main.jsx              ← ReactDOM.createRoot
│       ├── index.css             ← Tailwind directives + global CSS animations
│       ├── App.css               ← Minimal app-level styles
│       ├── api/
│       │   └── api.js            ← Axios instance with auth interceptor
│       ├── context/
│       │   ├── AuthContext.jsx   ← user, token, login(), logout()
│       │   ├── ThemeContext.jsx  ← isDark toggle; localStorage
│       │   └── ToastContext.jsx  ← addToast(), portal toast stack
│       ├── hooks/
│       │   ├── useInactivityLogout.js
│       │   └── useScrollHide.js
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Login.jsx
│       │   ├── Chatbot.jsx
│       │   ├── MyTickets.jsx
│       │   ├── TicketDetail.jsx
│       │   ├── AdminDashboard.jsx
│       │   ├── UserManagement.jsx
│       │   ├── KnowledgeBase.jsx
│       │   ├── TicketStatus.jsx
│       │   ├── Profile.jsx
│       │   ├── Settings.jsx
│       │   ├── ActivityLog.jsx
│       │   ├── Survey.jsx
│       │   ├── FeedbackResults.jsx
│       │   └── NotFound.jsx
│       └── components/
│           ├── layout/
│           │   ├── Navbar.jsx
│           │   ├── BottomNav.jsx
│           │   ├── Breadcrumb.jsx
│           │   ├── PageWrapper.jsx
│           │   └── ScrollToTop.jsx
│           ├── ui/
│           │   ├── StatCard.jsx
│           │   ├── Badge.jsx
│           │   ├── Card.jsx
│           │   ├── Modal.jsx
│           │   └── Avatar.jsx
│           ├── CommandPalette.jsx
│           ├── OnboardingTour.jsx
│           ├── KeyboardShortcutsModal.jsx
│           ├── ChatBubble.jsx
│           ├── OTPInput.jsx
│           └── TicketCard.jsx
│
└── helpdesk-api/                 ← Backend
    ├── server.js                 ← Express app + middleware + cron
    ├── package.json
    ├── middleware/
    │   └── auth.js               ← protect · agentOrAdmin · adminOnly
    ├── models/
    │   ├── User.js
    │   ├── Ticket.js
    │   └── KbArticle.js
    ├── routes/
    │   ├── auth.js
    │   ├── tickets.js
    │   ├── users.js
    │   ├── kb.js
    │   ├── logs.js
    │   └── feedback.js
    └── utils/
        ├── email.js
        └── storage.js
```

---

## 3. Authentication & Encryption

### Password Storage

Passwords are **never stored in plaintext**. The flow:

```
Registration:
  1. User submits { name, email, password }
  2. User.create({ name, email, password, role: 'user' })
  3. Mongoose pre('save') hook fires:
       if (this.isModified('password'))
         this.password = await bcrypt.hash(this.password, 12)
  4. Database stores: $2b$12$<22-char salt><31-char hash>

   Cost factor 12 = 2^12 = 4096 bcrypt rounds
   ~250ms on modern hardware — slow enough to defeat rainbow tables

Login comparison:
  user.matchPassword(entered) → bcrypt.compare(entered, this.password)
  → timing-safe constant-time comparison
```

### JWT Architecture

```
Token structure (HS256):
  Header:  { "alg": "HS256", "typ": "JWT" }
  Payload: { "id": "<userId>", "tokenVersion": <n>, "iat": <unix>, "exp": <unix+30d> }
  Signature: HMAC-SHA256(base64url(header) + "." + base64url(payload), JWT_SECRET)

Token types:
  1. Full session token  — expiresIn: '30d'  — used for all authenticated API calls
  2. 2FA temp token      — expiresIn: '10m'  — type: '2fa-pending'; rejected by protect middleware

protect middleware validation:
  1. Extract Bearer token from Authorization header
  2. jwt.verify(token, JWT_SECRET) → decoded
  3. Reject if decoded.type === '2fa-pending'
  4. User.findById(decoded.id).select('-password')
  5. If decoded.tokenVersion !== user.tokenVersion → 401 (token invalidated)
  6. Set req.user = user; call next()

Token invalidation:
  - On every login: user.tokenVersion++ (old tokens from prior sessions rejected)
  - On logout: tokenVersion++ invalidates all tokens for that user
  - On password change: pre-save hook chains through login → tokenVersion bumps
```

### Two-Factor Authentication

#### Email OTP Flow

```
Login (2FA=email):
  1. POST /api/auth/login → credentials valid
  2. Server: generateOTP() → 6-digit random string
  3. user.twoFactor.pendingOtp = otp
     user.twoFactor.pendingOtpExpiry = now + 10 minutes
     user.save({ validateBeforeSave: false })
  4. sendOTPEmail(user.email, user.name, otp)  [async, non-blocking]
  5. Response: { requires2FA: true, tempToken, method: 'email' }

Verification:
  1. POST /api/auth/2fa/verify { tempToken, code }
  2. jwt.verify(tempToken) → decoded.type must equal '2fa-pending'
  3. User.findById(decoded.id).select('+twoFactor.pendingOtp +twoFactor.pendingOtpExpiry')
  4. Check: new Date() < pendingOtpExpiry
  5. Check: code === pendingOtp  (string comparison)
  6. Clear pendingOtp + pendingOtpExpiry
  7. tokenVersion++ → full JWT issued
```

#### TOTP Flow

```
Setup:
  1. POST /api/auth/2fa/setup/totp (authenticated)
  2. speakeasy.generateSecret({ name: `HiTicket (${user.email})`, length: 20 })
  3. QRCode.toDataURL(secret.otpauth_url) → base64 data URL
  4. Store secret.base32 temporarily; return to client
  5. Client shows QR code for Google Authenticator / Authy to scan

Verification:
  1. POST /api/auth/2fa/setup/totp/verify { token: '123456' }
  2. speakeasy.totp.verify({ secret: base32, encoding: 'base32', token, window: 2 })
     window: 2 allows ±60 seconds clock drift
  3. On success: save secret, user.twoFactor.enabled=true, method='totp'

Login (2FA=totp):
  1. After credential check → tempToken issued (no OTP email sent)
  2. User enters code from authenticator app
  3. POST /api/auth/2fa/verify { tempToken, code }
  4. speakeasy.totp.verify(...) with window:2
  5. On success: tokenVersion++ → full JWT
```

### Frontend Token Storage

```
localStorage keys:
  token     — full JWT string
  userRole  — 'user' | 'agent' | 'admin'
  userName  — display name
  userId    — MongoDB ObjectId string (used for Watch feature)

Axios interceptor (api/api.js):
  request.use(config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  response.use(null, error => {
    if (error.response?.status === 401) {
      // Clear localStorage and redirect to /login
    }
    return Promise.reject(error)
  })
```

---

## 4. Data Transfer Flows

### Standard Authenticated Request

```
Browser                    Vercel CDN              Render (Express)           MongoDB Atlas
───────                    ──────────              ─────────────────          ─────────────
1. User action triggers
   React handler

2. axios.patch('/tickets/ID', { status: 'Resolved' })
   ↳ Interceptor adds:
     Authorization: Bearer eyJ...

3. ──────── HTTPS POST ────────────────────────────────────────────▶

                                                4. Middleware chain:
                                                   helmet → rate limiter → CORS
                                                   → body parse → mongoSanitize
                                                   → protect (JWT verify)
                                                   → route handler

                                                5. Ticket.findById(id)
                                                                      ──────────▶
                                                                      6. MongoDB query
                                                                      ◀──────────

                                                7. Validate ownership/role
                                                8. Mutate ticket fields
                                                9. ticket.save()
                                                                      ──────────▶
                                                                      10. Write to Atlas
                                                                      ◀──────────

                                                11. Response: { ticket: {...} }
4. ◀──────── HTTPS 200 JSON ──────────────────────────────────────────

12. React updates state
    → Re-render ticket status badge
    → Toast: "Status updated"

(Async, non-blocking):
13. sendStatusChanged(ticket, user, oldStatus, newStatus)
    ↳ Gmail API call → email delivered
```

### File Upload Flow

```
User selects files in TicketDetail
        │
        ▼
FormData.append('files', file) [up to 5]
        │
        ▼
axios.post('/tickets/:id/attachments', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
        │
        ▼
Multer (memoryStorage):
  - Receives file buffers (never touch disk)
  - No size/type validation here (add explicitly if hardening further)
        │
        ▼
uploadToCloud(file.buffer, { public_id: 'ticket_TKT-XXXX_<ts>_<name>' })
  ↳ cloudinary.uploader.upload_stream(options, callback)
  ↳ stream.end(buffer)
        │
        ▼
Cloudinary:
  - Stores file to CDN
  - Returns { secure_url, public_id, ... }
        │
        ▼
ticket.attachments.push({ url, publicId, filename, mimetype, size, uploaderName })
ticket.save()
        │
        ▼
Response: { attachments: [...] }
        │
        ▼
Frontend re-renders attachment list with CDN URLs
```

### Weekly Digest Cron Flow

```
node-cron: '0 8 * * 1' (every Monday 08:00 UTC)
        │
        ▼
User.find({ isActive: true }).lean()
        │
        ▼
For each user:
  Ticket.find({
    createdBy: user._id,
    createdAt: { $gte: oneWeekAgo }
  }).lean()
        │
  ┌─────┴─────────────────┐
  0 tickets this week     Has tickets
  → skip                       │
                               ▼
                         sendWeeklyDigest(user, {
                           total, resolved, open, recentActivity
                         })
                               │
                               ▼
                         Gmail API → email delivered to user
```

---

## 5. Database Models

### User Schema (`models/User.js`)

```javascript
{
  name:       String   // required, trimmed
  email:      String   // required, unique, lowercase
  password:   String   // required, min 6 chars, bcrypt hashed, select:false
  role:       String   // enum: ['user', 'agent', 'admin'], default: 'user'
  department: String   // default: 'General'
  phone:      String   // default: ''
  jobTitle:   String   // default: ''
  location:   String   // default: ''
  isActive:   Boolean  // default: true — deactivated users cannot log in
  tokenVersion: Number // default: 0 — incremented on login/logout

  notificationPrefs: {
    emailEnabled:  Boolean  // master switch for all emails
    ticketUpdates: Boolean  // ticket status change emails
    newComments:   Boolean  // comment notification emails
    weeklyDigest:  Boolean  // Monday digest opt-in (default: false)
  }

  twoFactor: {
    enabled:          Boolean  // 2FA active?
    method:           String   // 'email' | 'totp'
    totpSecret:       String   // base32 TOTP secret — select:false (never sent to client)
    pendingOtp:       String   // current active email OTP — select:false
    pendingOtpExpiry: Date     // OTP expiry timestamp — select:false
  }

  // Auto: createdAt, updatedAt (timestamps: true)
}

Hooks:
  pre('save'): if password modified → bcrypt.hash(password, 12)
Methods:
  matchPassword(entered): bcrypt.compare(entered, this.password) → Promise<boolean>
```

### Ticket Schema (`models/Ticket.js`)

```javascript
// Sub-schemas:
commentSchema: {
  text:       String  // required
  author:     ObjectId → User
  authorName: String
  // Auto: createdAt, updatedAt
}

internalNoteSchema: {
  text:       String  // required — NEVER returned to users
  author:     ObjectId → User
  authorName: String
  authorRole: String
  // Auto: createdAt, updatedAt
}

historySchema: {
  action:  String  // human-readable description
  field:   String  // which field changed
  from:    String  // previous value
  to:      String  // new value
  by:      ObjectId → User
  byName:  String
  // Auto: createdAt, updatedAt
}

attachmentSchema: {
  url:          String  // Cloudinary secure_url
  publicId:     String  // Cloudinary public_id (for deletion)
  filename:     String  // original filename
  mimetype:     String  // MIME type
  size:         Number  // bytes
  uploadedBy:   ObjectId → User
  uploaderName: String
  // Auto: createdAt, updatedAt
}

// Main schema:
ticketSchema: {
  ticketId:    String   // unique, auto TKT-NNNN
  title:       String   // required, trimmed
  description: String   // required
  category:    String   // required
  subType:     String   // 'New Account', 'Password Reset', etc.
  priority:    String   // enum: ['Low','Medium','High','Critical']
  status:      String   // enum: ['Open','In Progress','Resolved','Closed']
  createdBy:   ObjectId → User  // required
  assignedTo:  String   // agent display name
  dueDate:     Date     // null by default; set by staff
  watchers:    [ObjectId → User]  // users watching this ticket
  comments:    [commentSchema]
  internalNotes: [internalNoteSchema]
  history:     [historySchema]
  attachments: [attachmentSchema]
  satisfaction: {
    rating:      Number  // 1–5
    feedback:    String
    submittedAt: Date
  }
  resolvedAt:  Date  // set when status → 'Resolved'
  // Auto: createdAt, updatedAt
}

Hooks:
  pre('save'):
    if isNew:
      → find last TKT-XXXX ticket by createdAt desc
      → increment number, pad to 4 digits: TKT-0001
      → push 'Ticket created' to history
    if status modified to 'Resolved' && !resolvedAt:
      → resolvedAt = new Date()
```

### KbArticle Schema (`models/KbArticle.js`)

```javascript
{
  title:       String  // required, trimmed
  content:     String  // required — Markdown text
  category:    String  // default: 'General'
  tags:        [String]
  author:      ObjectId → User
  authorName:  String
  isPublished: Boolean  // default: true
  views:       Number   // incremented on GET /:id
  helpful:     Number   // thumbs-up votes
  notHelpful:  Number   // thumbs-down votes
  // Auto: createdAt, updatedAt
}
```

---

## 6. API Reference

### Middleware Chain (per request)

```
helmet()                   → 12 HTTP security headers
trust proxy: 1             → accurate IP behind Render load balancer
globalLimiter              → 200 req / 15 min per IP
cors(whitelist)            → explicit origins only (CLIENT_URL + localhost ports)
express.json({ limit:'50kb' })
express.urlencoded({ limit:'50kb' })
mongoSanitize()            → strip $ and . from all input
route handlers
global error handler       → { error: message }
```

### Auth — `POST /api/auth/register`

**Rate limit:** authLimiter (10/15min failed)  
**Body:** `{ name, email, password }`  
**Logic:**
1. Validate all fields present
2. Check email uniqueness
3. `User.create()` → pre-save bcrypt fires
4. `signToken(user._id, user.tokenVersion)` → JWT 30d
5. **Response 201:** `{ token, user: { id, name, email, role } }`

---

### Auth — `POST /api/auth/login`

**Rate limit:** authLimiter  
**Body:** `{ email, password }`  
**Logic:**
1. `User.findOne({ email }).select('+password +tokenVersion +twoFactor.*')`
2. `user.matchPassword(password)` — bcrypt.compare
3. If `!user.isActive` → 403
4. If `user.twoFactor.enabled`:
   - For email method: generate OTP, save to user, send OTP email
   - Issue `tempToken` (10m, type=`2fa-pending`)
   - **Response:** `{ requires2FA: true, tempToken, method }`
5. If no 2FA: `tokenVersion++`, save, issue full JWT
   - **Response:** `{ token, user: { id, name, email, role } }`

---

### Auth — `POST /api/auth/2fa/verify`

**Rate limit:** authLimiter  
**Body:** `{ tempToken, code }`  
**Logic:**
1. `jwt.verify(tempToken)` — must be type `2fa-pending`
2. Load user with 2FA fields (select: false)
3. If email method: compare `code === pendingOtp`, check expiry, clear OTP
4. If TOTP method: `speakeasy.totp.verify({ secret, token: code, window: 2 })`
5. `tokenVersion++`, save, issue full JWT
   - **Response:** `{ token, user }`

---

### Tickets — `POST /api/tickets`

**Auth:** protect  
**Body:** `{ title, description, category, subType?, priority? }`  
**Logic:**
1. Validate required fields
2. `getNextAgent()` — round-robin: fetches all active agents, counts open tickets per agent, picks least-loaded
3. `Ticket.create({..., assignedTo: autoAgent?.name, createdBy: req.user._id})`
4. pre-save hook: auto ticketId, initial history entry
5. Retry loop (3 attempts) handles rare ticketId collision (code 11000)
6. `populate('createdBy', 'name email')`
7. **Response 201:** `{ ticket }`
8. Async (non-blocking): `sendTicketCreated(ticket, user)`

---

### Tickets — `PATCH /api/tickets/:id`

**Auth:** protect (owner or staff)  
**Body:** `{ status?, assignedTo?, comment?, satisfaction? }`  
**Logic:**
1. Fetch ticket; verify ownership (users) or role (staff)
2. If `status` changed: push to `history`; update field; users can only set `'Open'` (reopen)
3. If `assignedTo` changed (staff only): push to `history`
4. If `comment` provided: push `commentSchema` to `ticket.comments`
5. If `satisfaction.rating` provided and no existing rating: save CSAT
6. `ticket.save()`
7. Strip `internalNotes` from response if user (not staff)
8. Async: send status email if status changed; send comment email if comment added

---

### Tickets — `PATCH /api/tickets/:id/watch`

**Auth:** protect  
**Logic:**
1. Find ticket
2. Check if `req.user._id` is in `ticket.watchers`
3. If watching → filter out; if not → push
4. `ticket.save()`
5. **Response:** `{ watching: bool, watcherCount: number }`

---

### Tickets — `PATCH /api/tickets/:id/due-date`

**Auth:** agentOrAdmin  
**Body:** `{ dueDate: '<ISO string>' | null }`  
**Logic:**
1. `Ticket.findByIdAndUpdate(id, { dueDate: dueDate ? new Date(dueDate) : null }, { new: true })`
2. **Response:** `{ dueDate }`

---

### Users — `POST /api/users/change-password`

**Auth:** protect  
**Body:** `{ currentPassword, newPassword }`  
**Logic:**
1. Validate both fields present; `newPassword.length >= 8`
2. `User.findById(req.user._id).select('+password')`
3. `user.matchPassword(currentPassword)` — if false → 401
4. `user.password = newPassword` (plain text)
5. `user.save()` → pre-save hook bcrypt hashes it
6. **Response:** `{ message: 'Password changed successfully' }`

---

### KB — `POST /api/kb/:id/helpful`

**Auth:** protect  
**Body:** `{ vote: 'yes' | 'no' }`  
**Logic:**
1. `KbArticle.findByIdAndUpdate(id, { $inc: { helpful: +1 } })` or `notHelpful`
2. **Response:** `{ helpful, notHelpful }`

---

## 7. Frontend Pages

### Home.jsx

**Purpose:** Dual-mode page — renders the authenticated dashboard for logged-in users, or the marketing landing page for anonymous visitors.

**Authenticated Dashboard:**
- `Breadcrumb`: `[{ label: 'Home' }]`
- **Command Center Header**: greeting + firstName, role badges (admin/agent/ticket count), inline "New Ticket" button (→ `/chatbot`)
- **6-KPI ribbon** (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`): Open (green), In Progress (amber), Resolved (blue), Critical (red), Resolution% (purple), Total (cyan) — each has icon, large colored number, label, glow blob; loading shows 6 skeleton tiles
- **Empty state** (if total=0): centered card → Raise a Ticket button
- **Overdue alert banner** (if any overdue tickets)
- **Quick nav tiles** (4): AI Chatbot, My Tickets, Calendar, Reports — each with trailing chevron
- **3-col grid**: LEFT (ticket timeline divide-y rows, ticket overview donut+status bars); RIGHT (by priority inline bars, top categories bars, admin tools panel or user CTA card)

**Unauthenticated Landing Page sections:**
1. Sticky nav: LogoMark | How It Works, Features, Use Cases, Survey | Sign In btn — `bg-[#09090b]/95 backdrop-blur-xl`
2. Hero: ambient glow blobs, gradient headline, CTA buttons, social proof avatars, ticket mockup card, floating status badges
3. KPI ribbon: 4-cell `divide-x` strip — 2,400+ Resolved, 98% Satisfaction, <2h Resolution, 8s Ticket Created
4. How It Works (`id="how-it-works"`): centered header, 4-col card grid with step number watermarks
5. Features (`id="features"`): bento grid — lg:col-span-2 hero card + 4 smaller feature cards on `bg-[#0d0d0f]`
6. Roles (`id="roles"`): 3-col cards — Students, IT Staff & Agents, Admins & Managers
7. Tech Stack: horizontal flex badge strip on `bg-[#0d0d0f]`
8. Survey CTA: split card — amber left, dark survey preview right; seamless `overflow-hidden` join
9. Final CTA: gradient wash, LogoMark centered, two action buttons
10. Footer: 3 cols (brand + tagline | Product links | Info links); `© 2026 HiTicket` + green operational dot

**Constants (kept):** `PRIORITY_COLOR`, `STATUS_COLOR`, `STATUS_BG`
**Constants (removed):** `avatarColors`, `avatarInitials`, `features[]`, `Bar` component — all replaced by inline JSX
**Added import:** `Breadcrumb` from `../components/layout/Breadcrumb`

---

### Login.jsx

**Purpose:** Authentication — supports register, login, 2FA verification (both email OTP and TOTP).

**State:** `mode` (login/register), `form` (email, password, name), `showPw` (password visibility toggle), `loading`, `error`, `requires2FA`, `tempToken`, `twoFaMethod`, `otpCode`

**Login flow:**
1. POST `/api/auth/login`
2. If `requires2FA: true` → store `tempToken`, render OTP input
3. POST `/api/auth/2fa/verify` → on success, `login(token, user)` from AuthContext
4. `localStorage.setItem('token', token)`, `localStorage.setItem('userId', user.id)` ← critical for Watch feature

**Validations:** Email format, password min 6 chars, name required for register.

**UI:** Dark card, brand coral logo, email + password fields (with show/hide toggle eye button), animated gradient background, OTP 6-box input on 2FA step, error banner, loading spinner.

---

### Chatbot.jsx

Full documentation in [Section 12 — Chatbot Logic](#12-chatbot-logic).

---

### MyTickets.jsx

**Purpose:** End-user ticket list with filters, search, sort.

**State:** `tickets`, `loading`, `filters` (status, priority, category, search query), `sortBy`

**Sort options:**
```javascript
const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest First'        },
  { value: 'oldest',   label: 'Oldest First'        },
  { value: 'priority', label: 'Priority (High→Low)' },
  { value: 'updated',  label: 'Recently Updated'    },
]

const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 }
```

Sort is applied client-side after fetch. Filter parameters passed to `GET /api/tickets?status=&priority=&category=&q=`.

**UI:** Filter bar (status/priority/category dropdowns + search input + sort dropdown), ticket grid, `TicketCard` per ticket.

---

### TicketDetail.jsx

**Purpose:** Full ticket view for owner and staff.

**State:** `ticket`, `comment`, `loading`, `watching`, `watchLoading`, `dueDateInput`, `dueDateSaving`, `editing` (internal notes), `attachFiles`

**Key handlers:**
- `handleWatch()` → `PATCH /tickets/:id/watch`; syncs `watching` from `ticket.watchers.includes(userId)`
- `handleSaveDueDate()` → `PATCH /tickets/:id/due-date` with ISO string
- Due date clear → calls same endpoint with `null` directly (no intermediate state — fixes race condition)
- `CopyLinkButton` → `navigator.clipboard.writeText(window.location.href)`; shows "Copied!" for 2s
- Print → `window.print()`
- Staff can add internal notes, change status, reassign

**UI sections:**
1. Back + toolbar (Copy Link, Print)
2. Ticket header: title, ID (copy button), priority badge, status badge, SLA bar
3. Watch button (watcher count) + Due date picker (staff) or display (user)
4. Description
5. Attachments (upload + delete)
6. Comments thread (Markdown rendered)
7. Internal Notes panel (staff only, amber theme)
8. Audit History timeline
9. CSAT form (when status = Resolved, rating not yet submitted)

---

### AdminDashboard.jsx

Full documentation in [Section 13](#13-admin-dashboard-logic).

---

### UserManagement.jsx

**Purpose:** Admin user table — view, search, edit roles, activate/deactivate.

**State:** `users`, `loading`, `userSearch`, `editing` (per-user inline edit state)

**Search:** `userSearch` state filters `users` array client-side by name or email.

**Actions per user:** Role dropdown (user/agent/admin), isActive toggle — each saves immediately via `PATCH /api/users/:id`.

---

### KnowledgeBase.jsx

**Purpose:** Browse, search, rate, and edit KB articles.

**State:** `articles`, `selectedArticle`, `searchQuery`, `categoryFilter`, `mode` (browse/view/create), `editingId`, `editForm`, `editSaving`

**Inline editing (staff):**
1. Click pencil button → `startEdit(article)` populates `editForm`
2. Edit title, content (textarea), category, tags (comma-separated), published toggle
3. `handleUpdate()` → `PUT /api/kb/:id`; clears `editingId` on success

**Helpful rating:**
- Thumbs up → `POST /api/kb/:id/helpful { vote: 'yes' }`
- Thumbs down → `POST /api/kb/:id/helpful { vote: 'no' }`

---

### Reports.jsx

**Purpose:** Advanced analytics page with date range filter, KPI cards, charts, and data export.

**Layout:** `PageWrapper` → `Breadcrumb` (`[{ label: 'Reports' }]`) → gradient header (`bg-gradient-to-r from-[#3b82f6]/8 via-[#6366f1]/4 to-transparent border border-[#3b82f6]/15`) → full-width content.

**Features:**
- KPI cards with gradient backgrounds; skeleton loading state
- Date preset buttons (7d / 30d / 90d / All)
- Charts using Recharts (line chart + bar chart) styled with design system tokens
- SVG empty state when no data available
- Full-screen width layout matching all other inner pages (`w-full` — no `max-w-*` constraints)

---

### Profile.jsx

**Purpose:** Edit profile info, change password, access quick actions.

**Password change flow:**
1. Three fields: current password, new password, confirm new password
2. `getPasswordStrength(pw)` computed on every keystroke:
   - Score increments for: length≥8, length≥12, uppercase, lowercase, number, special char
   - Returns `{ score: 0–5, label: 'Weak'|'Fair'|'Good'|'Strong'|'Very Strong', color }`
3. `handleChangePassword()` → `POST /api/users/change-password`

Show/hide toggles on all 3 password fields individually.

**Quick Actions grid** (replaced old Recent Tickets section):
6 tiles arranged in a responsive grid — New Ticket (→ `/chatbot`), My Tickets (→ `/my-tickets`), Knowledge Base (→ `/knowledge-base`), Notifications (→ `/settings`), Export Data, Settings (→ `/settings`). Each tile shows an icon, label, and trailing chevron.

---

### Settings.jsx

**Purpose:** App preferences, 2FA management, notification preferences, activity logging.

**Sections:**
1. **Appearance** — dark/light toggle (ThemeContext)
2. **Two-Factor Authentication** — enable/disable; choose method (email/TOTP); TOTP setup shows QR code
3. **Notifications** — 4 toggles: emailEnabled, ticketUpdates, newComments, weeklyDigest; each saved immediately via `PUT /api/users/notifications`
4. **Activity Logging** (replaced old Keyboard Shortcuts section) — toggle on/off + 3 level buttons:
   - **All Events** (`detailed`) — every action logged
   - **Info & Errors** (`info_error`) — informational + error events only
   - **Errors Only** (`errors_only`) — only `error` and `critical` severity events
   - State: `loggingEnabled` (localStorage `hd_log_enabled`), `logLevel` (localStorage `hd_log_level`)
   - Wrapped in `<div className="mb-5">` to maintain gap with Account card below

---

## 8. Component Library

### Navbar.jsx

**Features:**
- Logo (HiTicket brand wordmark)
- Navigation links (Home, Tickets, KB, Admin — role-gated)
- **Longest-match active-state algorithm** (`NavDropdown`): iterates all configured paths and marks `isActive = true` only for the longest prefix that matches `currentPath` — prevents multiple items being highlighted simultaneously (e.g. `/admin/users` won't also highlight `/admin`)
- `?` button → dispatches `'?'` keydown event → triggers `KeyboardShortcutsModal` in App.jsx
- `⌘K` hint badge → opens CommandPalette
- Notification bell → last 5 ticket updates
- Avatar dropdown → Profile, Settings, Logout
- `useScrollHide` hook → hides on scroll-down, reveals on scroll-up
- Mobile: hamburger menu (full-screen overlay)

**Logout handler:**
```javascript
localStorage.removeItem('token')
localStorage.removeItem('userRole')
localStorage.removeItem('userName')
localStorage.removeItem('userId')     // ← CRITICAL: clears watcher identity
logout()  // AuthContext clears state
navigate('/login')
```

---

### TicketCard.jsx

**Props:** `ticket` (full ticket object)

**Features:**
- Status badge (color-coded chip)
- Priority badge (color-coded)
- **Due date badge:** gray "Due Mar 25" if future, red "Overdue · Mar 25" if `dueDate < now`
- **Copy ID button:** `navigator.clipboard.writeText(ticket.ticketId)`; icon swaps to green checkmark for 1.5s via `copied` state
- Category chip, assignee, created date
- Click → navigate to `/tickets/:id`

---

### OnboardingTour.jsx

**Logic:**
- Renders if `!localStorage.getItem('hd_onboarded')`
- Shown 800ms after mount (setTimeout)
- 5 steps with different accent colors:
  1. Welcome (coral) — platform intro
  2. Chatbot (violet) — AI ticket creation
  3. My Tickets (blue) — tracking
  4. Knowledge Base (green) — self-service
  5. Shortcuts (amber) — keyboard power user tips
- Step dots + Prev/Next/Skip/Get Started buttons
- On complete OR skip: `localStorage.setItem('hd_onboarded', '1')`, hide modal

---

### KeyboardShortcutsModal.jsx

**Trigger:** `?` keydown event (not inside input/textarea)  
**Three sections:**

| Section | Shortcuts |
|---|---|
| **Navigation** | ⌘K (palette), ⌘N (new ticket), G+H (Home), G+T (Tickets), G+K (KB), G+P (Profile) |
| **Chatbot** | /status, /agent, /template, /kb, /clear, Esc |
| **General** | ? (this modal), Esc (close), Tab (navigate), Enter (submit) |

Each shortcut rendered as `<kbd>` chips with dark glass styling.

---

### CommandPalette.jsx

**Trigger:** `⌘K` or `Ctrl+K` keydown in App.jsx  
**Logic:**
- Text input with real-time fuzzy filter over a static list of routes/actions
- Keyboard navigation: ArrowUp / ArrowDown, Enter to select, Esc to close
- Items: Home, New Ticket, My Tickets, Knowledge Base, Admin Dashboard, Profile, Settings, Activity Log

---

### ChatBubble.jsx

**Props:** `message` (text or HTML), `role` ('user'|'bot')

**Markdown rendering:**
```javascript
// Applied in order:
text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="...">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, '<br>')
```

`dangerouslySetInnerHTML` is used only after this escape-first transformation on bot-generated content (not user input).

---

### OTPInput.jsx

**Props:** `length` (default 6), `onChange(value)`  
**Logic:** Array of `<input>` elements; on keydown advances focus to next; on backspace retreats; on paste splits characters across fields.

---

## 9. Email System

### Architecture

All email is sent via the **Gmail REST API** (not SMTP). This is a deliberate architectural choice — Render's free tier blocks outbound SMTP ports 465 and 587. The Gmail API uses port 443 (HTTPS), which is never blocked.

```
utils/email.js:
  getGmailClient()
    → new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'https://developers.google.com/oauthplayground')
    → auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN })
    → google.gmail({ version: 'v1', auth })

  buildRaw(to, subject, html):
    → Construct RFC 2822 message string
    → Buffer.from(message).toString('base64url')

  gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
```

### HTML Email Template

All emails use the `wrap(title, body)` function:
- Dark background (`#0a0a0a` page, `#18181b` card)
- Gradient header with HiTicket logo (coral `<span>`)
- Responsive 600px max-width table layout
- Priority chips: color-coded border + background (Critical=red, High=orange, Medium=blue, Low=green)
- Status chips: Open=green, In Progress=amber, Resolved=cyan, Closed=gray
- Footer: "Log in to manage your notification preferences"

### Send Functions

| Function | Trigger | Checks |
|---|---|---|
| `sendOTPEmail(email, name, otp)` | 2FA login, 2FA setup | Always sends (no pref check) |
| `sendTicketCreated(ticket, user)` | POST /tickets | `wantsEmail && wantsUpdates` |
| `sendStatusChanged(ticket, user, oldStatus, newStatus)` | PATCH /tickets status change | `wantsEmail && wantsUpdates` |
| `sendCommentAdded(ticket, user, comment)` | PATCH /tickets with comment | `wantsEmail && wantsComments` |
| `sendTicketAssigned(ticket, assigneeEmail)` | Ticket assigned to agent | Agent's prefs |
| `sendTicketEscalated(ticket, user)` | Manual escalation | `wantsEmail && wantsUpdates` |
| `sendPasswordChanged(email, name)` | POST /users/change-password | Always sends (security alert) |
| `sendWeeklyDigest(user, stats)` | Monday 08:00 UTC cron | `weeklyDigest === true` |

All `send*` calls are made **outside the request-response cycle** using `.catch(() => {})` to ensure email errors never fail the API response.

---

## 10. File Upload System

### Architecture

```
utils/storage.js:
  multer({ storage: multer.memoryStorage() })
    → Files stored in RAM buffer (never hit disk)
    → req.files[i].buffer available in route handler

  uploadToCloud(buffer, options):
    → cloudinary.uploader.upload_stream(options, (err, result) => ...)
    → stream.end(buffer)
    → Returns: { secure_url, public_id, ... }

  deleteFromCloud(publicId, resourceType):
    → cloudinary.uploader.destroy(publicId, { resource_type })
```

### Upload Route

```
POST /api/tickets/:id/attachments
  multer.array('files', 5)  ← max 5 files per request
  → authenticate ownership (protect + ownership check)
  → Promise.all(req.files.map(uploadToCloud))
  → push each result to ticket.attachments
  → ticket.save()
  → return { attachments }
```

### Deletion Route

```
DELETE /api/tickets/:id/attachments/:attachmentId
  → find attachment by sub-document ID
  → deleteFromCloud(att.publicId, mimetype.startsWith('image') ? 'image' : 'raw')
  → att.deleteOne()  (Mongoose sub-doc removal)
  → ticket.save()
```

### Security Considerations

- Files are never written to server disk
- Cloudinary public IDs are structured: `ticket_<ticketId>_<timestamp>_<sanitized_filename>`
- Malicious filenames are sanitized: `originalname.replace(/[^a-zA-Z0-9]/g, '_')`
- The `secure_url` returned by Cloudinary uses HTTPS

---

## 11. Security Implementation

### OWASP Top 10 Mapping

#### A01 — Broken Access Control

**Server-side enforcement on every route:**

```javascript
// protect middleware — EVERY authenticated route
const decoded = jwt.verify(token, JWT_SECRET)
if (decoded.type === '2fa-pending') return 401  // temp tokens rejected
if (decoded.tokenVersion !== user.tokenVersion) return 401  // invalidated tokens rejected

// Ownership check — tickets
if (!isStaff && ticket.createdBy.toString() !== req.user._id.toString())
  return 403 'Access denied'

// Staff-only data
if (!isStaff) {
  const t = ticket.toObject()
  delete t.internalNotes  // never sent to users
}

// Role middleware composition
router.get('/', adminOnly, ...)    // admin only
router.post('/:id/notes', agentOrAdmin, ...)  // staff only
```

#### A02 — Cryptographic Failures

| Asset | Protection |
|---|---|
| User passwords | bcrypt salt+hash (cost 12) — 4096 rounds |
| JWT | HS256 signed with 64-char secret; 30-day expiry |
| TOTP secrets | `select: false` — never returned in any API response |
| OTP codes | `select: false`; server-side expiry check |
| MongoDB TLS | Atlas requires TLS; Mongoose default TLS connection |
| API transport | HTTPS enforced by Vercel/Render; HSTS header via Helmet |

#### A03 — Injection

```javascript
// NoSQL injection prevention
app.use(mongoSanitize())
// strips { $where: '...' } and { 'email.$gt': '' } patterns
// removes $ and . from req.body, req.query, req.params

// Mongoose schema validation
// All fields typed — ObjectId, String, Boolean — Mongoose rejects wrong types
```

#### A05 — Security Misconfiguration

```javascript
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary
  contentSecurityPolicy: false, // Vercel manages CSP on frontend
}))
// Sets: X-DNS-Prefetch-Control, X-Frame-Options: SAMEORIGIN,
//       Strict-Transport-Security, X-Download-Options,
//       X-Content-Type-Options: nosniff, X-Permitted-Cross-Domain-Policies,
//       Referrer-Policy: no-referrer, X-XSS-Protection: 0

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)  // same-origin / curl
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
```

#### A07 — Identification and Authentication Failures

```javascript
// Rate limiter on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,  // only count failed attempts
  message: { error: 'Too many attempts. Please wait 15 minutes.' }
})

// Token versioning — all sessions invalidated on password change or logout
user.tokenVersion = (tokenVersion || 0) + 1
await user.save({ validateBeforeSave: false })
const token = signToken(user._id, user.tokenVersion)

// 2FA temp token cannot be used for API access
if (decoded.type === '2fa-pending') return 401
```

### Rate Limiting Tiers

| Limiter | Routes | Max | Window | Notes |
|---|---|---|---|---|
| `globalLimiter` | All routes | 200 | 15 min | Broad protection |
| `authLimiter` | `/register`, `/login`, `/2fa/verify` | 10 | 15 min | Failed attempts only |
| `otpLimiter` | `/2fa/resend`, `/2fa/setup/*` | 5 | 10 min | OTP flood prevention |

---

## 12. Chatbot Logic

### Chat Engine (Chatbot.jsx)

The chatbot is a **state-machine-based conversational UI**, not an LLM. Responses are deterministic and driven by the current `step` state.

```
Steps:
  0: Initial greeting + category selection
  1: Category tiles shown (8 tiles + free text)
  2: Sub-type chips for selected category
  3: Detail questions + KB deflection
  4: Confirmation + submit
```

### Auto-Categorization

```javascript
const CATEGORY_KEYWORDS = {
  Hardware:  /laptop|computer|mouse|keyboard|monitor|printer|hardware|device|screen|disk/i,
  Software:  /software|app|application|install|crash|error|update|virus|antivirus/i,
  Network:   /internet|wifi|network|vpn|connection|ethernet|slow|dns|proxy/i,
  Access:    /password|login|account|access|permission|locked|reset|credentials/i,
  Email:     /email|outlook|gmail|mailbox|smtp|imap|calendar/i,
  Printer:   /print|printer|scanner|scan|cartridge|toner/i,
  VPN:       /vpn|remote|tunnel|cisco|pulse|zscaler/i,
  Other:     /.*/  // fallback
}
```

When user types free text, keywords are matched in order. First match wins. The detected category is shown as a chip; user can override.

### Priority Detection

```javascript
const URGENT_KEYWORDS = /urgent|critical|emergency|not working|broken|down|asap|immediately|production|outage/i
const HIGH_KEYWORDS   = /important|soon|failing|error|cannot|can't|won't|blocked|need help/i

if (URGENT_KEYWORDS.test(description)) priority = 'Critical'
else if (HIGH_KEYWORDS.test(description)) priority = 'High'
else priority = 'Medium'
```

### KB Deflection (Step 3)

```javascript
// Before showing confirmation step:
async function handleStep3(description) {
  const res = await api.get('/kb', { params: { q: description } })
  const suggestions = res.data.articles.slice(0, 3)

  if (suggestions.length > 0) {
    setKbSuggestions(suggestions)
    addBotMessage(`Before I submit, I found ${suggestions.length} related article(s).
      Would you like to check them first?`)
    // Renders article chips: [Article Title] [Dismiss]
  } else {
    _presentConfirm()
  }
}
```

### Slash Commands

| Command | Handler |
|---|---|
| `/status` | Prompts for ticket ID → `GET /tickets/public/:id` → shows status |
| `/agent` | Shows "Requesting agent handoff..." + contact details |
| `/template` | Renders template selection grid (6 templates) |
| `/kb` | Prompts for search term → `GET /kb?q=<term>` → shows articles |
| `/clear` | Resets chat to step 0 |

### Ticket Templates

```javascript
const TICKET_TEMPLATES = [
  {
    label: 'Reset Password',
    category: 'Access',
    subType: 'Password Reset',
    title: 'Password Reset Request',
    description: 'I need to reset my account password.',
    priority: 'Medium',
  },
  {
    label: 'VPN Access',
    category: 'Network',
    subType: 'VPN Setup',
    title: 'VPN Access Request',
    description: 'I need VPN credentials to access internal resources remotely.',
    priority: 'Medium',
  },
  // ... 4 more
]
```

On template select → pre-fills all fields → goes directly to confirmation step.

---

## 13. Admin Dashboard Logic

### Tabs

```javascript
const [activeTab, setActiveTab] = useState('overview')  // 'overview' | 'sla' | 'aging'
```

### Overview Tab

**Data:** `GET /api/tickets/stats` (KPI counts) + `GET /api/tickets` (full list for charts)

**Chart data computation (client-side):**

```javascript
// 30-day volume line chart
const last30 = tickets.filter(t => new Date(t.createdAt) >= thirtyDaysAgo)
const byDay = groupBy(last30, t => formatDate(t.createdAt))
const lineData = last30Days.map(day => ({ date: day, count: byDay[day]?.length || 0 }))

// Category distribution
const catCounts = countBy(tickets, 'category')
const barData = Object.entries(catCounts).map(([name, count]) => ({ name, count }))

// Agent leaderboard (resolved)
const agentResolved = tickets
  .filter(t => ['Resolved', 'Closed'].includes(t.status))
  .reduce((acc, t) => { acc[t.assignedTo] = (acc[t.assignedTo] || 0) + 1; return acc }, {})
```

**Date range filter:**

```javascript
const [chartRange, setChartRange] = useState(30)  // 7 | 30 | 90 | 0 (all)
const filtered = chartRange === 0
  ? tickets
  : tickets.filter(t => new Date(t.createdAt) >= subDays(new Date(), chartRange))
```

### SLA Breach Tab

```javascript
const SLA_HOURS = { Critical: 4, High: 8, Medium: 24, Low: 72 }

const slaBreached = tickets
  .filter(t => ['Open', 'In Progress'].includes(t.status))
  .filter(t => {
    const ageHours = (Date.now() - new Date(t.createdAt)) / 3_600_000
    return ageHours > (SLA_HOURS[t.priority] || 24)
  })
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
```

Rendered as a table with columns: Ticket ID, Title, Priority, Status, Assignee, Age (hours), SLA Limit (hours), Overdue By.

### Ticket Aging Tab

```javascript
const now = Date.now()
const ageMs = t => now - new Date(t.createdAt).getTime()
const ageHours = t => ageMs(t) / 3_600_000
const ageDays = t => ageHours(t) / 24

const buckets = {
  under1d:  tickets.filter(t => ageDays(t) < 1),
  one3d:    tickets.filter(t => ageDays(t) >= 1 && ageDays(t) < 3),
  three7d:  tickets.filter(t => ageDays(t) >= 3 && ageDays(t) < 7),
  over7d:   tickets.filter(t => ageDays(t) >= 7),
}
```

---

## 14. Progressive Web App

### Configuration (`vite.config.js`)

```javascript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'HiTicket',
    short_name: 'HiTicket',
    theme_color: '#7c3aed',
    background_color: '#141414',
    display: 'standalone',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  workbox: {
    runtimeCaching: [{
      urlPattern: /\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    }],
  },
})
```

### Caching Strategy

**NetworkFirst** for `/api/` routes:
- Try network first (10s timeout)
- If network fails, serve from cache (up to 5 min old, max 50 entries)
- Ensures fresh data when online; graceful degradation when offline

**Static assets** (JS, CSS, images): Pre-cached by service worker on install (default Workbox precache).

### Installation

- Chrome desktop: install icon in address bar
- Android: "Add to Home Screen" prompt
- iOS Safari: Share → Add to Home Screen

---

## 15. Scheduled Jobs

### Weekly Digest (node-cron)

**Schedule:** `0 8 * * 1` — every Monday at 08:00 UTC  
**Timezone:** UTC (explicitly set in cron options)

**Full implementation:**

```javascript
cron.schedule('0 8 * * 1', async () => {
  const users = await User.find({ isActive: true }).lean()

  for (const user of users) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const tickets = await Ticket.find({
      createdBy: user._id,
      createdAt: { $gte: oneWeekAgo },
    }).lean()

    if (!tickets.length) continue  // skip idle users

    const resolved = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length
    const recent = tickets.slice(0, 5).map(t => ({
      ticketId: t.ticketId,
      title: t.title,
      status: t.status,
    }))

    await sendWeeklyDigest(user, {
      total: tickets.length,
      resolved,
      open: tickets.length - resolved,
      recentActivity: recent,
    })
  }
}, { timezone: 'UTC' })
```

**Email content:** User's ticket summary for the past 7 days — total count, resolved count, open count, list of up to 5 recent ticket titles with statuses.

**Opt-in:** Only sent if `user.notificationPrefs.weeklyDigest === true` (checked inside `sendWeeklyDigest`).

---

## 16. Deployment & CI/CD

### Frontend — Vercel

```yaml
# Auto-detected from package.json "build" script
Build Command: npm run build
Output Directory: dist/
Install Command: npm install (uses .npmrc legacy-peer-deps=true)
Environment Variables:
  VITE_API_URL: https://<render-slug>.onrender.com/api
```

**`.npmrc` file:**
```
legacy-peer-deps=true
```
This resolves the peer dependency conflict between `vite-plugin-pwa@1.2.0` (which declares `vite@^7`) and the project's `vite@8.0.0`. Without this, Vercel's `npm install` throws `ERESOLVE` and the build fails.

### Backend — Render

```yaml
Service Type: Web Service
Build Command: npm install
Start Command: node server.js
Environment: Node 20
Auto-deploy: On push to main branch
```

**Important:** Render free tier spins down instances after 15 minutes of inactivity. The first request after spin-down may take 25–40 seconds while the instance cold-starts.

### Git Strategy

```
/IT Ticketing/     ← Single git repo root
├── helpdesk-ai/   ← Vercel project root (subdirectory deploy)
└── helpdesk-api/  ← Render project root (subdirectory deploy)
```

Both Vercel and Render support subdirectory roots — configured in their respective project settings.

---

## 17. Environment Variables

### Backend (`helpdesk-api/.env`)

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/hiticket` |
| `JWT_SECRET` | HS256 signing secret (min 32 chars, ideally 64) | `openssl rand -hex 64` |
| `PORT` | Server port (auto-set by Render) | `5000` |
| `CLIENT_URL` | Frontend origin for CORS whitelist | `https://hiticket.vercel.app` |
| `EMAIL_USER` | Gmail sender address | `yourapp@gmail.com` |
| `EMAIL_FROM` | Display name + address | `HiTicket <yourapp@gmail.com>` |
| `GMAIL_CLIENT_ID` | Google Cloud OAuth2 client ID | `123456789-xxx.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | Google Cloud OAuth2 client secret | `GOCSPX-...` |
| `GMAIL_REFRESH_TOKEN` | Long-lived refresh token from OAuth Playground | `1//...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier | `dxxxxxxxx` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcDEFghiJKLmno...` |

### Frontend (`helpdesk-ai/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `https://<slug>.onrender.com/api` |

---

## 18. Keyboard Shortcuts & UX Features

### Global Key Handlers (App.jsx)

```javascript
useEffect(() => {
  const handler = (e) => {
    // ⌘K / Ctrl+K — Command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setCmdOpen(true)
    }
    // ? — Keyboard shortcuts modal (not in text inputs)
    if (e.key === '?' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
      setShortcutsOpen(true)
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

### Keyboard Shortcuts Reference

| Keys | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette |
| `⌘N` / `Ctrl+N` | New ticket |
| `G` then `H` | Go to Home |
| `G` then `T` | Go to My Tickets |
| `G` then `K` | Go to Knowledge Base |
| `G` then `P` | Go to Profile |
| `?` | Open shortcuts modal |
| `Esc` | Close modal / cancel action |

### Chatbot Slash Commands

| Command | Effect |
|---|---|
| `/status` | Inline ticket status lookup |
| `/agent` | Request live agent handoff |
| `/template` | Show 6 pre-built ticket templates |
| `/kb` | Search knowledge base inline |
| `/clear` | Reset conversation |

### Copy & Share Features

| Feature | Mechanism |
|---|---|
| Copy ticket ID | `navigator.clipboard.writeText(ticket.ticketId)` |
| Copy share link | `navigator.clipboard.writeText(window.location.href)` |
| Print ticket | `window.print()` |
| Both copy buttons | Green checkmark feedback for 1.5–2s using `setTimeout` + boolean state |

---

## 19. Error Handling

### Backend

**Global error handler (server.js):**
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})
```

**Route-level try/catch:** Every route handler is wrapped in `try { ... } catch (err) { res.status(500).json({ error: err.message }) }`.

**Async email errors:** All `send*()` calls use `.catch(() => {})` or `.catch(e => console.error(...))` — never propagate to the request handler.

### Frontend

**Axios response interceptor:**
```javascript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear localStorage, redirect to /login
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

**Page-level error state:** Every page component has `const [error, setError] = useState(null)`. Errors from API calls populate a red banner at the top of the page.

**Toast notifications:** Success actions (ticket created, status changed) show green toasts. Errors show red toasts. Implemented via `ToastContext.addToast({ message, type })`.

---

## 20. Changelog

### v4.0 — UI Overhaul & Quality of Life (Commits e5df2ed → 06fe8be)

**Home page — complete dual-mode rewrite:**
- Authenticated dashboard: 6-KPI ribbon, command center header, ticket timeline, donut+bars overview, priority/category charts
- Landing page: new marketing layout across 10 sections (hero with ambient blobs, KPI divide-x strip, bento features grid, roles cards, survey CTA split card, gradient final CTA)
- Removed unused constants: `avatarColors`, `avatarInitials`, `features[]`, `Bar` — replaced with inline JSX
- Added `Breadcrumb` import to authenticated view

**Reports page — full-screen rewrite:**
- `PageWrapper` + `Breadcrumb` added
- Gradient header (`from-[#3b82f6]/8 via-[#6366f1]/4 to-transparent`)
- All colors and tokens aligned to design system

**Settings page:**
- Keyboard Shortcuts section replaced with **Activity Logging** card
- 3 log levels: `detailed` / `info_error` / `errors_only`; persisted in localStorage
- `mb-5` wrapper added to fix gap between Activity Logging and Account cards

**`src/utils/activityLog.js`:**
- Added `errors_only` severity check: `if (logLevel === 'errors_only' && severity !== 'error' && severity !== 'critical') return;`

**Profile page:**
- Removed `recentTickets` state and Recent Tickets section
- Added 6-tile Quick Actions grid (New Ticket, My Tickets, KB, Notifications, Export Data, Settings)

**Navbar:**
- `NavDropdown` now uses longest-match algorithm — only the longest matching prefix path gets `isActive = true`

**`src/index.css`:**
- Global `select { appearance: none; background-image: chevron SVG; padding-right: 1.75rem }`
- `select option { background-color: #18181b; color: #fafafa; }`

**Chatbot:**
- Chat history persists live: `useEffect` calls `saveToHistory(entry)` + `setChatHistory(getHistory())` on every message change

**Stale SW / PWA cache:**
- Forced redeploy with empty commit; instructed service worker unregister to clear stale bundles (double `/api/api/` routing, `handleReopen` error, missing PWA icon)

---

### v3.0 — Bug Fixes & Polish (Commit c237abd)

**Critical Bug Fix:**
- `userId` was never being stored in `localStorage` on login — broke the Watch (watcher toggle) feature entirely. Fixed in `Login.jsx` — `localStorage.setItem('userId', data.user._id)` added to both `storeAuth()` helper and the direct auth code path.
- `logout()` in `Navbar.jsx` now also removes `userId` from localStorage.

**New Features:**
- Password show/hide toggle on Login page (eye icon button)
- Sort dropdown in My Tickets (Newest / Oldest / Priority / Recently Updated)
- Due date badge in TicketCard — gray "Due Mar 25", red "Overdue · Mar 25" when past
- Copy ticket ID button in TicketCard — clipboard API, 1.5s checkmark feedback
- User search bar in UserManagement — client-side filter by name or email
- KB article inline editing for staff — pencil button, inline form, PUT /kb/:id
- Copy share link button in TicketDetail — copies current URL, 2s feedback
- Print button in TicketDetail — `window.print()`
- `?` help button in Navbar — dispatches keydown event to trigger KeyboardShortcutsModal
- Due date clear race condition fixed — calls API directly with `null` instead of relying on state

### v3.0 — Vercel Fix (Commit d168aad)

- Created `/helpdesk-ai/.npmrc` with `legacy-peer-deps=true`
- Fixes Vercel `ERESOLVE` error: `vite-plugin-pwa@1.2.0` peer-declares `vite@^7` but project uses `vite@8.0.0`

### v2.0 — Major Feature Release (Commit 1ff5465)

- Onboarding tour (5-step animated, first-login, localStorage-gated)
- Keyboard shortcuts modal (`?` key, 3 sections)
- Due dates — `dueDate` field in Ticket schema, staff UI, badge in card
- Ticket watchers — `watchers` array in Ticket schema, watch/unwatch API + UI
- PWA — `vite-plugin-pwa`, workbox NetworkFirst for API routes
- Weekly digest cron — `node-cron` Monday 08:00 UTC, per-user ticket summary email
- Admin SLA Breach tab — tickets past their priority SLA threshold
- Admin Ticket Aging tab — 4 buckets + sorted table
- Date range filter in Admin Dashboard (7d / 30d / 90d / All)
- Chatbot KB deflection — KB queries before ticket submission
- 6 ticket templates + `/template` slash command
- KB helpful/not-helpful ratings — `helpful`/`notHelpful` counters in KbArticle
- Password change with 5-level strength meter (Profile page)
- Enhanced HTML email templates — dark theme, priority/status chips
- `sendTicketAssigned`, `sendTicketEscalated`, `sendPasswordChanged` email functions
- Post-resolution survey (`/survey`) + admin feedback results (`/admin/feedback`)
- Activity log page (`/admin/logs`)

### v1.0 — Initial Launch

- JWT authentication + bcrypt
- 2FA (TOTP + email OTP) with QR code enrollment
- Full ticket CRUD lifecycle
- Round-robin auto-assignment
- Admin dashboard (stats, charts, leaderboard)
- Knowledge base
- Gmail API email notifications
- Cloudinary file attachments
- Command palette (⌘K)
- Public ticket status page
- Role system (user / agent / admin)
- Responsive design + mobile bottom navigation

---

*HiTicket · React 19 + Node/Express + MongoDB Atlas · v3.0 · July 2025*
