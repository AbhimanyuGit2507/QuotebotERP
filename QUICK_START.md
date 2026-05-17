# Quotebot Backend - Quick Reference Card 🚀

## 📝 Prerequisites
- Node.js v18+: `node --version`
- npm v9+: `npm --version`
- PostgreSQL 14+: Running locally

## ⚡ 5-Minute Setup

```bash
# 1. Create database
createdb -U postgres quotebot_db

# 2. Navigate to backend
cd backend

# 3. Install dependencies (if not done)
npm install

# 4. Run migrations
npm run db:migrate -- --name init

# 5. Seed test data
npm run db:seed

# 6. Start server
npm run start:dev
```

Server runs on **http://localhost:3001/api**

---

## 🧪 Test Immediately

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Login
```bash
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@quotebot.com",
    "password": "Admin@123"
  }'
```

**Response**: auth cookies set (`qb_access_token`, `qb_refresh_token`)

### Use Cookies
```bash
curl -b cookies.txt http://localhost:3001/api/auth/me
```

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `backend/.env` | Configuration (update if needed) |
| `backend/src/auth/` | Authentication module (use as template) |
| `backend/prisma/schema.prisma` | Database schema |
| `backend/prisma/seed.ts` | Test data script |
| `SETUP_GUIDE.md` | Complete setup instructions |
| `BACKEND_IMPLEMENTATION_GUIDE.md` | 4000+ line architecture guide |

---

## 🔧 Common Commands

```bash
# Development
npm run start:dev              # Start with auto-reload
npm run start:debug            # Start with debugger

# Database
npm run db:migrate             # Run migrations
npm run db:seed                # Seed test data
npm run db:reset               # RESET database (deletes all!)
npm run db:studio              # Open Prisma GUI

# Code Quality
npm run lint                   # ESLint
npm run format                 # Prettier

# Testing  
npm test                       # Unit tests
npm run test:cov               # Coverage report

# Build
npm run build                  # Build for production
npm run start:prod             # Run production build
```

---

## 🆔 Test Account

After running `npm run db:seed`:

```
Email:    admin@quotebot.com
Password: Admin@123
Role:     admin
Tenant:   Quotebot Solutions Inc (default)
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED 127.0.0.1:5432` | Start PostgreSQL |
| Database doesn't exist | Run `createdb -U postgres quotebot_db` |
| Wrong credentials on login | Run `npm run db:seed` |
| Compilation errors | Run `npm install` |
| `relation does not exist` | Run `npm run db:migrate -- --name init` |
| Port 3001 in use | Kill process or change `API_PORT` in `.env` |

---

## 📖 API Endpoints

### Health & Status
```
GET  /api                 → Health check
GET  /api/health          → Detailed health
GET  /api/docs            → API documentation
```

### Authentication  
```
POST /api/auth/login      → Login (email, password)
POST /api/auth/register   → Register (tenant, email, name, password)
POST /api/auth/validate   → Validate token
```

### Planned Modules (Next)
```
🔜 GET    /api/products              → List products
🔜 POST   /api/products              → Create product
🔜 GET    /api/clients               → List clients
🔜 POST   /api/clients               → Create client
🔜 GET    /api/rfqs                  → List RFQs
🔜 GET    /api/quotations            → List quotations
🔜 GET    /api/dashboard             → Dashboard KPIs
🔜 GET    /api/analytics/sales-trend → Sales analytics
🔜 POST   /api/files/upload          → Upload file
```

### Internal Email Endpoints (Automation Scripts)
```
POST  /api/internal/email/inbound     → Ingest email from provider
      Headers: X-Internal-Key, X-Tenant-ID
      
GET   /api/internal/email/outbound    → Fetch pending outbound emails
      Headers: X-Internal-Key, X-Tenant-ID
      
PATCH /api/internal/email/outbound/:id → Update send status
                  Headers: X-Internal-Key, X-Tenant-ID
```

