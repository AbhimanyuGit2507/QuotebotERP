# 🚀 Quotebot Quick Start Guide

Get Quotebot deployed in under 10 minutes!

---

## ⚡ Fastest Method: Railway + Vercel (Recommended)

**Total Time: ~5 minutes**

### Prerequisites
- GitHub account
- OpenAI API key (for RFQ processing)
- Gmail OAuth credentials (optional, for email integration)

### Step 1: Push to GitHub (1 min)

```bash
cd /home/avi/Projects/Quotebot
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/quotebot.git
git push -u origin main
```

### Step 2: Deploy Backend to Railway (2 min)

1. Go to **[railway.app](https://railway.app)** and sign up
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your Quotebot repository
4. Click **"Add variables"** and add:
   ```
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   OPENAI_API_KEY=sk-your-openai-api-key
   LLM_PROVIDER=openai
   AUTO_EMAIL_SYNC_ENABLED=true
   AUTO_SEND_QUOTATION=true
   ```
5. Click **"New"** → **"Database"** → **"PostgreSQL"**
6. Railway will auto-link the database

**✅ Backend is now live at: `https://yourapp.up.railway.app`**

### Step 3: Deploy Frontend to Vercel (2 min)

1. Go to **[vercel.com](https://vercel.com)** and sign up
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Create React App
   - Add environment variable:
     ```
     REACT_APP_API_URL=https://yourapp.up.railway.app/api
     ```
5. Click **"Deploy"**

**✅ Frontend is now live at: `https://yourapp.vercel.app`**

### Step 4: Update Backend CORS (30 sec)

1. Go back to Railway
2. Add environment variable:
   ```
   FRONTEND_URL=https://yourapp.vercel.app
   ```
3. Redeploy

**🎉 Done! Your app is live!**

Visit `https://yourapp.vercel.app` and log in with:
- **Email**: admin@quotebot.com
- **Password**: admin123

---

## 🐳 Local Testing with Docker

**Total Time: ~3 minutes**

### Prerequisites
- Docker and Docker Compose installed

### Step 1: Configure Environment

```bash
cd /home/avi/Projects/Quotebot
cp .env.production.example .env
```

Edit `.env` and add your API keys:
```bash
JWT_SECRET=your-local-secret-key
OPENAI_API_KEY=sk-your-openai-key
```

### Step 2: Deploy Locally

```bash
./deploy.sh
```

Select option **1** (Deploy with Docker)

**✅ App running at:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

## 🔑 Getting API Keys

### OpenAI API Key (Required for RFQ Processing)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up / Log in
3. Go to **API Keys** → **Create new secret key**
4. Copy the key (starts with `sk-`)

### Gmail OAuth (Optional - for Email Integration)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable **Gmail API**
4. Create **OAuth 2.0 Client ID**
5. Add authorized redirect URI:
   ```
   https://your-backend.up.railway.app/api/email-integrations/oauth/callback
   ```
6. Copy Client ID and Client Secret

---

## 📋 Post-Deployment Checklist

- [ ] App is accessible via browser
- [ ] Can log in with admin credentials
- [ ] Products are showing (iPhone, MacBook, etc.)
- [ ] Can create RFQs manually
- [ ] Email integration works (if configured)
- [ ] Automatic RFQ processing enabled
- [ ] SSL/HTTPS is working
- [ ] Changed default admin password

---

## 🆘 Troubleshooting

### Backend won't start
- Check DATABASE_URL is set correctly
- Verify JWT_SECRET is at least 32 characters
- Check logs in Railway/Render dashboard

### Frontend can't connect to backend
- Verify REACT_APP_API_URL is correct
- Check CORS settings (FRONTEND_URL on backend)
- Ensure backend is running and healthy

### Database migration errors
- Railway/Render auto-runs migrations
- For Docker: `docker-compose exec backend npx prisma migrate deploy`

### Email sync not working
- Verify GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are set
- Check redirect URI matches exactly
- Ensure AUTO_EMAIL_SYNC_ENABLED=true

---

## 📚 Next Steps

1. **Change Admin Password**
   - Log in → Settings → Users & Roles
   
2. **Configure Email Templates**
   - Settings → Email Templates
   - Customize quotation and invoice emails

3. **Add Your Products**
   - Products page → Add products
   - Or use bulk import

4. **Connect Gmail**
   - Settings → Email → Connect Gmail
   - Authorize access

5. **Test Email-to-RFQ Flow**
   - Send test RFQ email to connected Gmail
   - Wait ~10 seconds for sync
   - Check RFQ Management page

---

## 💡 Tips

- **Free Hosting Limits**:
  - Railway: $5/month credit (enough for small-medium usage)
  - Vercel: Unlimited for personal projects
  - Render: 750 hours/month free

- **Production Recommendations**:
  - Use paid Railway plan for production ($5-20/month)
  - Set up database backups
  - Enable monitoring
  - Use custom domain

- **Cost Estimate**:
  - Small Business: ~$10-20/month
  - Medium Business: ~$30-50/month
  - Large Enterprise: Custom pricing

---

## 📞 Support

Need help? Check:
1. **DEPLOYMENT.md** - Detailed deployment guide
2. **Logs** - Railway/Vercel dashboard
3. **Health Check** - https://your-backend.up.railway.app/health

---

**Happy Deploying! 🚀**
