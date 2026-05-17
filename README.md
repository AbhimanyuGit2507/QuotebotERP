# QuotebotERP - Intelligent Email-to-Quotation Automation System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![React](https://img.shields.io/badge/react-19.2.4-blue.svg)
![NestJS](https://img.shields.io/badge/nestjs-10.x-red.svg)

**A modern, intelligent ERP system that automates quotation generation from RFQ emails**

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Email Automation](#-email-automation)
- [Development](#-development)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**QuotebotERP** is an enterprise resource planning system designed to automate the entire quotation workflow. It intelligently processes incoming RFQ (Request for Quotation) emails, extracts product requirements using AI, generates professional quotations, and automatically sends them to customers—all without manual intervention.

### 🎯 Problem It Solves

- **Manual RFQ Processing:** Eliminates hours of manual email reading and data entry
- **Slow Response Times:** Automatically responds to RFQs within seconds
- **Human Errors:** Reduces mistakes in quotation generation through AI-powered automation
- **Email Overload:** Automatically syncs and categorizes thousands of emails
- **Product Availability Tracking:** Real-time inventory checking and availability status

### 💡 How It Works

```
📧 Email Arrives → 🤖 AI Extracts Items → 📊 Check Inventory → 
✍️ Generate Quotation → 📤 Auto-Send to Customer
```

---

## 🚀 Key Features

### 🔄 Email Automation
- **Automatic Email Sync:** Syncs Gmail inbox every 10 seconds via OAuth2
- **AI-Powered RFQ Detection:** Intelligently identifies RFQ emails using LLM
- **Smart Parsing:** Extracts product names, quantities, and requirements
- **Thread Management:** Groups related emails into conversations
- **Auto-Send Quotations:** Sends generated quotations automatically via Gmail

### 📊 Quotation Management
- **Instant Quotation Generation:** Creates professional quotations in seconds
- **Template System:** 5 customizable email templates (RFQ, Quotation, PO, Invoice, Generic)
- **Variable Substitution:** Dynamic fields like {{customer_name}}, {{quotation_number}}
- **PDF Generation:** Professional PDF quotations with company branding
- **Status Tracking:** Draft, Sent, Accepted, Rejected, Expired states

### 🎨 Real-Time Dashboard
- **Live Updates:** Auto-refreshes every 5-10 seconds without page reload
- **Inbox Monitoring:** Real-time email count and status updates
- **Quick Actions:** One-click access to common tasks
- **Smart Notifications:** Rich notifications with action buttons
- **Analytics:** Sales trends, conversion rates, and performance metrics

### 📦 Inventory Management
- **Product Catalog:** Manage unlimited products with categories
- **Stock Tracking:** Real-time availability status (In Stock, Low Stock, Out of Stock)
- **Pricing Tiers:** Multiple pricing levels based on customer segments
- **Product Images:** Upload and manage product photos
- **SKU Management:** Organize products with unique identifiers

### 👥 Customer Relationship Management
- **Client Database:** Store customer details, contacts, and history
- **Tiering System:** VIP, Regular, New customer segments
- **Interaction History:** Track all emails, quotations, and orders
- **Custom Pricing:** Set client-specific discounts and terms

### 🔗 Entity Relationship Navigation
- **Linked Documents:** Click to navigate between related entities
  - Quotation → Purchase Order → Invoice
  - RFQ → Quotation → Order
  - Customer → All interactions
- **Breadcrumb Trail:** Easy navigation through document hierarchy
- **Quick Reference:** See related documents at a glance

### 🔐 Multi-Tenant Architecture
- **Tenant Isolation:** Complete data separation per organization
- **User Management:** Role-based access control (Admin, Manager, Sales)
- **Team Collaboration:** Multiple users per tenant
- **Audit Logs:** Track all user actions and changes

### 📧 Advanced Email Features
- **Gmail OAuth Integration:** Secure authentication without passwords
- **Sent Email Tracking:** Store email content, subject, timestamps
- **Email Templates:** Pre-configured templates with variable support
- **Bulk Operations:** Send multiple quotations at once
- **Email Search:** Full-text search across all emails

### 🤖 AI & Automation
- **LLM Integration:** OpenAI GPT-4, Anthropic Claude support
- **Intelligent Parsing:** Extract structured data from unstructured emails
- **Auto-Categorization:** Classify emails by type (RFQ, PO, Invoice, General)
- **Smart Matching:** Match email items to product catalog
- **Learning System:** Improves accuracy over time

### 📈 Business Intelligence
- **Dashboard Analytics:** Revenue, conversion rates, top products
- **Sales Reports:** Export data in CSV, Excel, PDF formats
- **Activity Tracking:** Monitor user actions and system events
- **Performance Metrics:** Response times, success rates, automation efficiency

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │ Inbox    │  │Quotations│  │ Products │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         Real-time Updates (5s polling)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│                    BACKEND (NestJS)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Email Sync    │  │RFQ Processor │  │Quotation Gen │      │
│  │(10s cron)    │  │(AI-powered)  │  │(Auto-send)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Auth & Users  │  │File Upload   │  │Audit Logs    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ Prisma ORM
┌────────────────────────▼────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                     │
│  • Users & Tenants    • Products & Inventory                │
│  • Emails & Threads   • RFQs & Quotations                   │
│  • POs & Invoices     • Audit Logs                          │
└─────────────────────────────────────────────────────────────┘

EXTERNAL INTEGRATIONS:
├── Gmail API (OAuth2) - Email sync & sending
├── OpenAI GPT-4 - AI parsing & extraction
├── Anthropic Claude - Alternative LLM
└── Zoho/Odoo - Optional accounting integration
```

### Data Flow

```
1. EMAIL SYNC (Every 10s)
   Gmail API → EmailSyncScheduler → InboxService → Database

2. RFQ PROCESSING (Event-driven)
   Email → AI Parser → Extract Items → Match Products → Create RFQ

3. AUTO-QUOTATION (Triggered)
   RFQ → Check Inventory → Calculate Prices → Generate PDF → Send Email

4. FRONTEND UPDATES (Polling)
   Inbox (5s) → RFQs (10s) → Quotations (10s) → Real-time UI
```

---

## 🛠️ Technology Stack

### Frontend
- **React 19.2.4** - Modern UI library with hooks
- **TypeScript 4.9.5** - Type-safe JavaScript
- **React Router 7.13** - Client-side routing
- **Create React App 5.0** - Zero-config build setup
- **DOMPurify 3.3** - XSS protection
- **CSS Variables** - Dynamic theming

### Backend
- **NestJS 10.x** - Progressive Node.js framework
- **TypeScript 5.x** - Strongly typed language
- **Prisma 5.x** - Modern ORM for PostgreSQL
- **Passport JWT** - Authentication & authorization
- **@nestjs/schedule** - Cron jobs for email sync
- **Class Validator** - DTO validation
- **googleapis** - Gmail API integration
- **OpenAI SDK** - GPT-4 integration
- **Anthropic SDK** - Claude AI integration

### Database
- **PostgreSQL 15** - Relational database
- **Prisma Schema** - Type-safe database access
- **Migrations** - Version-controlled schema changes

### DevOps & Deployment
- **Docker** - Containerization
- **Docker Compose** - Local development
- **Vercel** - Frontend hosting (CDN, auto-deploy)
- **Render** - Backend hosting (Node.js, PostgreSQL)
- **GitHub Actions** - CI/CD (optional)
- **Nginx** - Reverse proxy (optional)

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Unit testing
- **Supertest** - E2E testing
- **ts-node** - TypeScript execution
- **nodemon** - Auto-restart on changes

---

## 🚀 Quick Start

### Prerequisites

- **Node.js:** >= 18.0.0
- **npm:** >= 9.0.0
- **PostgreSQL:** >= 14.0
- **Gmail Account:** For email integration (OAuth setup)
- **OpenAI API Key:** Optional, for AI features

### 1. Clone Repository

```bash
git clone https://github.com/AbhimanyuGit2507/QuotebotERP.git
cd QuotebotERP
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Set up database
DATABASE_URL="postgresql://user:password@localhost:5432/quotebot"

# Run migrations
npx prisma migrate dev

# Seed database (creates admin user)
npm run db:seed

# Start development server
npm run start:dev
```

Backend runs at: **http://localhost:3001**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env
REACT_APP_API_URL=http://localhost:3001

# Start development server
npm start
```

Frontend runs at: **http://localhost:3000**

### 4. Default Login

```
Email: admin@quotebot.com
Password: admin123
```

**⚠️ Change default password immediately after first login!**

### 5. Gmail OAuth Setup (Optional)

See [Email Automation](#-email-automation) section for detailed OAuth setup instructions.

---

## 📁 Project Structure

```
QuotebotERP/
├── backend/                      # NestJS backend application
│   ├── dist/                     # Compiled JavaScript (gitignored)
│   ├── node_modules/             # Dependencies (gitignored)
│   ├── prisma/                   # Database schema & migrations
│   │   ├── migrations/           # Migration files
│   │   ├── schema.prisma         # Prisma schema definition
│   │   └── seed.ts               # Database seeding script
│   ├── scripts/                  # Utility scripts
│   │   ├── add-products.ts       # Add sample products
│   │   ├── sync-gmail.js         # Manual email sync
│   │   └── test-*.ts             # Testing utilities
│   ├── src/                      # Source code
│   │   ├── admin/                # Admin panel endpoints
│   │   ├── assistance/           # Customer assistance tickets
│   │   ├── auth/                 # Authentication & JWT
│   │   ├── clients/              # Customer management
│   │   ├── common/               # Shared utilities & guards
│   │   ├── conversations/        # Email threading
│   │   ├── email/                # Email sync & sending
│   │   │   ├── email.service.ts  # Gmail API integration
│   │   │   └── email-sync.scheduler.ts  # Auto-sync (10s)
│   │   ├── email-rfq/            # RFQ AI processing
│   │   │   ├── email-rfq.service.ts     # AI parser
│   │   │   ├── po-matcher.service.ts    # PO matching
│   │   │   └── thread-resolver.service.ts # Thread grouping
│   │   ├── email-templates/      # Template management
│   │   ├── inbox/                # Email inbox management
│   │   ├── invoices/             # Invoice generation
│   │   ├── orders/               # Purchase order management
│   │   ├── products/             # Product catalog
│   │   ├── quotations/           # Quotation generation
│   │   ├── rfqs/                 # RFQ management
│   │   ├── settings/             # System configuration
│   │   ├── users/                # User management
│   │   ├── app.module.ts         # Root module
│   │   ├── main.ts               # Application entry point
│   │   └── prisma.service.ts     # Prisma client service
│   ├── test/                     # E2E tests
│   ├── .env.example              # Environment template
│   ├── Dockerfile                # Backend container
│   ├── nest-cli.json             # NestJS configuration
│   ├── package.json              # Dependencies & scripts
│   └── tsconfig.json             # TypeScript config
│
├── frontend/                     # React frontend application
│   ├── build/                    # Production build (gitignored)
│   ├── node_modules/             # Dependencies (gitignored)
│   ├── public/                   # Static assets
│   │   ├── index.html            # HTML template
│   │   └── favicon.ico           # App icon
│   ├── src/                      # Source code
│   │   ├── components/           # React components
│   │   │   ├── common/           # Reusable components
│   │   │   ├── EmailTemplatesContent.tsx
│   │   │   ├── Header.tsx        # Top navigation
│   │   │   ├── IntegrationImport.tsx
│   │   │   └── Sidebar.tsx       # Left navigation
│   │   ├── context/              # React context
│   │   │   └── AppContext.tsx    # Global state & polling
│   │   ├── pages/                # Page components
│   │   │   ├── Dashboard.tsx     # Main dashboard
│   │   │   ├── Inbox.tsx         # Email inbox
│   │   │   ├── Quotations.tsx    # Quotation list
│   │   │   ├── Products.tsx      # Product catalog
│   │   │   ├── Invoices.tsx      # Invoice management
│   │   │   ├── Orders.tsx        # Purchase orders
│   │   │   ├── EmailTemplates.tsx # Template editor
│   │   │   └── SystemConfig.tsx  # Settings
│   │   ├── services/             # API clients
│   │   │   └── api.ts            # HTTP requests
│   │   ├── App.tsx               # Root component
│   │   ├── index.tsx             # Application entry
│   │   └── index.css             # Global styles
│   ├── .env.example              # Environment template
│   ├── Dockerfile                # Frontend container
│   ├── package.json              # Dependencies & scripts
│   └── tsconfig.json             # TypeScript config
│
├── .github/                      # GitHub configuration
│   └── workflows/                # CI/CD workflows
│       └── smoke-tests.yml       # Automated testing
│
├── deployment/                   # Deployment guides
│   ├── DEPLOY-VERCEL-RENDER.md   # Vercel + Render guide
│   ├── DEPLOYMENT.md             # All platforms
│   ├── RENDER-BACKEND-DEPLOY.md  # Render detailed
│   └── RENDER-QUICK-CHECKLIST.txt # Quick checklist
│
├── docker-compose.yml            # Local Docker setup
├── Dockerfile.backend            # Backend image
├── Dockerfile.frontend           # Frontend image
├── nginx.conf                    # Nginx reverse proxy
├── render.yaml                   # Render.com config
├── vercel.json                   # Vercel config
├── railway.json                  # Railway config
│
├── .dockerignore                 # Docker ignore rules
├── .gitignore                    # Git ignore rules
├── .env.production.example       # Production env template
├── deploy.sh                     # Deployment helper script
├── setup-deployment.sh           # Deployment setup
├── start-services.sh             # Start all services
│
├── README.md                     # This file
├── QUICKSTART.md                 # Quick start guide
├── HOSTING-SETUP-COMPLETE.md     # Hosting documentation
└── package.json                  # Root package file
```

---

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/quotebot"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="7d"

# API Security
INTERNAL_API_KEY="quotebot-internal-2024-secure-key"

# Server
PORT=3001
NODE_ENV=development

# Frontend URL (CORS)
FRONTEND_URL="http://localhost:3000"

# Email Automation (Gmail OAuth)
GMAIL_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="your-client-secret"
GMAIL_REDIRECT_URI="http://localhost:3001/email/oauth2callback"

# Automation Flags
AUTO_EMAIL_SYNC_ENABLED=true          # Auto-sync every 10s
AUTO_SEND_QUOTATION=true              # Auto-send quotations
BACKEND_RFQ_PIPELINE_ENABLED=true     # Enable RFQ processing

# AI/LLM Integration (Optional)
OPENAI_API_KEY="sk-..."                # For GPT-4
ANTHROPIC_API_KEY="sk-ant-..."         # For Claude
DEFAULT_LLM_PROVIDER="openai"          # or "anthropic"

# File Uploads
MAX_FILE_SIZE=10485760                 # 10MB in bytes
UPLOAD_DEST="./uploads"

# Logging
LOG_LEVEL="info"                       # debug, info, warn, error
```

### Frontend Environment Variables

Create `frontend/.env`:

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:3001

# Optional: Custom port
PORT=3000

# Build optimization
GENERATE_SOURCEMAP=false
```

### Production Environment

For production deployment, see `.env.production.example` with secure values.

---

## 🌐 Deployment

### Quick Deployment (Recommended)

**Vercel (Frontend) + Render (Backend + Database)**

Total time: ~10 minutes | Cost: Free tier available

#### Step 1: Push to GitHub

```bash
git push origin main
```

#### Step 2: Deploy Frontend to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Import Project"
3. Select `QuotebotERP` repository
4. Configure:
   - Framework: Create React App
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
5. Add environment variable:
   - `VITE_API_URL` = (your backend URL from Step 3)
6. Deploy

#### Step 3: Deploy Backend to Render

1. Create PostgreSQL database:
   - Go to https://dashboard.render.com
   - New → PostgreSQL
   - Name: `quotebot-db`
   - Copy **Internal Database URL**

2. Deploy backend:
   - New → Web Service
   - Connect repository: `QuotebotERP`
   - Root Directory: `backend`
   - Build: `npm install && npx prisma generate && npm run build`
   - Start: `npx prisma migrate deploy && npm run start:prod`
   - Add environment variables (see Configuration)

#### Step 4: Update Frontend with Backend URL

1. Vercel → Settings → Environment Variables
2. Update `VITE_API_URL` with Render backend URL
3. Redeploy

**✅ Done! Your app is live.**

### Detailed Deployment Guides

- **[DEPLOY-VERCEL-RENDER.md](./DEPLOY-VERCEL-RENDER.md)** - Step-by-step Vercel + Render
- **[RENDER-BACKEND-DEPLOY.md](./RENDER-BACKEND-DEPLOY.md)** - Render detailed guide
- **[RENDER-QUICK-CHECKLIST.txt](./RENDER-QUICK-CHECKLIST.txt)** - Quick checklist
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - All platforms (Docker, Railway, etc.)

### Docker Deployment

```bash
# Start all services (frontend + backend + database)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Access:
- Frontend: http://localhost:80
- Backend: http://localhost:3001
- Database: localhost:5432

### Cost Comparison

| Platform | Frontend | Backend | Database | Total/Month |
|----------|----------|---------|----------|-------------|
| **Free Tier** | Vercel Free | Render Free | Render Free (90 days) | $0 |
| **Production** | Vercel Free | Render Starter ($7) | Render Starter ($7) | $14 |
| **Enterprise** | Vercel Pro ($20) | Render Standard ($25) | Render Standard ($20) | $65 |

---

## 📚 API Documentation

### Authentication

All API requests require JWT token (except `/auth/login` and `/auth/register`).

```bash
# Login
POST /auth/login
{
  "email": "admin@quotebot.com",
  "password": "admin123"
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "...", "role": "admin" }
}

# Use token in subsequent requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Core Endpoints

#### Emails
```bash
GET    /email/accounts              # List email accounts
POST   /email/accounts              # Add email account
GET    /email/sync                  # Trigger manual sync
POST   /email/send                  # Send email
GET    /email/oauth2callback        # Gmail OAuth callback
```

#### Inbox
```bash
GET    /inbox/messages              # List all emails
GET    /inbox/messages/:id          # Get email details
PATCH  /inbox/messages/:id/status   # Update processing status
POST   /inbox/messages/:id/retry    # Retry failed processing
```

#### RFQs
```bash
GET    /rfqs                        # List RFQs
POST   /rfqs                        # Create RFQ
GET    /rfqs/:id                    # Get RFQ details
PATCH  /rfqs/:id                    # Update RFQ
DELETE /rfqs/:id                    # Delete RFQ
PATCH  /rfqs/:id/status             # Update status
```

#### Quotations
```bash
GET    /quotations                  # List quotations
POST   /quotations                  # Create quotation
GET    /quotations/:id              # Get quotation
PATCH  /quotations/:id              # Update quotation
DELETE /quotations/:id              # Delete quotation
POST   /quotations/:id/send         # Send quotation email
GET    /quotations/:id/pdf          # Download PDF
```

#### Products
```bash
GET    /products                    # List products
POST   /products                    # Create product
GET    /products/:id                # Get product
PATCH  /products/:id                # Update product
DELETE /products/:id                # Delete product
POST   /products/:id/image          # Upload image
```

#### Email Templates
```bash
GET    /email-templates             # List templates
POST   /email-templates             # Create template
GET    /email-templates/:id         # Get template
PATCH  /email-templates/:id         # Update template
DELETE /email-templates/:id         # Delete template
```

For complete API documentation, see [API.md](./API.md) or run backend with Swagger:
```bash
# Access Swagger UI
http://localhost:3001/api
```

---

## 📧 Email Automation

### Gmail OAuth Setup

#### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create new project: "QuotebotERP"
3. Enable Gmail API:
   - APIs & Services → Library
   - Search "Gmail API" → Enable

#### 2. Create OAuth Credentials

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: Web application
4. Name: "QuotebotERP Backend"
5. Authorized redirect URIs:
   - Local: `http://localhost:3001/email/oauth2callback`
   - Production: `https://your-backend.onrender.com/email/oauth2callback`
6. Copy **Client ID** and **Client Secret**

#### 3. Configure Backend

Add to `backend/.env`:
```bash
GMAIL_CLIENT_ID="123456789-xxx.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="GOCSPX-xxx"
GMAIL_REDIRECT_URI="http://localhost:3001/email/oauth2callback"
```

#### 4. Authorize Email Account

1. Login to frontend as admin
2. Go to Settings → Email Accounts
3. Click "Add Gmail Account"
4. Follow OAuth flow to authorize
5. Account will appear in list

#### 5. Enable Auto-Sync

Set in `backend/.env`:
```bash
AUTO_EMAIL_SYNC_ENABLED=true
AUTO_SEND_QUOTATION=true
BACKEND_RFQ_PIPELINE_ENABLED=true
```

Restart backend. Emails will sync every 10 seconds automatically.

### Email Processing Flow

```
1. EMAIL SYNC (Every 10 seconds)
   ↓
2. NEW EMAIL DETECTED
   ↓
3. AI CLASSIFICATION
   - Is it an RFQ? → Process
   - Is it a PO? → Match to quotation
   - Is it general? → Store in inbox
   ↓
4. RFQ PROCESSING (if applicable)
   - Extract items using GPT-4/Claude
   - Match to product catalog
   - Check inventory availability
   - Calculate pricing
   ↓
5. AUTO-QUOTATION GENERATION
   - Create quotation record
   - Generate PDF
   - Apply email template
   - Send via Gmail API
   ↓
6. TRACKING & LOGGING
   - Store sent email details
   - Update quotation status
   - Log all actions
```

---

## 🛠️ Development

### Local Development Setup

#### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

#### 2. Start Database

```bash
# Using Docker
docker run -d \
  --name quotebot-db \
  -e POSTGRES_USER=quotebot \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=quotebot \
  -p 5432:5432 \
  postgres:15

# Or use existing PostgreSQL installation
```

#### 3. Run Migrations & Seed

```bash
cd backend
npx prisma migrate dev
npm run db:seed
```

#### 4. Start Development Servers

**Terminal 1 (Backend):**
```bash
cd backend
npm run start:dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

**Terminal 3 (Email Sync - Optional):**
```bash
cd backend
node scripts/sync-gmail.js
```

### Useful Development Commands

```bash
# Backend
npm run start:dev         # Start with hot reload
npm run start:debug       # Start with debugger
npm run lint              # Lint code
npm run format            # Format code with Prettier
npm run test              # Run unit tests
npm run test:e2e          # Run E2E tests
npm run test:cov          # Test coverage

# Frontend
npm start                 # Start dev server
npm test                  # Run tests in watch mode
npm run build             # Production build
npm run eject             # Eject from CRA (irreversible)

# Database
npx prisma studio         # Open Prisma Studio GUI
npx prisma migrate dev    # Create migration
npx prisma migrate reset  # Reset database
npx prisma generate       # Generate Prisma client
npm run db:seed           # Seed database
```

### Adding New Features

#### 1. Backend Module

```bash
# Generate new module
nest g module feature-name
nest g service feature-name
nest g controller feature-name
```

#### 2. Database Schema

Edit `backend/prisma/schema.prisma`:
```prisma
model NewFeature {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

Create migration:
```bash
npx prisma migrate dev --name add_new_feature
```

#### 3. Frontend Component

```bash
cd frontend/src/pages
# Create NewFeature.tsx
```

Add route in `App.tsx`:
```tsx
<Route path="/new-feature" element={<NewFeature />} />
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Test specific file
npm run test -- email.service.spec.ts

# Test LLM integration
npm run test:llm

# Test email RFQ pipeline
npm run test:email-pipeline

# Test quotation sending
npm run test:quotation-send
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Coverage
npm test -- --coverage --watchAll=false
```

### Manual Testing Utilities

```bash
# Test all API endpoints
cd backend
node scripts/test-all-endpoints.js

# Add sample products
ts-node scripts/add-products.ts

# Sync Gmail manually
node scripts/sync-gmail.js

# Test email-to-quotation flow
npm run test:email-flow:auto
```

---

## 🐛 Troubleshooting

### Common Issues

#### Backend won't start

**Error:** `Cannot find module '@nestjs/core'`
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**Error:** `Prisma Client not generated`
```bash
npx prisma generate
```

**Error:** `Database connection failed`
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

#### Frontend build fails

**Error:** `'loading' is assigned but never used`
```bash
# Already fixed in latest commit
git pull origin main
```

**Error:** `Module not found`
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Email sync not working

**Check 1:** Verify OAuth credentials
```bash
# In backend/.env
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
```

**Check 2:** Check if auto-sync is enabled
```bash
AUTO_EMAIL_SYNC_ENABLED=true
```

**Check 3:** View sync logs
```bash
cd backend
tail -f backend.log | grep EmailSync
```

**Check 4:** Manually trigger sync
```bash
curl http://localhost:3001/email/sync
```

#### Quotations not auto-sending

**Check 1:** Verify flags
```bash
AUTO_SEND_QUOTATION=true
BACKEND_RFQ_PIPELINE_ENABLED=true
```

**Check 2:** Check RFQ processing logs
```bash
tail -f backend/backend.log | grep RFQ
```

**Check 3:** Test quotation send manually
```bash
npm run test:quotation-send
```

#### Database migration issues

**Error:** `Migration failed`
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev

# Seed database
npm run db:seed
```

#### Port already in use

```bash
# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Debug Mode

Enable debug logging:

```bash
# Backend
LOG_LEVEL=debug npm run start:dev

# View detailed logs
tail -f backend/backend.log
```

### Getting Help

1. Check existing issues: https://github.com/AbhimanyuGit2507/QuotebotERP/issues
2. Review deployment guides in `/deployment` folder
3. Check logs: `backend/backend.log`
4. Enable debug mode: `LOG_LEVEL=debug`
5. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version)
   - Logs

---

## 🤝 Contributing

We welcome contributions! Here's how:

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/QuotebotERP.git
cd QuotebotERP
```

### 2. Create Branch

```bash
git checkout -b feature/my-new-feature
```

### 3. Make Changes

- Follow existing code style
- Add tests for new features
- Update documentation

### 4. Test

```bash
# Backend tests
cd backend && npm run test

# Frontend tests
cd frontend && npm test

# E2E tests
cd backend && npm run test:e2e
```

### 5. Commit

```bash
git add .
git commit -m "feat: add amazing new feature"

# Commit message format:
# feat: new feature
# fix: bug fix
# docs: documentation
# style: formatting
# refactor: code restructuring
# test: adding tests
# chore: maintenance
```

### 6. Push & Pull Request

```bash
git push origin feature/my-new-feature
```

Open PR on GitHub with description of changes.

### Code Style

- **TypeScript:** Use strict type checking
- **Naming:** camelCase for variables, PascalCase for classes
- **Imports:** Group by external, internal, relative
- **Comments:** Document complex logic
- **ESLint:** Run `npm run lint` before committing

---

## 📄 License

**UNLICENSED** - Proprietary software. All rights reserved.

This software is not open source and may not be copied, distributed, or modified without explicit permission.

---

## 👥 Authors

- **Abhimanyu** - [@AbhimanyuGit2507](https://github.com/AbhimanyuGit2507)

---

## 🙏 Acknowledgments

- NestJS community for excellent framework
- React team for modern UI library
- Prisma team for amazing ORM
- OpenAI for GPT-4 API
- Anthropic for Claude API
- Google for Gmail API

---

## 📞 Support

- **GitHub Issues:** https://github.com/AbhimanyuGit2507/QuotebotERP/issues
- **Documentation:** See `/deployment` folder
- **Email:** admin@quotebot.com

---

## 🗺️ Roadmap

### ✅ Completed (v1.0)
- [x] Email sync automation
- [x] AI-powered RFQ processing
- [x] Auto-quotation generation
- [x] Real-time dashboard
- [x] Email templates
- [x] Multi-tenant architecture
- [x] Vercel + Render deployment

### 🚧 In Progress (v1.1)
- [ ] WhatsApp integration
- [ ] SMS notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Multi-currency support

### 📋 Planned (v2.0)
- [ ] Inventory forecasting (ML)
- [ ] Supplier management
- [ ] Manufacturing module
- [ ] Blockchain invoicing
- [ ] API marketplace

---

## 📊 Project Stats

- **Backend:** 50+ API endpoints
- **Database:** 30+ tables
- **Frontend:** 20+ pages/components
- **Email Templates:** 5 customizable templates
- **Automation:** 3 background jobs
- **AI Integration:** 2 LLM providers
- **Deployment:** 4 platform guides
- **Documentation:** 2000+ lines

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by [Abhimanyu](https://github.com/AbhimanyuGit2507)

[⬆ Back to Top](#quoteboterp---intelligent-email-to-quotation-automation-system)

</div>
