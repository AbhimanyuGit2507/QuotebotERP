# ✅ Deployment Checklist: Vercel + Render

Use this checklist while deploying. Check off each step as you complete it.

---

## 🎯 PRE-DEPLOYMENT

- [ ] OpenAI API key ready (from platform.openai.com)
- [ ] JWT secret generated: `openssl rand -base64 48`
- [ ] Gmail OAuth credentials (optional - if using email features)
- [ ] GitHub account created
- [ ] Render account created (render.com)
- [ ] Vercel account created (vercel.com)

---

## 📦 PART 1: PUSH TO GITHUB

- [ ] Navigate to project: `cd /home/avi/Projects/Quotebot`
- [ ] Initialize git: `git init`
- [ ] Add files: `git add .`
- [ ] Commit: `git commit -m "Initial commit"`
- [ ] Set main branch: `git branch -M main`
- [ ] Create GitHub repo at github.com/new
- [ ] Add remote: `git remote add origin https://github.com/YOUR-USERNAME/quotebot.git`
- [ ] Push: `git push -u origin main`
- [ ] Verify code is on GitHub

---

## 🗄️ PART 2: RENDER DATABASE

- [ ] Login to render.com with GitHub
- [ ] Click "New +" → "PostgreSQL"
- [ ] Name: `quotebot-db`
- [ ] Database: `quotebot_db`  
- [ ] User: `postgres`
- [ ] Region: (choose closest)
- [ ] Plan: Free
- [ ] Click "Create Database"
- [ ] Wait for provisioning (~2 min)
- [ ] **Copy Internal Database URL** (keep tab open)

---

## 🔧 PART 3: RENDER BACKEND

- [ ] Click "New +" → "Web Service"
- [ ] Connect quotebot repository
- [ ] Configure:
  - [ ] Name: `quotebot-backend`
  - [ ] Region: (same as database)
  - [ ] Branch: `main`
  - [ ] Root Directory: `backend`
  - [ ] Runtime: `Node`
  - [ ] Build Command: `npm install && npx prisma generate && npm run build`
  - [ ] Start Command: `npx prisma migrate deploy && npm run start:prod`
  - [ ] Plan: Free

- [ ] Add Environment Variables:
  - [ ] `DATABASE_URL` = (paste Internal Database URL)
  - [ ] `NODE_ENV` = `production`
  - [ ] `JWT_SECRET` = (paste generated secret)
  - [ ] `OPENAI_API_KEY` = `sk-your-key`
  - [ ] `LLM_PROVIDER` = `openai`
  - [ ] `FRONTEND_URL` = `http://localhost:3000` (temporary)
  - [ ] `AUTO_EMAIL_SYNC_ENABLED` = `true`
  - [ ] `AUTO_SEND_QUOTATION` = `true`
  - [ ] `BACKEND_RFQ_PIPELINE_ENABLED` = `true`
  - [ ] (Optional) `GMAIL_CLIENT_ID` = your-id
  - [ ] (Optional) `GMAIL_CLIENT_SECRET` = your-secret
  - [ ] (Optional) `GMAIL_REDIRECT_URI` = `https://quotebot-backend.onrender.com/api/email-integrations/oauth/callback`

- [ ] Click "Create Web Service"
- [ ] Wait for build (~3-5 min)
- [ ] Check "Live" status
- [ ] **Copy backend URL** (e.g., `https://quotebot-backend.onrender.com`)
- [ ] Test health: Visit `https://your-backend.onrender.com/health`
- [ ] Verify health check returns OK

---

## 🌐 PART 4: VERCEL FRONTEND

- [ ] Login to vercel.com with GitHub
- [ ] Click "Add New..." → "Project"
- [ ] Import quotebot repository
- [ ] Configure:
  - [ ] Project Name: `quotebot`
  - [ ] Framework Preset: `Create React App`
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `build`

- [ ] Add Environment Variable:
  - [ ] Name: `REACT_APP_API_URL`
  - [ ] Value: `https://quotebot-backend.onrender.com/api` (your backend URL + /api)

- [ ] Click "Deploy"
- [ ] Wait for deployment (~2 min)
- [ ] Check deployment successful
- [ ] **Copy frontend URL** (e.g., `https://quotebot-xxxx.vercel.app`)
- [ ] Visit frontend URL and verify it loads

---

## 🔄 PART 5: UPDATE BACKEND CORS

- [ ] Go to Render Dashboard
- [ ] Click "quotebot-backend" service
- [ ] Click "Environment" tab
- [ ] Find `FRONTEND_URL` variable
- [ ] Click Edit (pencil icon)
- [ ] Change to: `https://quotebot-xxxx.vercel.app` (your Vercel URL)
- [ ] Click "Save Changes"
- [ ] Wait for automatic redeploy (~1 min)
- [ ] Check "Live" status again

