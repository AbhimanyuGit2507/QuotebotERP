# QuotebotERP

AI-powered ERP for modern businesses — email-to-quotation automation, multi-channel communication (Gmail, Outlook, WhatsApp), real-time push updates, and a full ERP suite (inventory, invoicing, accounting, analytics).

---

## Architecture

The system is built in three decoupled layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMMUNICATION LAYER                         │
│  Gmail API  │  Outlook Graph API  │  Baileys WA  │  Meta WA API │
│             ↓ NormalisedMessage interface ↓                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AI LAYER                                │
│   MessageClassifier (RFQ / PO / Followup / Unknown)             │
│   ItemExtractor → ItemIntelligence (semantic match + alias)     │
│   LLM providers: Groq, Mistral, Gemini, Cerebras, Together,     │
│                  DeepSeek, OpenRouter (fallback chain)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING / ACTION LAYER                    │
│   RFQ creation  │  Quotation generation  │  Conversation mgmt  │
│   Invoice / PO  │  Bill detection        │  Audit trail        │
└─────────────────────────────────────────────────────────────────┘
```

**Real-time delivery**: WebSocket gateway (`/events` namespace, Socket.IO) pushes `rfq.new`, `rfq.updated`, `inbox.new`, `inbox.updated`, `quotation.updated`, `sync.progress`, `whatsapp.qr` events to the frontend. No polling.

**Job queue**: Bull (Redis-backed) manages email sync jobs with per-tenant deduplication, retries, and concurrency control — replacing the previous child-process spawn approach.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11, TypeScript, Prisma 7, PostgreSQL |
| Frontend | React 19, TypeScript, Tailwind CSS 3 |
| Real-time | Socket.IO (WebSocket gateway) |
| Job queue | Bull + Redis |
| AI/LLM | Multi-provider fallback chain (Groq, Mistral, Gemini, etc.) |
| Email | Gmail API (OAuth2 + History API), Outlook Graph API (delta sync) |
| WhatsApp | Baileys (QR-based) + Meta Cloud API (Business) |
| Item intelligence | Python FastAPI sidecar (semantic reranker, alias proposals) |
| Auth | JWT (httpOnly cookies) + RBAC |

---

## Project Structure

```
QuotebotERP/
├── backend/                  NestJS API (port 3001)
│   ├── prisma/               Schema + migrations
│   ├── src/
│   │   ├── events/           WebSocket gateway + EventsService
│   │   ├── queue/            Bull queue module + email-sync processor
│   │   ├── email/            Gmail sync, Outlook integration, email service
│   │   ├── whatsapp/         Baileys adapter, Meta API adapter, shared processor
│   │   ├── email-rfq/        Email → RFQ pipeline
│   │   ├── email-classifier/ Message classification (RFQ/PO/Followup)
│   │   ├── item-intelligence/ Semantic item matching + alias proposals
│   │   ├── rfqs/             RFQ CRUD
│   │   ├── quotations/       Quotation CRUD + PDF generation
│   │   ├── invoices/         Invoice management
│   │   ├── accounting/       Double-entry accounting
│   │   ├── inventory/        Stock movements + GRN
│   │   ├── purchase-orders/  Outbound PO management
│   │   ├── analytics/        Dashboard metrics + smart suggestions
│   │   ├── audit/            Audit log service
│   │   ├── settings/         Namespaced settings + schema validation
│   │   └── admin/            Admin console endpoints (health, queue stats)
│   └── item-intelligence-service/  Python FastAPI sidecar (port 3801)
├── frontend/                 React app (port 3000)
│   └── src/
│       ├── pages/            All page components
│       ├── components/       Shared UI components
│       │   └── onboarding/   Scenario-based onboarding modals
│       ├── context/          AppContext (state), AuthContext
│       ├── hooks/            useRealtimeEvents, useKeyboardShortcuts
│       └── services/         API client
└── .github/workflows/        CI (build + test on push)
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 6+ (`redis-server`)
- Python 3.12+ (for item-intelligence sidecar, optional)

### 1. Clone & install

```bash
git clone https://github.com/AbhimanyuGit2507/QuotebotERP.git
cd QuotebotERP

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Database

```bash
# Create DB and user
psql -U postgres -c "CREATE USER quotebot WITH PASSWORD 'quotebot';"
psql -U postgres -c "CREATE DATABASE quotebot_db OWNER quotebot;"

# Push schema
cd backend
DATABASE_URL=postgresql://quotebot:quotebot@localhost:5432/quotebot_db npx prisma db push
```

### 3. Redis

```bash
redis-server --daemonize yes
# Verify: redis-cli ping  → PONG
```

### 4. Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in the required values:

```bash
cp backend/.env.example backend/.env
```

Minimum required for local dev:
```env
DATABASE_URL=postgresql://quotebot:quotebot@localhost:5432/quotebot_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
TOKEN_ENCRYPTION_KEY=32-char-hex-key
INTERNAL_API_KEY=any-random-string
```

For email sync (Gmail):
```env
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:3001/api/email/integrations/gmail/callback
```

For Outlook:
```env
OUTLOOK_CLIENT_ID=...
OUTLOOK_CLIENT_SECRET=...
OUTLOOK_REDIRECT_URI=http://localhost:3001/api/email/outlook/callback
OUTLOOK_TENANT=common
```

For WhatsApp (Meta):
```env
META_WHATSAPP_APP_ID=...
META_WHATSAPP_APP_SECRET=...
META_WHATSAPP_VERIFY_TOKEN=...
META_WHATSAPP_REDIRECT_URI=http://localhost:3001/api/whatsapp/meta/callback
```

For LLM providers (at least one required for AI pipeline):
```env
GROQ_API_KEY=...
MISTRAL_API_KEY=...
GEMINI_API_KEY=...
```

Frontend:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 5. Run

```bash
# Terminal 1 — Backend (hot reload)
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm start

