# HiTicket — Mermaid Diagrams

All UML and architectural diagrams for the HiTicket project in Mermaid `.mmd` format.  
Open any `.mmd` file in VS Code with the [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) or [Mermaid Editor](https://marketplace.visualstudio.com/items?itemName=tomoyukim.vscode-mermaid-editor) extension to render them.

---

## Diagram Index

| File | Type | Description |
|------|------|-------------|
| [01_architecture.mmd](01_architecture.mmd) | `architecture-beta` | Three-tier system architecture (Presentation → Application → Data) |
| [02_class_diagram.mmd](02_class_diagram.mmd) | `classDiagram` | UML Class Diagram — User, Ticket, KbArticle, Notification + embedded sub-docs |
| [03_er_diagram.mmd](03_er_diagram.mmd) | `erDiagram` | Entity Relationship Diagram — all collections and their relationships |
| [04_sequence_registration.mmd](04_sequence_registration.mmd) | `sequenceDiagram` | User Registration flow (13 steps) |
| [05_sequence_2fa_login.mmd](05_sequence_2fa_login.mmd) | `sequenceDiagram` | Two-Factor Authentication Login via Email OTP (21 steps) |
| [06_sequence_chatbot_ticket.mmd](06_sequence_chatbot_ticket.mmd) | `sequenceDiagram` | Chatbot Ticket Creation wizard with KB deflection (25 steps) |
| [07_sequence_status_update.mmd](07_sequence_status_update.mmd) | `sequenceDiagram` | Ticket Status Update by Agent (14 steps) |

---

## Architecture Overview

```mermaid
architecture-beta
    group presentation(cloud)[Presentation Tier — Vercel CDN]
    group application(server)[Application Tier — Render]
    group data(database)[Data Tier]

    service reactspa(internet)[React 19 SPA] in presentation
    service pwa(server)[PWA Service Worker] in presentation
    service vercel(cloud)[Vercel Edge] in presentation

    service api(server)[Node.js 20 + Express 4] in application
    service middleware(server)[Middleware Chain] in application
    service cron(server)[Cron Jobs] in application

    service mongodb(database)[MongoDB Atlas] in data
    service cloudinary(disk)[Cloudinary CDN] in data
    service gmail(internet)[Gmail REST API] in data

    reactspa:R -- L:pwa
    pwa:R -- L:vercel
    api:R -- L:middleware
    middleware:R -- L:cron
    reactspa{group}:B --> T:api{group}
    api{group}:B --> T:mongodb{group}
    api{group}:B --> T:cloudinary{group}
    api{group}:B --> T:gmail{group}
```

---

## Class Diagram

```mermaid
---
title: HiTicket — UML Class Diagram
---
classDiagram
    direction LR

    class User {
        +ObjectId id
        +String name
        +String email
        -String password
        +String role
        +Boolean isActive
        +Number tokenVersion
        +Object twoFactor
        +matchPassword(entered) Boolean
        +preSave() void
    }

    class Ticket {
        +ObjectId id
        +String ticketId
        +String title
        +String description
        +String category
        +String priority
        +String status
        +ObjectId createdBy
        +String assignedTo
        +Date dueDate
        +Date resolvedAt
        +preSave() void
    }

    class KbArticle {
        +ObjectId id
        +String title
        +String content
        +String category
        +ObjectId author
        +Boolean isPublished
        +Number views
        +incrementViews() void
    }

    class Notification {
        +ObjectId id
        +ObjectId user
        +String type
        +String title
        +String message
        +Boolean isRead
        +markRead() void
    }

    class Comment {
        +ObjectId id
        +ObjectId author
        +String text
        +Date createdAt
    }

    class InternalNote {
        +ObjectId id
        +ObjectId author
        +String authorRole
        +String text
        +Date createdAt
    }

    class HistoryEntry {
        +ObjectId id
        +String action
        +String field
        +String from
        +String to
        +ObjectId by
        +Date createdAt
    }

    class Attachment {
        +ObjectId id
        +String url
        +String publicId
        +ObjectId uploadedBy
        +String mimetype
        +Number size
    }

    User "1" --> "N" Ticket : creates
    User "1" --> "N" KbArticle : authors
    User "1" --> "N" Notification : receives
    User "M" --> "N" Ticket : watches
    Ticket "1" *-- "N" Comment : embeds
    Ticket "1" *-- "N" InternalNote : embeds
    Ticket "1" *-- "N" HistoryEntry : embeds
    Ticket "1" *-- "N" Attachment : embeds
```

---

## ER Diagram

```mermaid
---
title: HiTicket — Entity Relationship Diagram
---
erDiagram
    USER {
        string id PK
        string name
        string email
        string password
        string role
        boolean isActive
        number tokenVersion
    }

    TICKET {
        string id PK
        string ticketId
        string title
        string description
        string category
        string priority
        string status
        string createdBy FK
        string assignedTo
        date dueDate
        date resolvedAt
    }

    KB_ARTICLE {
        string id PK
        string title
        string content
        string category
        string author FK
        boolean isPublished
        number views
    }

    COMMENT {
        string id PK
        string author FK
        string text
        date createdAt
    }

    INTERNAL_NOTE {
        string id PK
        string author FK
        string authorRole
        string text
        date createdAt
    }

    HISTORY_ENTRY {
        string id PK
        string action
        string field
        string from
        string to
        string by FK
        date createdAt
    }

    ATTACHMENT {
        string id PK
        string url
        string publicId
        string uploadedBy FK
        string mimetype
        number size
    }

    USER ||--o{ TICKET : "creates"
    USER ||--o{ KB_ARTICLE : "authors"
    USER }o--o{ TICKET : "watches"
    TICKET ||--o{ COMMENT : "contains"
    TICKET ||--o{ INTERNAL_NOTE : "contains"
    TICKET ||--o{ HISTORY_ENTRY : "tracks"
    TICKET ||--o{ ATTACHMENT : "has"
```

---

## Sequence — Registration

```mermaid
---
title: User Registration
---
sequenceDiagram
    actor User
    participant React as React Login UI
    participant API as Express API
    participant DB as MongoDB
    participant UserModel as User Model
    participant JWT as JWT Service

    User->>React: Submit { name, email, password }
    React->>API: POST /api/auth/register (authLimiter)
    API->>DB: User.findOne({ email })
    DB-->>API: null — email available
    API->>UserModel: User.create({ name, email, password })
    UserModel->>UserModel: pre("save"): bcrypt.hash(password, 12)
    UserModel->>DB: INSERT user document
    DB-->>UserModel: saved user document
    UserModel-->>API: user object
    API->>JWT: jwt.sign({ id, tokenVersion }, secret, 30d)
    JWT-->>API: signed JWT token
    API-->>React: 201 { token, user }
    React-->>User: Store token → Navigate to /
```

---

## Sequence — 2FA Login

```mermaid
---
title: Two-Factor Authentication Login (Email OTP)
---
sequenceDiagram
    actor User
    participant React as React Login UI
    participant API as Express API
    participant DB as MongoDB
    participant Bcrypt as bcryptjs
    participant Gmail as Gmail API
    participant JWT as JWT Service

    User->>React: Submit { email, password }
    React->>API: POST /api/auth/login
    API->>DB: User.findOne({ email }).select(+password +twoFactor)
    DB-->>API: user document
    API->>Bcrypt: bcrypt.compare(entered, stored)
    Bcrypt-->>API: true — match
    note over API: twoFactor.enabled === true
    API->>API: generateOTP() — 6-digit code
    API->>DB: Save pendingOtp + expiry (10 min)
    API->>Gmail: sendOTPEmail(email, name, otp)
    API->>JWT: signTempToken(id) — type:2fa-pending, 10m
    JWT-->>API: temp token
    API-->>React: 200 { requires2FA: true, tempToken }
    React-->>User: Show OTP screen

    User->>React: Enter 6-digit OTP
    React->>API: POST /api/auth/2fa/verify { tempToken, code }
    API->>JWT: jwt.verify(tempToken)
    JWT-->>API: decoded { id }
    API->>DB: Fetch user, compare OTP, check expiry
    DB-->>API: valid
    API->>DB: Clear pendingOtp, tokenVersion++, save
    API->>JWT: jwt.sign({ id, tokenVersion }, secret, 30d)
    JWT-->>API: full session JWT
    API-->>React: 200 { token, user }
    React-->>User: Store token → Navigate to /
```

---

## Sequence — Chatbot Ticket Creation

```mermaid
---
title: Chatbot Ticket Creation
---
sequenceDiagram
    actor User
    participant Chatbot as Chatbot UI
    participant API as Express API
    participant DB as MongoDB
    participant TicketModel as Ticket Model
    participant Gmail as Gmail API

    User->>Chatbot: Navigate to /chatbot
    Chatbot-->>User: Step 1 — 10 category tiles
    User->>Chatbot: Select category
    Chatbot-->>User: Step 2 — sub-type chips
    User->>Chatbot: Select sub-type
    Chatbot-->>User: Step 3 — guided fields + KB deflection

    Chatbot->>API: GET /api/kb?q=description keywords
    API->>DB: KbArticle.$text({ $search: query })
    DB-->>API: matching KB articles
    API-->>Chatbot: KB articles
    Chatbot-->>User: Show KB suggestion chips
    User->>Chatbot: Dismiss KB — proceed

    note over Chatbot: Auto-detect priority via keyword regex
    Chatbot-->>User: Step 4 — Confirmation screen
    User->>Chatbot: Confirm and submit

    Chatbot->>API: POST /api/tickets + JWT
    note over API: protect — validate JWT + tokenVersion
    API->>DB: getNextAgent() — least-loaded agent
    DB-->>API: agent name
    API->>TicketModel: Ticket.create({ ...fields, assignedTo })
    TicketModel->>TicketModel: pre("save") — TKT-NNNN + history entry
    TicketModel->>DB: INSERT ticket
    DB-->>TicketModel: saved ticket
    TicketModel-->>API: ticket object
    API-->>Chatbot: 201 { ticket }
    API--)Gmail: sendTicketCreated() async fire-and-forget
    Chatbot-->>User: Navigate to /tickets/:id
```

---

## Sequence — Status Update

```mermaid
---
title: Ticket Status Update (Agent)
---
sequenceDiagram
    actor Agent
    participant UI as TicketDetail UI
    participant API as Express API
    participant DB as MongoDB
    participant TicketModel as Ticket Model
    participant Gmail as Gmail API

    Agent->>UI: Select status "Resolved"
    UI->>API: PATCH /api/tickets/:id { status: Resolved } + JWT
    note over API: protect — validate JWT + tokenVersion
    API->>DB: Ticket.findById(id)
    DB-->>API: ticket document
    note over API: Ownership check — assignedTo === agent.name
    API->>TicketModel: history.push({ action, field, from, to, by })
    API->>TicketModel: ticket.status = "Resolved"
    TicketModel->>TicketModel: pre("save") — set resolvedAt
    API->>DB: ticket.save()
    DB-->>API: updated ticket
    API-->>UI: 200 { ticket }
    API--)Gmail: sendStatusChanged() async fire-and-forget
    UI-->>Agent: Update status badge to "Resolved"
```
