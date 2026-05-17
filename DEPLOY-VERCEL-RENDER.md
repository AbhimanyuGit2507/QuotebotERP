# 🚀 Deploy Quotebot: Vercel + Render

Complete step-by-step guide to deploy your frontend to Vercel and backend to Render.

**Total Time: ~10 minutes**

---

## 📋 Prerequisites

Before starting, get these ready:

- [ ] GitHub account
- [ ] OpenAI API key from [platform.openai.com](https://platform.openai.com)
- [ ] Strong JWT secret (generate below)
- [ ] (Optional) Gmail OAuth credentials

### Generate JWT Secret

```bash
# Run this to generate a secure JWT secret
openssl rand -base64 48
```

Copy the output - you'll need it for Render.

---

## PART 1: Push Code to GitHub (2 min)

### Step 1: Initialize Git Repository

```bash
cd /home/avi/Projects/Quotebot

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Ready for deployment"

# Set main branch
git branch -M main
```

### Step 2: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: **quotebot**
3. Keep it **Private** (recommended) or Public
4. **Don't** initialize with README (we already have code)
5. Click **"Create repository"**

### Step 3: Push to GitHub

```bash
# Replace YOUR-USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR-USERNAME/quotebot.git

# Push code
git push -u origin main
```

**✅ Code is now on GitHub!**

---

## PART 2: Deploy Backend to Render (5 min)

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Sign up with **GitHub** (easiest)
4. Authorize Render to access your repositories

### Step 2: Create PostgreSQL Database

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**

2. **Configure Database:**
   - **Name**: `quotebot-db`
   - **Database**: `quotebot_db`
   - **User**: `postgres`
   - **Region**: Choose closest to you (e.g., Singapore, Frankfurt, Oregon)
   - **PostgreSQL Version**: 15
   - **Plan**: **Free** (or Starter $7/month for production)

3. Click **"Create Database"**

4. Wait ~2 minutes for database to provision

5. **Copy Database URLs** (you'll need these):
   - Click on your database
   - Copy **"Internal Database URL"** (starts with `postgresql://`)
   - Keep this tab open

### Step 3: Deploy Backend Web Service

1. Click **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - Select **"Build and deploy from a Git repository"**
   - Click **"Connect"** next to your **quotebot** repository
   - Click **"Connect"** to authorize

3. **Configure Service:**
   ```
   Name: quotebot-backend
   Region: Same as your database (e.g., Singapore)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install && npx prisma generate && npm run build
   Start Command: npx prisma migrate deploy && npm run start:prod
   Plan: Free (or Starter $7/month for production)
   ```

4. **Add Environment Variables:**

   Click **"Advanced"** → **"Add Environment Variable"**

   Add each of these (click "+ Add Environment Variable" for each):

   ```bash
   # Required - Database
   DATABASE_URL=<paste-internal-database-url-from-step-2>
   
   # Required - Security
   NODE_ENV=production
   JWT_SECRET=<paste-your-generated-secret-from-prerequisites>
   
   # Required - OpenAI
   OPENAI_API_KEY=sk-your-openai-api-key-here
   LLM_PROVIDER=openai
   
   # Required - CORS (we'll update this after Vercel deployment)
   FRONTEND_URL=http://localhost:3000
   
   # Auto Features (Recommended)
   AUTO_EMAIL_SYNC_ENABLED=true
   AUTO_SEND_QUOTATION=true
   BACKEND_RFQ_PIPELINE_ENABLED=true
   BACKEND_RFQ_PIPELINE_INTERVAL_MS=20000
   
   # Optional - Gmail Integration (if you have OAuth credentials)
   GMAIL_CLIENT_ID=your-gmail-client-id
   GMAIL_CLIENT_SECRET=your-gmail-client-secret
   GMAIL_REDIRECT_URI=https://quotebot-backend.onrender.com/api/email-integrations/oauth/callback
   ```

   **Important Notes:**
   - Replace `<paste-internal-database-url-from-step-2>` with actual URL
   - Replace `<paste-your-generated-secret>` with JWT secret you generated
   - Replace `sk-your-openai-api-key-here` with your actual OpenAI key
   - We'll update `FRONTEND_URL` after deploying frontend

5. Click **"Create Web Service"**

6. **Wait for Build** (~3-5 minutes)
   - You'll see build logs in real-time
   - Wait for "Build successful" and "Live" status

7. **Copy Backend URL:**
   - Once deployed, you'll see a URL like:
     `https://quotebot-backend.onrender.com`
   - **Copy this URL** - you'll need it for Vercel

**✅ Backend is now live!**

### Step 4: Verify Backend is Running

Visit: `https://quotebot-backend.onrender.com/health`

You should see:
```json
{
  "status": "ok",
  "timestamp": "2026-05-17T10:53:36.000Z",
  "version": "1.0.0"
}
```

**✅ Backend health check passed!**

---

## PART 3: Deploy Frontend to Vercel (3 min)

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **"Start Deploying"**
3. Sign up with **GitHub** (easiest)
4. Authorize Vercel to access your repositories

### Step 2: Import Project

1. In Vercel Dashboard, click **"Add New..."** → **"Project"**

2. **Import Git Repository:**
   - Find your **quotebot** repository in the list
   - Click **"Import"**

3. **Configure Project:**
   ```
   Project Name: quotebot
   Framework Preset: Create React App
   Root Directory: frontend
   Build Command: npm run build (auto-detected)
   Output Directory: build (auto-detected)
   Install Command: npm install (auto-detected)
   ```

4. **Add Environment Variable:**

   Click **"Environment Variables"**
   
   Add this variable:
   ```bash
   Name: REACT_APP_API_URL
   Value: https://quotebot-backend.onrender.com/api
   ```
   
   (Use the backend URL you copied from Render, add `/api` at the end)

5. Click **"Deploy"**

6. **Wait for Deployment** (~2 minutes)
   - Vercel will build and deploy automatically
   - You'll see build progress

7. **Copy Frontend URL:**
   - Once deployed, you'll see a URL like:
     `https://quotebot-xxxx.vercel.app`
   - Click **"Visit"** to open your app
   - **Copy this URL** - you need to update backend CORS

**✅ Frontend is now live!**

---

## PART 4: Update Backend CORS Settings (1 min)

Now we need to tell the backend to allow requests from your Vercel frontend.

### Step 1: Update Render Environment Variable

1. Go back to **Render Dashboard**
2. Click on your **quotebot-backend** service
3. Click **"Environment"** in left sidebar
4. Find the **FRONTEND_URL** variable
5. Click **"Edit"** (pencil icon)
6. Change from `http://localhost:3000` to your Vercel URL:
   ```
   https://quotebot-xxxx.vercel.app
   ```
   (Use your actual Vercel URL, no trailing slash)

7. Click **"Save Changes"**

8. Render will **automatically redeploy** your backend (~1 minute)
   - Wait for "Live" status again

**✅ CORS configured!**

---

## PART 5: Update Gmail Redirect URI (if using Gmail)

If you configured Gmail OAuth, update the redirect URI:

### Step 1: Update Render Environment

1. In Render backend environment variables
2. Find **GMAIL_REDIRECT_URI**
3. Update to:
   ```
   https://quotebot-backend.onrender.com/api/email-integrations/oauth/callback
   ```
   (Use your actual Render backend URL)

### Step 2: Update Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID**
5. Under **Authorized redirect URIs**, add:
   ```
   https://quotebot-backend.onrender.com/api/email-integrations/oauth/callback
   ```
6. Click **"Save"**

**✅ Gmail OAuth configured!**

---

## 🎉 DEPLOYMENT COMPLETE!

Your Quotebot is now live!

### Your URLs:

- **Frontend**: `https://quotebot-xxxx.vercel.app`
- **Backend**: `https://quotebot-backend.onrender.com`
- **API Health**: `https://quotebot-backend.onrender.com/health`

### Default Login:

- **Email**: admin@quotebot.com
- **Password**: admin123

**🚨 IMPORTANT: Change the admin password after first login!**

---

## ✅ Post-Deployment Checklist

- [ ] Frontend loads successfully
- [ ] Backend health check returns OK
- [ ] Can log in with admin credentials
- [ ] **Change admin password immediately**
- [ ] Products are visible (iPhone, MacBook, iPad, Samsung)
- [ ] Can create RFQs manually
- [ ] Can create quotations
- [ ] Email templates are accessible
- [ ] (If configured) Gmail integration works

---

## 🔧 Optional: Custom Domain

### For Frontend (Vercel)

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `app.yourcompany.com`)
3. Add DNS records as shown by Vercel
4. Wait for DNS propagation (~5 minutes)
5. **Update Render FRONTEND_URL** to your custom domain

### For Backend (Render)

1. Upgrade to Starter plan ($7/month) - required for custom domains
2. Go to Settings → Custom Domain
3. Add your domain (e.g., `api.yourcompany.com`)
4. Add DNS records as shown
5. **Update Vercel REACT_APP_API_URL** to your custom backend domain

---

## 🔄 Auto-Deploy Setup

Both platforms are now configured for auto-deploy!

### Trigger Deployment:

```bash
# Make changes to your code
git add .
git commit -m "Update: your changes"
git push origin main

# Render and Vercel will automatically deploy!
```

**Render**: Deploys backend automatically (~3-5 min)
**Vercel**: Deploys frontend automatically (~2 min)

---

## 📊 Monitoring & Logs

### View Render Logs:
1. Go to Render Dashboard
2. Click your **quotebot-backend** service
3. Click **"Logs"** tab
4. View real-time logs

### View Vercel Logs:
1. Go to Vercel Dashboard  
2. Click your **quotebot** project
3. Click **"Deployments"**
4. Click on a deployment → **"View Function Logs"**

---

## 🆘 Troubleshooting

### Frontend shows "Network Error" or "Cannot connect to API"

**Solution:**
1. Check REACT_APP_API_URL in Vercel environment variables
2. Verify backend is running: visit `https://your-backend.onrender.com/health`
3. Check FRONTEND_URL in Render matches your Vercel URL exactly

### Backend shows "Database connection failed"

**Solution:**
1. Verify DATABASE_URL in Render environment variables
2. Check database is running in Render
3. Ensure DATABASE_URL is the **Internal** URL, not External

### "Cannot read properties of undefined"

**Solution:**
1. Clear browser cache
2. Redeploy frontend on Vercel
3. Check all environment variables are set

### Migrations failed

**Solution:**
Render auto-runs migrations. Check logs:
1. Render Dashboard → Logs
2. Look for migration errors
3. Database should auto-migrate on deploy

### Free tier limitations

**Render Free Tier:**
- Spins down after 15 minutes of inactivity
- First request after idle takes ~30 seconds (cold start)
- 750 hours/month free

**Upgrade to Starter ($7/month) for:**
- Always-on service (no cold starts)
- Custom domains
- Better performance

**Vercel Free Tier:**
- Unlimited bandwidth
- Automatic HTTPS
- Global CDN
- Perfect for frontend

---

## 💰 Cost Summary

### Free Tier (Good for Development/Testing)
- Render Backend: Free (with cold starts)
- Render Database: Free (1 GB storage)
- Vercel Frontend: Free (unlimited)
- **Total: $0/month**

### Production Tier (Recommended)
- Render Backend Starter: $7/month
- Render Database Starter: $7/month  
- Vercel Pro (optional): $20/month
- **Total: $14-34/month**

---

## 🎯 Next Steps

1. **Login and Change Password**
   - Visit your Vercel URL
   - Login with admin@quotebot.com / admin123
   - Go to Settings → Users → Change Password

2. **Configure Email Templates**
   - Settings → Email Templates
   - Customize quotation and invoice templates

3. **Connect Gmail** (if using email features)
   - Settings → Email → Connect Gmail
   - Authorize access

4. **Add More Products**
   - Products page → Add your products
   - Or use bulk import

5. **Test the Flow**
   - Send test RFQ email
   - Wait for auto-processing
   - Verify quotation is created and sent

---

## 📞 Support

**Having issues?**

1. Check logs in Render/Vercel dashboards
2. Verify all environment variables are set
3. Test backend health endpoint
4. Clear browser cache and retry

**Platform Support:**
- Render: [render.com/docs](https://render.com/docs)
- Vercel: [vercel.com/docs](https://vercel.com/docs)

---

## ✨ Success!

Your Quotebot is now:
- ✅ Hosted on professional cloud infrastructure
- ✅ Auto-syncing emails every 10 seconds
- ✅ Auto-processing RFQs with AI
- ✅ Auto-creating and sending quotations
- ✅ Secured with HTTPS/SSL
- ✅ Auto-deploying on Git push

**Welcome to production! 🚀**

---

*Last Updated: May 17, 2026*