# Terminal 3 — Python sidecar (optional, for semantic item matching)
cd backend/item-intelligence-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 3801
```

Backend: http://localhost:3001/api  
Frontend: http://localhost:3000  
Swagger: http://localhost:3001/api/swagger

---

## Running Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend e2e tests
cd backend && npm run test:e2e

# Frontend tests
cd frontend && npm test -- --watchAll=false
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string (Bull queue) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRATION` | No | JWT expiry (default: `7d`) |
| `JWT_REFRESH_EXPIRATION` | No | Refresh token expiry (default: `30d`) |
| `TOKEN_ENCRYPTION_KEY` | Yes | 32-char hex key for encrypting OAuth tokens |
| `INTERNAL_API_KEY` | Yes | Key for internal service-to-service calls |
| `API_PORT` | No | Backend port (default: `3001`) |
| `API_PREFIX` | No | API prefix (default: `api`) |
| `CORS_ORIGIN` | No | Allowed CORS origins (comma-separated) |
| `FRONTEND_URL` | No | Frontend URL for OAuth redirects |
| `NODE_ENV` | No | `development` or `production` |
| `GMAIL_CLIENT_ID` | For Gmail | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | For Gmail | Google OAuth client secret |
| `GMAIL_REDIRECT_URI` | For Gmail | OAuth callback URL |
| `GMAIL_PUBSUB_TOPIC` | Optional | Google Pub/Sub topic for push notifications |
| `OUTLOOK_CLIENT_ID` | For Outlook | Azure AD app client ID |
| `OUTLOOK_CLIENT_SECRET` | For Outlook | Azure AD app client secret |
| `OUTLOOK_REDIRECT_URI` | For Outlook | OAuth callback URL |
| `OUTLOOK_TENANT` | For Outlook | Azure tenant (`common` for multi-tenant) |
| `META_WHATSAPP_APP_ID` | For Meta WA | Facebook app ID |
| `META_WHATSAPP_APP_SECRET` | For Meta WA | Facebook app secret |
| `META_WHATSAPP_VERIFY_TOKEN` | For Meta WA | Webhook verification token |
| `META_WHATSAPP_REDIRECT_URI` | For Meta WA | OAuth callback URL |
| `GROQ_API_KEY` | For LLM | Groq API key |
| `MISTRAL_API_KEY` | For LLM | Mistral API key |
| `GEMINI_API_KEY` | For LLM | Google Gemini API key |
| `CEREBRAS_API_KEY` | For LLM | Cerebras API key |
| `TOGETHER_API_KEY` | For LLM | Together AI API key |
| `DEEPSEEK_API_KEY` | For LLM | DeepSeek API key |
| `OPENROUTER_API_KEY` | For LLM | OpenRouter API key |
| `LLM_PROVIDER` | No | Primary LLM provider |
| `RFQ_LLM_PROVIDER` | No | LLM provider for RFQ extraction |
| `RFQ_LLM_FALLBACK_ORDER` | No | Comma-separated fallback chain |
| `AUTO_EMAIL_SYNC_ENABLED` | No | Enable background email sync (`true`/`false`) |
| `UPLOAD_FOLDER` | No | File upload directory |
| `MAX_FILE_SIZE` | No | Max upload size in bytes |
| `AUTH_COOKIE_SECURE` | No | Set cookies as Secure (`true` in production) |
| `AUTH_COOKIE_SAMESITE` | No | Cookie SameSite policy |

---

## Deployment

### Docker Compose

```bash
docker-compose up --build
```

### Render / Railway

See `render.yaml` and `railway.json` for platform-specific configuration.

### Environment checklist for production
- Set `NODE_ENV=production`
- Set `AUTH_COOKIE_SECURE=true`
- Set `AUTH_COOKIE_SAMESITE=strict`
- Use a strong random `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY`
- Point `DATABASE_URL` to a managed PostgreSQL instance
- Point `REDIS_URL` to a managed Redis instance
- Set `CORS_ORIGIN` to your frontend domain only

---

## WhatsApp Onboarding

Two methods are supported — both use the same UI and AI pipeline:

**Baileys (Quick — no Facebook Business account needed)**
1. Go to Settings → WhatsApp
2. Click "Connect via Baileys (Quick)"
3. Scan the QR code with your WhatsApp mobile app
4. Done — messages are received in real-time

**Meta Cloud API (Business — requires Facebook Business account)**
1. Go to Settings → WhatsApp
2. Click "Connect via Meta (Business)"
3. Complete Facebook OAuth and select your WhatsApp Business number
4. Configure the webhook URL in Meta Developer Console: `https://your-domain/api/whatsapp/meta/webhook`
5. Done — messages arrive via webhook

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes, ensure `npm run build` passes in both `backend/` and `frontend/`
4. Run tests: `npm test` in `backend/`
5. Open a pull request against `main`
