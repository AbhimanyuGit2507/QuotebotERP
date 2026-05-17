# 🚀 Render Backend Deployment - Fast Track

## Prerequisites
- [ ] Code pushed to GitHub: https://github.com/AbhimanyuGit2507/QuotebotERP
- [ ] Render account (sign up at https://render.com with GitHub)

---

## PART 1: Create PostgreSQL Database (2 minutes)

### Step 1: Create Database
1. Go to https://dashboard.render.com
2. Click **New +** button (top right)
3. Select **PostgreSQL**

### Step 2: Configure Database
Fill in these exact values:
```
Name: quotebot-db
Database: quotebot
User: quotebot
Region: Singapore (or closest to you)
PostgreSQL Version: 15
Datadog API Key: (leave empty)
Plan: Free
```

### Step 3: Create Database
1. Click **Create Database**
2. Wait 30-60 seconds for database to provision
3. **IMPORTANT:** Copy the **Internal Database URL**
   - Click on the database name
   - Scroll down to **Connections** section
   - Copy **Internal Database URL**
   - It looks like: `postgresql://quotebot:xxx@dpg-xxx.singapore-postgres.render.com/quotebot`
   - **SAVE THIS URL - YOU'LL NEED IT IN PART 2**

---

## PART 2: Deploy Backend Service (5 minutes)

### Step 1: Create Web Service
1. Click **New +** button (top right)
2. Select **Web Service**
3. Click **Connect a repository**
4. Choose **GitHub** and authorize if needed
5. Select repository: **QuotebotERP**

### Step 2: Configure Service
Fill in these exact values:

```
Name: quotebot-backend
Region: Singapore (same as database!)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npx prisma generate && npm run build
Start Command: npx prisma migrate deploy && npm run start:prod
Plan: Free (or Starter $7/month for always-on)
```

### Step 3: Add Environment Variables (MOST IMPORTANT!)

Scroll down to **Environment Variables** section.

Click **Add Environment Variable** and add these ONE BY ONE:

#### Required Variables (Copy-paste exactly):

**1. DATABASE_URL**
```
DATABASE_URL
<PASTE YOUR INTERNAL DATABASE URL FROM PART 1>
```

**2. JWT_SECRET**
```
JWT_SECRET
your-super-secret-jwt-key-change-this-in-production-abc123xyz
```

**3. INTERNAL_API_KEY**
```
INTERNAL_API_KEY
quotebot-internal-2024-secure-key
```

**4. FRONTEND_URL**
```
FRONTEND_URL
https://quotebot-sigma.vercel.app
```

**5. NODE_ENV**
```
NODE_ENV
production
```

**6. PORT**
```
PORT
3000
```

**7. AUTO_EMAIL_SYNC_ENABLED** (disable for now)
```
AUTO_EMAIL_SYNC_ENABLED
false
```

**8. AUTO_SEND_QUOTATION** (disable for now)
```
AUTO_SEND_QUOTATION
false
```

**9. BACKEND_RFQ_PIPELINE_ENABLED** (disable for now)
```
BACKEND_RFQ_PIPELINE_ENABLED
false
```

### Step 4: Deploy
1. Click **Create Web Service**
2. Render will start building and deploying
3. **Wait 5-7 minutes** - You can watch the logs
4. When you see "Your service is live 🎉" - it's ready!

### Step 5: Get Your Backend URL
1. At the top of the page, you'll see your service URL
2. It looks like: `https://quotebot-backend.onrender.com`
3. **COPY THIS URL - YOU'LL NEED IT FOR VERCEL**

---

## PART 3: Verify Backend is Working (30 seconds)

### Test 1: Health Check
Open in browser or run in terminal:
```bash
curl https://quotebot-backend.onrender.com/
```

**Expected Response:**
```json
{"status":"ok"}
```

### Test 2: Check Logs
1. In Render dashboard, click on your **quotebot-backend** service
2. Click **Logs** tab
3. Look for:
   - ✅ "Nest application successfully started"
   - ✅ "Listening on port 3000"
   - ❌ No error messages about database connection

---

## PART 4: Update Vercel Frontend (2 minutes)

### Step 1: Update Environment Variable
1. Go to https://vercel.com/dashboard
2. Click on **quotebot-sigma** project
3. Go to **Settings** → **Environment Variables**
4. Find **VITE_API_URL** or add it if missing
5. Set value to: `https://quotebot-backend.onrender.com`
6. Click **Save**

### Step 2: Redeploy Frontend
1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. Check "Use existing Build Cache"
5. Click **Redeploy**
6. Wait 1-2 minutes

---

## PART 5: Test Complete System (1 minute)

### Test Frontend to Backend Connection
1. Open: https://quotebot-sigma.vercel.app/
2. Login:
   - Email: `admin@quotebot.com`
   - Password: `admin123`
3. ✅ You should see the dashboard
4. ✅ Check if data loads (products, quotations, etc.)

### If Login Works:
🎉 **DEPLOYMENT SUCCESSFUL!**

Your backend URL: `https://quotebot-backend.onrender.com`
Your frontend URL: `https://quotebot-sigma.vercel.app`

---

## 🔥 TROUBLESHOOTING

### Backend Deploy Failed
**Check Build Logs:**
1. Render Dashboard → quotebot-backend → Logs
2. Look for errors during build

**Common Issues:**
- ❌ **"Cannot find module"** → Build command might be wrong
  - Fix: Verify Build Command is: `npm install && npx prisma generate && npm run build`
- ❌ **"Prisma migrate failed"** → DATABASE_URL might be wrong
  - Fix: Double-check DATABASE_URL matches Internal URL from database
- ❌ **"Port already in use"** → Start command wrong
  - Fix: Verify Start Command is: `npx prisma migrate deploy && npm run start:prod`

### Backend Deployed but Returns 503
**Reason:** Free tier service is sleeping (cold start)
**Solution:** 
- Wait 30-60 seconds and refresh
- Consider upgrading to Starter plan ($7/month) for always-on

### Frontend Can't Connect to Backend
**Check CORS:**
1. Render → quotebot-backend → Environment
2. Verify `FRONTEND_URL=https://quotebot-sigma.vercel.app`
3. If wrong, update and save (will auto-redeploy)

**Check API URL:**
1. Vercel → quotebot-sigma → Settings → Environment Variables
2. Verify `VITE_API_URL` matches your backend URL
3. If wrong, update, save, and redeploy

### Database Connection Errors
**Error:** "Can't reach database server"
**Fix:**
- Use **Internal Database URL** not External
- Format should be: `postgresql://user:pass@dpg-xxx.singapore-postgres.render.com/dbname`
- Make sure backend and database are in the SAME REGION

---

## 📋 SUMMARY CHECKLIST

After deployment, verify:
- [ ] Backend URL responds: `https://quotebot-backend.onrender.com/`
- [ ] Frontend loads: `https://quotebot-sigma.vercel.app/`
- [ ] Can login with `admin@quotebot.com` / `admin123`
- [ ] Dashboard shows data
- [ ] No console errors in browser (F12)

**URLs to Save:**
```
Backend: https://quotebot-backend.onrender.com
Frontend: https://quotebot-sigma.vercel.app
Database: (Internal URL saved securely)
```

---

## 🎯 NEXT STEPS (After Basic Deployment Works)

1. **Change Admin Password**
   - Login → Settings → Change password

2. **Enable Email Features** (Optional)
   - Set up Gmail OAuth (see DEPLOYMENT.md)
   - Update Render env vars:
     ```
     AUTO_EMAIL_SYNC_ENABLED=true
     AUTO_SEND_QUOTATION=true
     BACKEND_RFQ_PIPELINE_ENABLED=true
     ```

3. **Upgrade to Production** (Recommended)
   - Render PostgreSQL: Starter Plan ($7/month) - persistent database
   - Render Web Service: Starter Plan ($7/month) - always-on, no cold starts
   - Total: $14/month

4. **Security**
   - Change `JWT_SECRET` to a random secure string
   - Change `INTERNAL_API_KEY` to a random secure string
   - Set up proper Gmail OAuth credentials

---

## 💡 PRO TIPS

1. **Free Tier Behavior:**
   - Backend sleeps after 15 minutes of inactivity
   - First request after sleep takes ~30 seconds (cold start)
   - Database is always running (even on free tier)

2. **Monitoring:**
   - Check Render Logs regularly for errors
   - Set up email notifications in Render settings

3. **Performance:**
   - Free tier has limited resources
   - For production use, upgrade to Starter plans

4. **Database Backups:**
   - Free tier: No automatic backups
   - Paid tier: Daily automatic backups

---

## 🆘 NEED HELP?

**Render Support:**
- Docs: https://render.com/docs
- Community: https://community.render.com

**Project Issues:**
- GitHub: https://github.com/AbhimanyuGit2507/QuotebotERP/issues

**Check Logs:**
- Backend: Render Dashboard → quotebot-backend → Logs
- Frontend: Vercel Dashboard → quotebot-sigma → Logs
