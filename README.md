# HiTicket — AI-Assisted IT Helpdesk & Ticketing Platform

> **B.Tech Final Year Project Report**  
> Department of Computer Science & Engineering  
> Academic Year: 2025–2026  
> Live Application: [https://hiticket.vercel.app](https://hiticket.vercel.app)

---

## Table of Contents

- [Project Summary](#project-summary)
- [Report Structure](#report-structure)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Key Features](#key-features)
- [Database Design](#database-design)
- [Security Implementation](#security-implementation)
- [API Overview](#api-overview)
- [Module Breakdown](#module-breakdown)
- [Deployment](#deployment)
- [Project Setup](#project-setup)
  - [Prerequisites](#prerequisites)
  - [Step 1 — Clone the Repository](#step-1--clone-the-repository)
  - [Step 2 — Backend Setup](#step-2--backend-setup-helpdesk-api)
  - [Step 3 — Frontend Setup](#step-3--frontend-setup-helpdesk-ai)
  - [Step 4 — Open the Application](#step-4--open-the-application)
  - [Step 5 — Running Both Servers](#step-5--running-both-servers-simultaneously-quick-reference)
  - [Step 6 — Production Build](#step-6--build-for-production-optional)
  - [Troubleshooting](#troubleshooting)
- [Diagrams](#diagrams)
- [Cost Estimation Summary](#cost-estimation-summary)
- [Results & Outcomes](#results--outcomes)
- [Conclusion](#conclusion)
- [References](#references)
- [License](#license)

---

## Project Summary

**HiTicket** is a production-grade, full-stack IT helpdesk and ticketing platform designed to streamline the complete lifecycle of IT support requests within an organization. The system allows end-users to raise support tickets through a conversational, AI-guided chatbot interface, eliminating the complexity and friction typically associated with traditional IT ticketing portals.

Agents and administrators manage workloads from a unified dashboard equipped with real-time KPIs, SLA breach tracking, ticket aging analysis, knowledge base deflection, role-based access control, and automated email digests.

**Core Problem Addressed:** In most organizations, IT support is managed via email threads, spreadsheets, or siloed tools that lack transparency, SLA visibility, and self-service capability. HiTicket addresses this by unifying ticket creation, triage, resolution, and reporting in a single cloud-native application.

| Attribute | Details |
|---|---|
| Project Type | Full-Stack Web Application (SPA + REST API) |
| Frontend URL | [https://hiticket.vercel.app](https://hiticket.vercel.app) |
| Backend Host | Render (Node.js/Express) |
| Database | MongoDB Atlas |
| Auth Mechanism | JWT + 2FA (TOTP + Email OTP) |
| PWA Support | Yes (offline-capable, installable) |

---

## Report Structure

The project report (`REPORT.md`) follows the standard academic structure and covers the following chapters:

| # | Chapter | Key Content |
|---|---|---|
| 1 | **Introduction** | Problem statement, motivation, objectives, scope |
| 2 | **Literature Survey** | Analysis of 12+ research papers and existing systems |
| 3 | **System Requirements** | Functional, non-functional, hardware, and software requirements |
| 4 | **System Architecture & Design** | Three-tier architecture, UML diagrams, data flow |
| 5 | **Technology Stack** | All frameworks, libraries, and external services |
| 6 | **Database Design** | Schema design, relationships, indexes, data models |
| 7 | **System Modules & Implementation** | All 10 modules — auth, tickets, chatbot, KB, admin, email, PWA |
| 8 | **Security Implementation** | OWASP Top 10, rate limiting, sanitization, JWT versioning |
| 9 | **Testing** | Functional test cases, security scenarios, build validation |
| 10 | **Deployment** | Vercel + Render cloud deployment pipeline |
| 11 | **Results & Discussion** | Screenshots, system metrics, performance analysis |
| 12 | **Project Cost Estimation** | Detailed development cost breakdown |
| 13 | **Conclusion & Future Enhancements** | Summary and roadmap |

**Supporting Documents:**
- [`REPORT.md`](./REPORT.md) — Complete academic project report
- [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — Technical executive summary
- [`DOCUMENTATION.md`](./DOCUMENTATION.md) — Full API and module documentation
- [`diagrams/README.md`](./diagrams/README.md) — Guide to all Mermaid diagram files

---

## System Architecture

HiTicket follows a **three-tier client-server architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT TIER (Browser / PWA)                  │
│                  React 19 SPA  ·  Tailwind CSS                  │
│   Hosted on Vercel  ·  CDN-served  ·  Service Worker (PWA)     │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTPS REST API  (JWT Bearer Token)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION TIER (API Server)                  │
│               Node.js 20  ·  Express 4  ·  Mongoose 8           │
│    Auth ·  Tickets ·  KB ·  Users ·  Notifications ·  Cron     │
│                    Hosted on Render                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
           ┌─────────────────┼───────────────────┐
           ▼                 ▼                   ▼
    MongoDB Atlas       Cloudinary          Gmail REST API
   (Primary DB)      (File Storage)      (Email Delivery)
```

### Frontend Architecture

```
src/
├── api/          ← Axios instance with JWT interceptors
├── components/   ← Reusable UI components (Navbar, TicketCard, ChatBubble…)
├── context/      ← ThemeContext, ToastContext (React Context API)
├── hooks/        ← Custom hooks (useOTPTimer, useScrollHide, useInactivityLogout…)
├── pages/        ← Route-level page components (20+ pages)
├── styles/       ← CSS modules for animations, components, pages
└── utils/        ← activityLog, helpers
```

### Backend Architecture

```
helpdesk-api/
├── server.js         ← Express app entry point, middleware pipeline
├── routes/           ← Route declarations (auth, tickets, users, kb, logs…)
├── controllers/      ← Business logic handlers
├── models/           ← Mongoose schemas (User, Ticket, KbArticle, Notification…)
├── middleware/        ← auth.js (JWT verify + role guard)
└── utils/            ← email.js (Gmail OAuth2), storage.js (Cloudinary)
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI component framework |
| Vite | 8.x | Build tool, HMR, PWA plugin |
| Tailwind CSS | 3.x | Utility-first styling |
| Axios | 1.x | HTTP client with interceptors |
| Recharts | 2.x | SVG-based data visualization |
| React Router DOM | 6.x | Client-side routing |
| vite-plugin-pwa | latest | Service worker, offline support |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | JavaScript runtime |
| Express.js | 4.x | REST API framework |
| Mongoose | 8.x | MongoDB ODM / schema definition |
| bcryptjs | 2.x | Password hashing |
| jsonwebtoken | 9.x | JWT creation and verification |
| speakeasy | 2.x | TOTP two-factor authentication |
| node-cron | 3.x | Scheduled jobs (weekly digest) |
| Helmet | 7.x | HTTP security headers |
| express-rate-limit | 7.x | Request rate limiting |
| express-mongo-sanitize | 2.x | NoSQL injection prevention |

### External Services

| Service | Use Case |
|---|---|
| MongoDB Atlas | Cloud-hosted primary database |
| Cloudinary | File attachment storage and CDN |
| Gmail REST API (googleapis) | Transactional email delivery via OAuth2 |
| Vercel | Frontend hosting, CDN, edge config |
| Render | Backend hosting, auto-deploy from GitHub |

### Development Tools

| Tool | Purpose |
|---|---|
| ESLint | Linting and code quality |
| PostCSS | CSS processing pipeline |
| Git + GitHub | Version control and CI/CD |
| VS Code | Primary IDE |
| Mermaid | Architecture and UML diagrams |

---

## Key Features

### End-User Features
- **AI Chatbot Ticket Wizard** — Step-by-step guided ticket creation with knowledge base deflection
- **My Tickets Dashboard** — Real-time ticket status, history, filter and search
- **Ticket Detail View** — Full conversation thread, attachments, activity timeline
- **Ticket Status Tracker** — Public-facing ticket status page (no login required)
- **Survey & Feedback** — Post-resolution CSAT survey
- **Notification Center** — In-app notifications for all ticket events
- **Profile Management** — Update profile picture, name, password, enable 2FA
- **Announcements** — Organization-wide broadcast messages
- **Knowledge Base** — Self-service article search and browsing

### Agent Features
- **Unified Ticket Queue** — View assigned tickets with priority, SLA, and due date
- **Canned Responses** — Pre-written reply templates for common issues
- **Internal Notes** — Private agent-only comments per ticket
- **File Attachments** — Upload screenshots and documents via Cloudinary
- **Script Vault** — VS Code-style code snippet library with multi-file support

### Admin Features
- **Admin Dashboard** — KPI cards, SLA compliance gauges, ticket volume charts
- **User Management** — Create, edit, disable users; assign roles (admin/agent/user)
- **SLA Configuration** — Per-priority SLA targets
- **Reports & Analytics** — Ticket trends, resolution rates, agent performance
- **Activity Log** — Full audit trail of all system events
- **Knowledge Base Management** — Create, publish, archive articles
- **Announcements & Broadcasts** — Organization-wide message board
- **Calendar View** — Ticket due-date calendar with drag-and-drop scheduling

### Security & Infrastructure
- JWT authentication with **token versioning** (force-logout on password change)
- **Two-Factor Authentication** — TOTP (authenticator app) + Email OTP
- **Inactivity auto-logout** with configurable timeout
- Role-based access control on every API route and UI page
- OWASP Top 10 hardening (Helmet, rate limiting, mongo-sanitize, HTTPS)
- PWA with service worker — **offline-capable** and installable on mobile

---

## Database Design

HiTicket uses **MongoDB Atlas** with Mongoose schemas. The primary collections are:

### Collections Overview

| Collection | Documents | Key Relationships |
|---|---|---|
| `users` | All platform users | Referenced by tickets, logs, notifications |
| `tickets` | Support request records | References user (requester + assigned agent) |
| `kbarticles` | Knowledge base articles | Standalone, referenced by chatbot deflection |
| `notifications` | Per-user event notifications | References user + ticket |
| `activitylogs` | Immutable audit trail | References user + ticket |
| `announcements` | Admin broadcast messages | Standalone |
| `cannedresponses` | Agent reply templates | Standalone |
| `feedbacks` | CSAT survey responses | References ticket |
| `configs` | Per-key system settings | Key-value store |
| `scriptvaults` | Code snippet entries | References user (author) |

### Core Schema Highlights

**User Schema** — Fields: `name`, `email`, `password` (bcrypt), `role` (admin/agent/user), `isActive`, `totpSecret`, `otpCode`, `otpExpiry`, `tokenVersion`, `avatar`, `department`

**Ticket Schema** — Fields: `title`, `description`, `category`, `priority` (low/medium/high/critical), `status` (open/in-progress/resolved/closed), `requester` (ref User), `assignedTo` (ref User), `attachments[]`, `comments[]`, `internalNotes[]`, `slaDeadline`, `resolvedAt`, `createdAt`

**Indexes:** Compound indexes on `(status, assignedTo)`, `(requester, createdAt)`, TTL index on OTP fields, text index on KB articles for full-text search.

---

## Security Implementation

### OWASP Top 10 Coverage

| OWASP Risk | Implementation |
|---|---|
| A01 — Broken Access Control | Role-based middleware on all routes; `protect()` and `requireRole()` guards |
| A02 — Cryptographic Failures | bcrypt (salt rounds 10) for passwords; HTTPS enforced; JWT HS256 signing |
| A03 — Injection | `express-mongo-sanitize` strips `$` and `.` from all request inputs |
| A04 — Insecure Design | Token versioning, inactivity logout, OTP expiry windows |
| A05 — Security Misconfiguration | `helmet()` sets 15+ HTTP security headers; CORS restricted to known origins |
| A07 — Authentication Failures | Rate limiting on `/auth/*` routes; 2FA on sensitive ops; account lockout |
| A09 — Logging Failures | ActivityLog collection records every sensitive action with IP and timestamp |

### JWT Token Versioning

Each user document stores a `tokenVersion` integer. Every issued JWT embeds this version. On password change, the version increments — invalidating all previously issued tokens even before expiry.

### Two-Factor Authentication Flow

```
Login (email + password) → SUCCESS
         ↓
  2FA enabled? → NO → Issue JWT → Done
         ↓ YES
  Send OTP (email) or prompt TOTP app
         ↓
  Verify OTP/TOTP within 5 minutes
         ↓
  Issue full-access JWT
```

---

## API Overview

The REST API is hosted on Render. All routes (except `/auth/login`, `/auth/register`, `/tickets/status/:id`) require a valid JWT in the `Authorization: Bearer <token>` header.

### Route Groups

| Prefix | Controller | Access |
|---|---|---|
| `/api/auth` | Authentication, OTP, 2FA | Public + Auth |
| `/api/tickets` | CRUD, assign, comment, attach | User/Agent/Admin |
| `/api/users` | Profile, user list, role management | Auth + Admin |
| `/api/kb` | Knowledge base articles | Auth + Admin (write) |
| `/api/notifications` | User notifications | Auth |
| `/api/logs` | Activity audit log | Admin |
| `/api/announcements` | Broadcasts | Auth + Admin (write) |
| `/api/canned-responses` | Agent templates | Agent/Admin |
| `/api/feedback` | CSAT surveys | Auth |
| `/api/config` | System settings | Admin |
| `/api/script-vault` | Code snippet library | Auth + Admin (write) |

### Sample Ticket Object (Response)

```json
{
  "_id": "664a3f2c8e1234abcd000001",
  "ticketNumber": "TKT-0042",
  "title": "VPN not connecting from home network",
  "description": "Since yesterday morning, I cannot connect...",
  "category": "Network",
  "priority": "high",
  "status": "in-progress",
  "requester": { "_id": "...", "name": "Riya Sharma", "email": "riya@company.com" },
  "assignedTo": { "_id": "...", "name": "Agent Kumar" },
  "slaDeadline": "2026-04-24T09:00:00.000Z",
  "attachments": [{ "url": "https://res.cloudinary.com/...", "filename": "screenshot.png" }],
  "comments": [{ "author": "...", "body": "Checked firewall rules...", "createdAt": "..." }],
  "createdAt": "2026-04-22T07:23:11.000Z",
  "updatedAt": "2026-04-22T08:05:44.000Z"
}
```

---

## Module Breakdown

### 1. Authentication Module
Handles registration, login, password reset, JWT issuance, and 2FA. Implements TOTP via `speakeasy` (RFC 6238) and email OTP with 5-minute expiry. Token versioning ensures stale tokens are rejected after password changes.

### 2. Ticket Management Module
Full CRUD for tickets. Supports priority levels (low, medium, high, critical), category tagging, SLA deadline calculation, agent assignment (manual and round-robin auto-assign), status transitions, internal notes, and file attachments.

### 3. AI Chatbot Ticket Wizard
A stateful, multi-step conversational interface that guides users through ticket submission. At each step it queries the Knowledge Base; if a matching article is found, it is surfaced before submission, potentially deflecting the ticket entirely. The chatbot maintains local state through a step machine (greeting → category → description → KB check → attachments → confirm).

### 4. Knowledge Base Module
Markdown-supported article editor with category tagging, publish/archive workflow, and full-text search (MongoDB text index). Articles are cross-linked from the chatbot deflection step, the main KB browsing page, and the ticket detail sidebar.

### 5. Admin Dashboard & Analytics
Real-time KPI cards (open tickets, SLA breach count, CSAT average), ticket volume bar charts, category distribution pie charts, and agent workload table — all powered by Recharts and aggregated MongoDB queries.

### 6. User & Role Management
Admin-only module for the complete user lifecycle: create accounts, assign roles (admin/agent/user), activate/deactivate accounts, reset passwords, and view per-user activity. Includes bulk operations for onboarding.

### 7. Email Notification System
Uses the Gmail REST API with OAuth2 (not SMTP) to avoid port restrictions on cloud hosts. Sends: ticket created, ticket assigned, status changed, comment added, OTP, and weekly digest (scheduled via `node-cron`, every Monday 08:00 UTC). Email templates are HTML-formatted.

### 8. File Attachment System
Uses Cloudinary for file storage with a signed upload workflow. Accepts images, PDFs, and documents. Stored URLs are embedded in ticket attachment arrays. Cloudinary transformations auto-generate thumbnails.

### 9. Progressive Web App (PWA)
`vite-plugin-pwa` generates a service worker using Workbox with `NetworkFirst` strategy for API calls and `CacheFirst` for static assets. Supports add-to-home-screen on Android/iOS and basic offline access for cached ticket views.

### 10. Script Vault
A VS Code-inspired code snippet library allowing admin and agent users to store, organize, and share multi-file code snippets. Supports file tree navigation, syntax-colored previews, inline editing, folder and ZIP upload, visibility scoping (public/staff/admin/custom users), and one-click copy/download.

---

## Deployment

### Frontend — Vercel

```
GitHub push to main
      ↓
Vercel detects push (auto-deploy webhook)
      ↓
npm run build (Vite builds React SPA)
      ↓
Output dist/ deployed to Vercel CDN
      ↓
https://hiticket.vercel.app (live)
```

**Vercel config** (`vercel.json`): SPA fallback rewrites all routes to `index.html`, preventing 404 on direct URL access.

### Backend — Render

```
GitHub push to main
      ↓
Render detects push (auto-deploy webhook)
      ↓
npm install → node server.js
      ↓
Service live on Render URL
```

**Environment variables** set via Render dashboard: `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `FRONTEND_URL`.

---

## Project Setup

### Prerequisites

Ensure the following are installed and available on your machine before proceeding:

| Tool | Version | Download |
|---|---|---|
| Node.js | 20 LTS or higher | [nodejs.org](https://nodejs.org/) |
| npm | 10+ (bundled with Node.js) | — |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

You also need accounts on these services to obtain credentials:

- **MongoDB Atlas** — [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (free M0 cluster)
- **Cloudinary** — [cloudinary.com](https://cloudinary.com) (free tier)
- **Google Cloud Console** — [console.cloud.google.com](https://console.cloud.google.com) (Gmail API with OAuth2)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/<username>/it-ticketing.git
cd "IT Ticketing"
```

> Replace `<username>` with the actual GitHub username if cloning from GitHub, or navigate to the project folder directly if already downloaded.

---

### Step 2 — Backend Setup (`helpdesk-api`)

#### 2.1 — Install Backend Dependencies

```bash
cd helpdesk-api
npm install
```

#### 2.2 — Create the Backend Environment File

Create a file named `.env` inside the `helpdesk-api/` folder:

```bash
# macOS / Linux
touch helpdesk-api/.env

# Windows (PowerShell)
New-Item helpdesk-api\.env -ItemType File
```

Open `helpdesk-api/.env` and add the following variables:

```env
# Server
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/hiticket

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
JWT_EXPIRES_IN=7d

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gmail REST API (OAuth2 — NOT SMTP)
GMAIL_CLIENT_ID=your_oauth2_client_id
GMAIL_CLIENT_SECRET=your_oauth2_client_secret
GMAIL_REFRESH_TOKEN=your_oauth2_refresh_token
GMAIL_USER=your_gmail_address@gmail.com

# Frontend origin (for CORS)
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

> **Note:** `JWT_SECRET` must be at least 32 random characters. You can generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

#### 2.3 — Start the Backend Server

```bash
# Production mode
node server.js

# Development mode (auto-restarts on file changes — requires nodemon)
npm run dev
```

The API server starts at **`http://localhost:5000`**.  
You should see:
```
MongoDB connected
Server running on port 5000
```

---

### Step 3 — Frontend Setup (`helpdesk-ai`)

Open a **new terminal window** and navigate to the frontend folder:

#### 3.1 — Install Frontend Dependencies

```bash
cd helpdesk-ai
npm install
```

#### 3.2 — Create the Frontend Environment File

Create a file named `.env` inside the `helpdesk-ai/` folder:

```bash
# macOS / Linux
touch helpdesk-ai/.env

# Windows (PowerShell)
New-Item helpdesk-ai\.env -ItemType File
```

Open `helpdesk-ai/.env` and add:

```env
VITE_API_URL=http://localhost:5000/api
```

> This tells the React app where the backend API is running. Change the URL if your backend runs on a different port.

#### 3.3 — Start the Frontend Dev Server

```bash
npm run dev
```

The React development server starts at **`http://localhost:5173`** (Vite may use `5174`, `5175`, etc. if the port is already in use — check the terminal output).

---

### Step 4 — Open the Application

1. Ensure the backend (`http://localhost:5000`) is running.
2. Open your browser and navigate to **`http://localhost:5173`**.
3. Register a new account or use an existing one.

> **First-time setup:** The first registered user can be promoted to `admin` role directly in MongoDB Atlas using the Atlas Data Explorer — set `role: "admin"` on the user document.

---

### Step 5 — Running Both Servers Simultaneously (Quick Reference)

Open two terminal windows side by side:

**Terminal 1 — Backend:**
```bash
cd "IT Ticketing/helpdesk-api"
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd "IT Ticketing/helpdesk-ai"
npm run dev
```

| Service | URL |
|---|---|
| Frontend (React) | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| API Health Check | http://localhost:5000/api/auth (returns 404 for GET — confirms API is live) |

---

### Step 6 — Build for Production (Optional)

To generate an optimized production build of the frontend:

```bash
cd helpdesk-ai
npm run build
```

The compiled output is placed in `helpdesk-ai/dist/`. This folder can be deployed to any static host (Vercel, Netlify, AWS S3, etc.).

To preview the production build locally:

```bash
npm run preview
```

---

### Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `MongoDB connection error` | Wrong `MONGODB_URI` or IP not whitelisted | Check Atlas → Network Access → add your IP `0.0.0.0/0` for dev |
| `CORS error` in browser | `FRONTEND_URL` mismatch in backend `.env` | Set `FRONTEND_URL=http://localhost:5173` (match Vite's actual port) |
| `Port 5000 already in use` | Another process on port 5000 | Change `PORT=5001` in backend `.env` and update `VITE_API_URL` |
| `nodemon: command not found` | nodemon not installed globally | Use `npm run dev` (it resolves from local `node_modules`) |
| Frontend shows blank page | Build issue or wrong `VITE_API_URL` | Check browser console for errors; confirm backend is running |
| Gmail emails not sending | Invalid OAuth2 credentials | Re-generate the refresh token in Google Cloud Console |

---

## Diagrams

All architecture and UML diagrams are stored as Mermaid files in the [`diagrams/`](./diagrams/) directory:

| File | Diagram Type | Description |
|---|---|---|
| [`00_overall_flow_simple.mmd`](./diagrams/00_overall_flow_simple.mmd) | Flowchart | High-level user journey overview |
| [`00_overall_sequence.mmd`](./diagrams/00_overall_sequence.mmd) | Sequence | End-to-end request/response flow |
| [`01_architecture.mmd`](./diagrams/01_architecture.mmd) | Architecture | Three-tier deployment topology |
| [`02_class_diagram.mmd`](./diagrams/02_class_diagram.mmd) | Class | MongoDB schema relationships |
| [`03_er_diagram.mmd`](./diagrams/03_er_diagram.mmd) | ER Diagram | Entity-relationship model |
| [`04_sequence_registration.mmd`](./diagrams/04_sequence_registration.mmd) | Sequence | User registration + email verification |
| [`05_sequence_2fa_login.mmd`](./diagrams/05_sequence_2fa_login.mmd) | Sequence | 2FA login flow (OTP + TOTP) |
| [`06_sequence_chatbot_ticket.mmd`](./diagrams/06_sequence_chatbot_ticket.mmd) | Sequence | Chatbot ticket creation with KB deflection |
| [`07_sequence_status_update.mmd`](./diagrams/07_sequence_status_update.mmd) | Sequence | Ticket status update + notification chain |

---

## Cost Estimation Summary

Detailed cost estimation is provided in Chapter 12 of the project report. A condensed summary:

### Development Cost

| Resource | Hours | Rate (₹/hr) | Cost (₹) |
|---|---|---|---|
| Frontend Development | 180 hrs | 300 | 54,000 |
| Backend / API Development | 160 hrs | 350 | 56,000 |
| Database Design & Setup | 40 hrs | 250 | 10,000 |
| Security Implementation | 30 hrs | 400 | 12,000 |
| Testing & QA | 30 hrs | 200 | 6,000 |
| Deployment & DevOps | 20 hrs | 300 | 6,000 |
| Documentation | 20 hrs | 150 | 3,000 |
| **Total Development Cost** | **480 hrs** | — | **₹1,47,000** |

### Infrastructure Cost (Monthly — Production)

| Service | Plan | Cost/Month |
|---|---|---|
| Vercel (Frontend) | Hobby (Free) | ₹0 |
| Render (Backend) | Free Tier | ₹0 |
| MongoDB Atlas | M0 Free Cluster | ₹0 |
| Cloudinary | Free Tier (25 GB) | ₹0 |
| Gmail API | Free Quota | ₹0 |
| **Total Monthly (Current)** | — | **₹0** |
| **Total Monthly (Scale — 10k users)** | Paid tiers | **~₹4,200** |

> All production infrastructure for the current project deployment runs at **zero ongoing cost** using free tiers of managed cloud services.

---

## Results & Outcomes

### System Performance

| Metric | Result |
|---|---|
| First Contentful Paint (FCP) | < 1.2s (Vercel CDN) |
| Lighthouse Performance Score | 89/100 |
| Lighthouse Accessibility Score | 94/100 |
| API Response Time (p95) | < 280ms |
| Cold Start (Render free tier) | ~12–18s (first request) |
| Ticket Creation (chatbot, avg) | 45 seconds |
| PWA Offline Cache Hit Rate | 78% of page navigations |

### Functional Outcomes

- Complete ticket lifecycle management from creation to closure
- 2FA enrollment and TOTP verified working across Google Authenticator and Authy
- Email notifications delivered via Gmail REST API at < 3s latency
- Knowledge base deflection reduced simulated ticket volume by ~22% in test scenarios
- Role-based access verified — agents cannot access admin routes; users cannot access agent-only views
- Script Vault supports ZIP extraction, multi-file tree rendering, and inline editing

### Test Coverage Summary

| Test Category | Total Cases | Passed | Failed |
|---|---|---|---|
| Authentication & 2FA | 14 | 14 | 0 |
| Ticket CRUD Operations | 18 | 18 | 0 |
| Role-Based Access Control | 12 | 12 | 0 |
| Email Notification Delivery | 8 | 7 | 1* |
| File Upload (Cloudinary) | 6 | 6 | 0 |
| Knowledge Base & Deflection | 10 | 10 | 0 |
| API Security (rate limit, sanitize) | 8 | 8 | 0 |

*One intermittent failure on Gmail quota exhaustion in stress test — handled gracefully.

---

## Conclusion

HiTicket demonstrates that a production-grade, enterprise-class IT helpdesk system can be built and deployed entirely using open-source tools and free-tier cloud infrastructure. The project covers the full spectrum of modern web development: authentication security, relational data modelling in a document database, real-time UI, scheduled automation, PWA offline support, and OWASP-compliant security hardening.

The chatbot-first ticket creation approach, combined with knowledge base deflection, represents a practical application of user experience engineering principles — reducing ticket noise while improving self-service resolution. The system is designed to scale from a 50-person team to a 10,000-employee enterprise with straightforward infrastructure upgrades.

### Future Enhancements

| Enhancement | Priority | Effort |
|---|---|---|
| AI-powered ticket auto-categorization (LLM API) | High | 2 weeks |
| Real-time updates via WebSocket / Socket.IO | High | 1 week |
| Mobile app (React Native) | Medium | 4 weeks |
| LDAP / Active Directory SSO integration | Medium | 2 weeks |
| Automated SLA escalation workflows | High | 1 week |
| Multi-language / i18n support | Low | 2 weeks |
| Dark/Light theme per-user persistence (DB-backed) | Low | 2 days |
| Elasticsearch integration for advanced search | Medium | 3 weeks |

---

## References

1. Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures*. Doctoral dissertation, University of California, Irvine.
2. MongoDB, Inc. (2024). *MongoDB Manual — Data Modeling Introduction*. [https://www.mongodb.com/docs/manual/core/data-modeling-introduction/](https://www.mongodb.com/docs/manual/core/data-modeling-introduction/)
3. OWASP Foundation. (2021). *OWASP Top Ten*. [https://owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/)
4. Jones, M. B., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)*. RFC 7519, IETF.
5. M'Raihi, D., Bellare, M., Hoornaert, F., Naccache, D., & Ranen, O. (2005). *HOTP: An HMAC-Based One-Time Password Algorithm*. RFC 4226, IETF.
6. Google LLC. (2024). *Gmail API Documentation*. [https://developers.google.com/gmail/api](https://developers.google.com/gmail/api)
7. Cloudinary Ltd. (2024). *Cloudinary Developer Documentation*. [https://cloudinary.com/documentation](https://cloudinary.com/documentation)
8. Vercel Inc. (2024). *Vercel Platform Documentation*. [https://vercel.com/docs](https://vercel.com/docs)
9. React Team. (2024). *React 19 Release Notes*. [https://react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19)
10. Dahl, R. (2023). *Node.js — About*. [https://nodejs.org/en/about](https://nodejs.org/en/about)
11. Workbox Team. (2024). *Workbox — JavaScript Libraries for Progressive Web Apps*. [https://developer.chrome.com/docs/workbox](https://developer.chrome.com/docs/workbox)
12. Mozilla Developer Network. (2024). *Progressive Web Apps*. [https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

## Repository Structure

```
IT Ticketing/
├── README.md                  ← This file
├── REPORT.md                  ← Complete academic project report
├── PROJECT_OVERVIEW.md        ← Technical executive summary
├── DOCUMENTATION.md           ← API and module documentation
├── diagrams/
│   ├── README.md              ← Diagram index
│   ├── 00_overall_flow_simple.mmd
│   ├── 00_overall_sequence.mmd
│   ├── 01_architecture.mmd
│   ├── 02_class_diagram.mmd
│   ├── 03_er_diagram.mmd
│   ├── 04_sequence_registration.mmd
│   ├── 05_sequence_2fa_login.mmd
│   ├── 06_sequence_chatbot_ticket.mmd
│   └── 07_sequence_status_update.mmd
├── helpdesk-ai/               ← React 19 frontend (Vite)
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/             ← 20+ page components
│   │   └── utils/
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── vercel.json
└── helpdesk-api/              ← Node.js + Express backend
    ├── server.js
    ├── controllers/
    ├── middleware/
    ├── models/                ← 10 Mongoose schemas
    ├── routes/                ← 11 route files
    └── utils/
```

---

## License

This project was developed as a B.Tech final year academic project. The codebase is intended for educational purposes. All third-party libraries and services used are subject to their respective licenses.

---

<div align="center">

**HiTicket** · Built with React, Node.js, Express, and MongoDB  
B.Tech Computer Science & Engineering · 2025–2026  
[https://hiticket.vercel.app](https://hiticket.vercel.app)

</div>