---

## 🎉 PART 6: VERIFY DEPLOYMENT

- [ ] Visit frontend URL
- [ ] Login page loads correctly
- [ ] Login with: admin@quotebot.com / admin123
- [ ] Dashboard loads successfully
- [ ] Products page shows items (iPhone, MacBook, iPad, Samsung)
- [ ] Can navigate to RFQ Management
- [ ] Can navigate to Quotations
- [ ] Can access Settings
- [ ] **Change admin password!**

---

## 🔐 PART 7: SECURITY (CRITICAL!)

- [ ] **Change admin password immediately**
- [ ] Go to Settings → Users & Roles
- [ ] Update admin password to something secure
- [ ] Review user permissions
- [ ] Verify JWT_SECRET is strong (32+ characters)
- [ ] Confirm database password is secure

---

## 📧 PART 8: EMAIL INTEGRATION (OPTIONAL)

If using Gmail integration:

- [ ] Go to Settings → Email
- [ ] Click "Connect Gmail"
- [ ] Authorize Gmail access
- [ ] Verify email account connected
- [ ] Test sending a quotation via email
- [ ] Configure email templates if needed

---

## 🧪 PART 9: TEST FUNCTIONALITY

- [ ] Create a manual RFQ
- [ ] Create a quotation from RFQ
- [ ] Send quotation via email (if configured)
- [ ] Check quotation appears in list
- [ ] Test search functionality
- [ ] Test filters
- [ ] Verify real-time updates work
- [ ] Test product inventory tracking

---

## 📊 PART 10: MONITORING SETUP

### Render:
- [ ] Bookmark: Render Dashboard → quotebot-backend
- [ ] Check "Metrics" tab
- [ ] Review "Logs" tab
- [ ] Set up email alerts (optional)

### Vercel:
- [ ] Bookmark: Vercel Dashboard → quotebot
- [ ] Check "Analytics" tab
- [ ] Review deployment logs
- [ ] Set up email notifications (optional)

---

## 🔄 PART 11: AUTO-DEPLOY VERIFICATION

- [ ] Make a small change to README.md locally
- [ ] Commit: `git commit -am "Test auto-deploy"`
- [ ] Push: `git push origin main`
- [ ] Check Render automatically starts deploying
- [ ] Check Vercel automatically starts deploying
- [ ] Verify deployments complete successfully
- [ ] Changes appear on live site

---

## 📝 PART 12: DOCUMENTATION

- [ ] Save backend URL somewhere safe
- [ ] Save frontend URL somewhere safe  
- [ ] Save database credentials
- [ ] Document custom configurations
- [ ] Note any custom environment variables added
- [ ] Create deployment runbook (who has access, etc.)

---

## 🚨 TROUBLESHOOTING

If something doesn't work:

### Frontend won't load:
- [ ] Check Vercel deployment logs
- [ ] Verify `REACT_APP_API_URL` is set correctly
- [ ] Clear browser cache and retry
- [ ] Check Vercel build succeeded

### Can't login / API errors:
- [ ] Verify backend is "Live" on Render
- [ ] Check `FRONTEND_URL` in Render matches Vercel URL
- [ ] Visit backend `/health` endpoint
- [ ] Check Render logs for errors
- [ ] Verify CORS is configured correctly

### Database errors:
- [ ] Verify `DATABASE_URL` is set in Render
- [ ] Check database is running in Render
- [ ] Check database has enough storage
- [ ] Review migration logs in Render

### Email not working:
- [ ] Verify Gmail OAuth credentials are correct
- [ ] Check redirect URI matches exactly
- [ ] Verify `AUTO_EMAIL_SYNC_ENABLED=true`
- [ ] Check Render logs for sync errors

---

## ✅ DEPLOYMENT COMPLETE!

Once all boxes are checked:

**🎉 Your Quotebot is LIVE and PRODUCTION-READY!**

### Final URLs:
- Frontend: `https://quotebot-xxxx.vercel.app`
- Backend: `https://quotebot-backend.onrender.com`
- Health: `https://quotebot-backend.onrender.com/health`

### Next Steps:
1. Share URL with your team
2. Start using the system
3. Monitor usage in Render/Vercel dashboards
4. Plan for upgrade if you exceed free tier

---

## 📞 SUPPORT RESOURCES

- **Detailed Guide**: `DEPLOY-VERCEL-RENDER.md`
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Troubleshooting**: Check logs in dashboards

---

**Congratulations! You've successfully deployed Quotebot! 🚀**

*Deployment Date: _______________*
*Deployed By: _______________*
*Frontend URL: _______________*
*Backend URL: _______________*
