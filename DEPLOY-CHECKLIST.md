# 🚀 Fast Deployment Checklist

Use this checklist to deploy in under 10 minutes.

## ☐ Step 1: Push Code to GitHub (1 min)

```bash
cd /home/avi/Projects/Quotebot
git push -u origin main
```

**Verify:** Check https://github.com/AbhimanyuGit2507/QuotebotERP - latest commit should appear

---

## ☐ Step 2: Vercel Frontend (2 mins)

### If connected to GitHub:
- [ ] Vercel auto-deploys when you push to GitHub
- [ ] Go to https://vercel.com/dashboard
- [ ] Wait for deployment to complete
- [ ] Note: You'll update VITE_API_URL after backend is deployed

### If not auto-deploying:
- [ ] Go to Vercel Dashboard → quotebot-sigma
- [ ] Settings → Git → Connect to `AbhimanyuGit2507/QuotebotERP`
- [ ] Deployments → Redeploy

---

## ☐ Step 3: Render Backend (5 mins)

### 3a. Create Database
- [ ] Go to https://render.com → New → PostgreSQL
- [ ] Name: `quotebot-db`
- [ ] Plan: Free (or Starter $7/month)
- [ ] Create Database
- [ ] **COPY Internal Database URL** (save it!)

### 3b. Create Web Service
- [ ] New → Web Service
- [ ] Connect GitHub: `AbhimanyuGit2507/QuotebotERP`
- [ ] Configure:
  - Name: `quotebot-backend`
  - Root Directory: `backend`
  - Build Command: `npm install && npx prisma generate && npm run build`
  - Start Command: `npx prisma migrate deploy && npm run start:prod`
  - Plan: Free (or Starter $7/month)

### 3c. Add Environment Variables
- [ ] Click Environment → Add Environment Variable
- [ ] Copy-paste these (update DATABASE_URL with your actual URL):

```bash
DATABASE_URL=postgresql://user:pass@host.internal:5432/quotebot
JWT_SECRET=change-this-super-secret-key-in-production-xyz123
INTERNAL_API_KEY=quotebot-internal-2024-secure-key
FRONTEND_URL=https://quotebot-sigma.vercel.app
AUTO_EMAIL_SYNC_ENABLED=false
AUTO_SEND_QUOTATION=false
BACKEND_RFQ_PIPELINE_ENABLED=false
```

- [ ] Save Changes
- [ ] Wait for deployment (~5 mins)
- [ ] **COPY Backend URL** (e.g., `https://quotebot-backend.onrender.com`)

---

## ☐ Step 4: Link Frontend & Backend (2 mins)

### 4a. Update Vercel
- [ ] Vercel Dashboard → quotebot-sigma → Settings → Environment Variables
- [ ] Add/Update:
  ```
  VITE_API_URL=https://quotebot-backend.onrender.com
  ```
- [ ] Save
- [ ] Deployments → Redeploy

### 4b. Update Render
- [ ] Render Dashboard → quotebot-backend → Environment
- [ ] Verify FRONTEND_URL is correct:
  ```
  FRONTEND_URL=https://quotebot-sigma.vercel.app
  ```
- [ ] Save (will auto-redeploy)

---

## ☐ Step 5: Test (1 min)

### Test Backend
```bash
curl https://quotebot-backend.onrender.com/
# Should return: {"status":"ok"}
```

### Test Frontend
- [ ] Open: https://quotebot-sigma.vercel.app/
- [ ] Login: `admin@quotebot.com` / `admin123`
- [ ] Dashboard should load
- [ ] ✅ **DEPLOYMENT COMPLETE!**

---

## 📋 URLs to Save

After deployment, save these:

```
Frontend: https://quotebot-sigma.vercel.app
Backend: https://quotebot-backend.onrender.com
Database: <internal-url-from-render>
GitHub: https://github.com/AbhimanyuGit2507/QuotebotERP
```

---

## ⚠️ Important Notes

1. **Free tier limitations:**
   - Render backend sleeps after 15min idle (~30s cold start)
   - PostgreSQL free tier expires after 90 days
   - Upgrade to Starter ($7/month each) for production

2. **Gmail features disabled by default:**
   - Email sync won't work until you set up OAuth
   - Follow FAST-DEPLOY.md Step 6 to enable later

3. **Security:**
   - Change admin password immediately after first login
   - Update JWT_SECRET and INTERNAL_API_KEY for production

---

## 🆘 Quick Troubleshooting

**Backend deployment failed?**
- Check Render logs (Dashboard → Logs)
- Verify DATABASE_URL format is correct
- Ensure all env vars are set

**Frontend can't connect?**
- Check browser console for errors
- Verify VITE_API_URL matches backend URL
- Check CORS (FRONTEND_URL on backend)

**Need help?**
- See FAST-DEPLOY.md for detailed steps
- Check Render/Vercel logs
- Create issue on GitHub
