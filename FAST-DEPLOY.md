# Fast Deployment Guide - Update Existing Vercel + Deploy Backend

## Prerequisites
- Existing Vercel deployment: https://quotebot-sigma.vercel.app/dashboard
- GitHub repository: https://github.com/AbhimanyuGit2507/QuotebotERP

## Step 1: Push Code to GitHub (REQUIRED FIRST)

```bash
# From your local machine, push the code
cd /home/avi/Projects/Quotebot
git push -u origin main
```

> **Note:** If you haven't pushed yet, you need to authenticate with GitHub first. Use SSH or HTTPS with a Personal Access Token.

---

## Step 2: Update Vercel Frontend (2 minutes)

### Option A: Automatic Deployment (If Vercel is connected to GitHub)
1. Vercel will automatically detect the new commit and start deploying
2. Go to https://vercel.com/dashboard
3. Click on your "quotebot-sigma" project
4. Wait for the deployment to complete (~2-3 minutes)
5. ✅ Done! Your frontend will be updated automatically

### Option B: Manual Redeploy (If auto-deploy doesn't work)
1. Go to https://vercel.com/dashboard
2. Click on your "quotebot-sigma" project
3. Go to **Settings** → **Git**
4. Make sure it's connected to `AbhimanyuGit2507/QuotebotERP` repository
5. Go back to **Deployments** tab
6. Click **Redeploy** on the latest deployment

### Update Vercel Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Update/Add these variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
3. Click **Save**
4. Redeploy for changes to take effect

---

## Step 3: Deploy Backend to Render (5 minutes)

### 3.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub account (free tier available)

### 3.2 Create PostgreSQL Database
1. Click **New** → **PostgreSQL**
2. Configure:
   - **Name:** quotebot-db
   - **Database:** quotebot
   - **User:** quotebot
   - **Region:** Choose closest to you
   - **Plan:** Free (or Starter $7/month for better performance)
3. Click **Create Database**
4. **SAVE** the **Internal Database URL** and **External Database URL**
   - Format: `postgresql://user:password@host:port/database`

### 3.3 Deploy Backend Service
1. Click **New** → **Web Service**
2. Connect your GitHub repository: `AbhimanyuGit2507/QuotebotERP`
3. Configure:
   - **Name:** quotebot-backend
   - **Region:** Same as database
   - **Branch:** main
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm run start:prod`
   - **Plan:** Free (or Starter $7/month for always-on)

### 3.4 Configure Environment Variables
Click **Environment** → **Add Environment Variable**

Add these variables (copy from `backend/.env.example`):

```bash
# Database
DATABASE_URL=<paste-internal-database-url-from-step-3.2>

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API Keys
INTERNAL_API_KEY=quotebot-internal-2024-secure-key

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://quotebot-sigma.vercel.app

# Email Sync (enable after testing)
AUTO_EMAIL_SYNC_ENABLED=false
AUTO_SEND_QUOTATION=false
BACKEND_RFQ_PIPELINE_ENABLED=false

# Gmail OAuth (add later when ready)
# GMAIL_CLIENT_ID=
# GMAIL_CLIENT_SECRET=
# GMAIL_REDIRECT_URI=https://your-backend.onrender.com/email/oauth2callback

# Optional: LLM for RFQ processing
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
```

4. Click **Save Changes**
5. Render will automatically deploy (~5-7 minutes)

### 3.5 Get Backend URL
- After deployment completes, you'll get a URL like:
  - `https://quotebot-backend.onrender.com`
- **SAVE THIS URL**

---

## Step 4: Link Frontend to Backend

### 4.1 Update Vercel Environment Variable
1. Go to Vercel Dashboard → **quotebot-sigma** project
2. Go to **Settings** → **Environment Variables**
3. Update:
   ```
   VITE_API_URL=https://quotebot-backend.onrender.com
   ```
4. Click **Save**
5. Go to **Deployments** → Click **Redeploy** (use existing build cache)

### 4.2 Update Backend CORS
1. Go to Render Dashboard → **quotebot-backend** service
2. Go to **Environment**
3. Update:
   ```
   FRONTEND_URL=https://quotebot-sigma.vercel.app
   ```
4. Click **Save** (will auto-redeploy)

---

## Step 5: Test Deployment

### 5.1 Test Backend
```bash
# Check backend health
curl https://quotebot-backend.onrender.com/

# You should get: {"status":"ok"}
```

### 5.2 Test Frontend
1. Go to https://quotebot-sigma.vercel.app/
2. Login with: `admin@quotebot.com` / `admin123`
3. Check if dashboard loads
4. ✅ Done!

---

## Step 6: Enable Email Features (After Testing)

Once basic deployment works, enable email features:

### 6.1 Set Up Gmail OAuth
1. Follow Gmail OAuth setup from `DEPLOYMENT.md` (Step 4)
2. Add credentials to Render environment variables
3. Restart backend service

### 6.2 Enable Auto Email Sync
In Render environment variables:
```bash
AUTO_EMAIL_SYNC_ENABLED=true
AUTO_SEND_QUOTATION=true
BACKEND_RFQ_PIPELINE_ENABLED=true
```

---

## Troubleshooting

### Render Free Tier Limitations
- **Cold starts:** Service spins down after 15 min idle (~30s wake up time)
- **750 hours/month:** ~$7/month for always-on Starter plan recommended for production

### Common Issues

**1. Backend won't start**
- Check Render logs: Dashboard → Logs
- Verify DATABASE_URL is correct
- Ensure all required env vars are set

**2. Frontend can't connect to backend**
- Check VITE_API_URL in Vercel
- Check CORS settings (FRONTEND_URL in Render)
- Open browser console for errors

**3. Database connection errors**
- Use **Internal Database URL** for Render services (not External)
- Format: `postgresql://user:password@hostname.internal:5432/database`

**4. Gmail sync not working**
- First test without email sync (AUTO_EMAIL_SYNC_ENABLED=false)
- Set up OAuth credentials properly
- Check backend logs for email errors

---

## Quick Commands Reference

### Local Testing Before Deploy
```bash
# Test backend build
cd backend
npm run build

# Test frontend build
cd frontend
npm run build
```

### Check Deployment Status
```bash
# Vercel CLI (install: npm i -g vercel)
vercel ls

# Check backend
curl https://quotebot-backend.onrender.com/
```

---

## Cost Summary

### Free Tier (Recommended for testing)
- **Vercel:** Free (100GB bandwidth/month)
- **Render PostgreSQL:** Free (expires after 90 days, 1GB storage)
- **Render Web Service:** Free (750 hours/month, sleeps after 15min)
- **Total:** $0/month

### Production (Recommended for real use)
- **Vercel:** Free (sufficient for most cases)
- **Render PostgreSQL:** $7/month (Starter plan, persistent)
- **Render Web Service:** $7/month (Starter plan, always-on)
- **Total:** $14/month

---

## Next Steps After Deployment

1. ✅ Change default admin password
2. ✅ Set up Gmail OAuth for email features
3. ✅ Add products to inventory
4. ✅ Configure email templates
5. ✅ Enable auto email sync and quotation sending
6. ✅ Test complete email-to-quotation flow
7. ✅ Upgrade to paid plans for production use

---

## Support

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Project Issues: https://github.com/AbhimanyuGit2507/QuotebotERP/issues