**Example - Test inbound endpoint:**
```bash
export INTERNAL_API_KEY="dev-internal-key"
export SYNC_TENANT_ID="your-tenant-id"

curl -X POST http://localhost:3001/api/internal/email/inbound \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: ${INTERNAL_API_KEY}" \
  -H "X-Tenant-ID: ${SYNC_TENANT_ID}" \
  -d '{
    "email_account_id": "acc_123",
    "external_id": "gmail_msg_456",
    "provider": "gmail",
    "sender_email": "client@example.com",
    "sender_name": "John Doe",
    "subject": "RFQ for parts",
    "body": "Need 100 units",
    "received_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

**Automation script environment variables:**
```bash
API_BASE_URL=http://localhost:3001/api
INTERNAL_API_KEY=dev-internal-key
SYNC_TENANT_ID=your-tenant-id
```

---

## 🏗️ Architecture

```
Frontend (React)
      ↓
    [CORS]
      ↓
Backend API (NestJS)
      ↓
[Authentication] ← JWT Strategy
      ↓
[Modules] (Auth ✅, Products, Clients, etc.)
      ↓
Database (PostgreSQL)
      ↓
Prisma ORM
```

---

## 👨‍💻 Development Workflow

1. **Create new module** (copy from `src/auth/` structure)
   - `module.ts` - Module definition
   - `service.ts` - Business logic  
   - `controller.ts` - Endpoints
   - `dtos/` - Input validation

2. **Implement endpoints**
   - Follow Auth pattern
   - Use DTOs for validation
   - Add service business logic

3. **Add to app.module.ts**
   - Import new module
   - Export in imports array

4. **Test endpoint**
   - Use cURL or Postman
   - Include Bearer token for protected routes

5. **Commit & document**
   - Update README
   - Document new endpoints

---

## 🔐 Security Notes

- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ JWT tokens for stateless auth
- ✅ CORS configured for frontend
- ✅ Input validation on all endpoints
- ✅ Role-based access control ready
- ⚠️ Change JWT_SECRET in production (min 32 chars)
- ⚠️ Use HTTPS in production
- ⚠️ Implement rate limiting for production

---

## 📊 Database Schema

**20+ Tables**:
- Tenancy: Tenant, User, Role
- Products: Product, ProductCategory
- Business: Client, RFQ, RFQItem, Quotation, QuotationItem, QuotationVersion
- Operations: Activity, AuditLog, File, AnalyticsCache
- Settings: SettingsCompany, SettingsNotifications, SettingsTemplate, AutomationRule

See `prisma/schema.prisma` for complete schema.

---

## 💡 Pro Tips

- Use `npm run db:studio` to browse database visually
- Use `npm run start:debug` to debug with Node inspector
- Check `.env` for configuration options
- Read `BACKEND_IMPLEMENTATION_GUIDE.md` for detailed architecture
- Follow Auth module pattern for all new modules
- Test endpoints with Postman or Insomnia GUI
- Use `npm run db:reset` to start fresh (deletes all data!)

---

## 📞 Getting Help

1. **Setup issues** → Read [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. **Architecture** → Read [BACKEND_IMPLEMENTATION_GUIDE.md](./BACKEND_IMPLEMENTATION_GUIDE.md)
3. **Code structure** → Check `src/auth/` for module template
4. **Database** → Check `prisma/schema.prisma`
5. **Commands** → Run `npm run` to see all available scripts

---

## ✅ Pre-Launch Checklist

- [ ] PostgreSQL is running
- [ ] Database `quotebot_db` created
- [ ] Dependencies installed (`npm install`)
- [ ] Migrations run (`npm run db:migrate`)
- [ ] Test data seeded (`npm run db:seed`)
- [ ] Server starts (`npm run start:dev`)
- [ ] Health check responds (`curl http://localhost:3001/api`)
- [ ] Login works with test credentials
- [ ] JWT token received after login
- [ ] Ready to build modules!

---

**Status**: ✅ Ready to start building  
**Last Updated**: 2024  
**Total Setup Time**: ~5 minutes
