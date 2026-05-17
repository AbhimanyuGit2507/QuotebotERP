# Quotebot Deployment Guide

Complete guide to deploy Quotebot to production hosting services.

---

## 🚀 Option 1: Railway (Recommended - Easiest)

Railway offers the simplest deployment with PostgreSQL included.

### Step 1: Setup Railway Project

1. **Sign up at [Railway.app](https://railway.app)**
   - Use GitHub to sign up

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your repo
   - Select the Quotebot repository

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will create a database and provide connection URL

### Step 3: Deploy Backend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your Quotebot repo
3. Configure settings:
   - **Root Directory**: `/backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`
   - **Watch Paths**: `/backend/**`

4. **Add Environment Variables**:
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-linked
   JWT_SECRET=generate-random-secret-here
   FRONTEND_URL=https://your-frontend-url.vercel.app
   OPENAI_API_KEY=sk-your-key
   LLM_PROVIDER=openai
   AUTO_EMAIL_SYNC_ENABLED=true
   AUTO_SEND_QUOTATION=true
   GMAIL_CLIENT_ID=your-gmail-id
   GMAIL_CLIENT_SECRET=your-gmail-secret
   GMAIL_REDIRECT_URI=https://your-backend.up.railway.app/api/email-integrations/oauth/callback
   ```

5. Railway will auto-deploy and provide a URL like:
   `https://quotebot-backend-production.up.railway.app`

### Step 4: Deploy Frontend (Vercel)

1. **Sign up at [Vercel.com](https://vercel.com)**
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. **Environment Variables**:
   ```bash
   REACT_APP_API_URL=https://your-backend.up.railway.app/api
   ```

6. Click **"Deploy"**

### Step 5: Update CORS Settings

In your backend `.env` on Railway, update:
```bash
FRONTEND_URL=https://your-app.vercel.app
```

Redeploy backend for changes to take effect.

---

## 🚀 Option 2: Render (All-in-One)

Render provides free hosting with PostgreSQL included.

### Step 1: Create Render Account

1. Sign up at [Render.com](https://render.com)
2. Connect your GitHub account

### Step 2: Create PostgreSQL Database

1. Click **"New"** → **"PostgreSQL"**
2. Configure:
   - **Name**: quotebot-db
   - **Database**: quotebot_db
   - **User**: postgres
   - **Region**: Choose closest to your users
   - **Plan**: Free (or Starter for production)

3. After creation, copy the **Internal Database URL**

### Step 3: Deploy Backend

1. Click **"New"** → **"Web Service"**
2. Connect your GitHub repo
3. Configure:
   - **Name**: quotebot-backend
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`
   - **Plan**: Free (or Starter)

4. **Environment Variables**:
   ```bash
   DATABASE_URL=<paste-internal-database-url>
   NODE_ENV=production
   JWT_SECRET=your-secret-key
   FRONTEND_URL=https://your-app.onrender.com
   OPENAI_API_KEY=sk-your-key
   LLM_PROVIDER=openai
   AUTO_EMAIL_SYNC_ENABLED=true
   AUTO_SEND_QUOTATION=true
   ```

5. Click **"Create Web Service"**

### Step 4: Deploy Frontend

1. Click **"New"** → **"Static Site"**
2. Connect repository
3. Configure:
   - **Name**: quotebot-frontend
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

4. **Environment Variables**:
   ```bash
   REACT_APP_API_URL=https://quotebot-backend.onrender.com/api
   ```

5. Click **"Create Static Site"**

---

## 🚀 Option 3: Docker Deployment (DigitalOcean/AWS/Any VPS)

For more control, deploy using Docker on a VPS.

### Step 1: Setup Server

1. Create a Droplet/EC2 instance (Ubuntu 22.04)
2. SSH into your server:
   ```bash
   ssh root@your-server-ip
   ```

### Step 2: Install Docker

```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y
```

### Step 3: Clone Repository

```bash
git clone https://github.com/your-username/quotebot.git
cd quotebot
```

### Step 4: Configure Environment

```bash
# Copy example env file
cp .env.production.example .env

# Edit with your values
nano .env
```

Add your configuration:
```bash
DB_USER=postgres
DB_PASSWORD=secure-password-here
DB_NAME=quotebot_db
JWT_SECRET=your-jwt-secret
FRONTEND_URL=https://your-domain.com
REACT_APP_API_URL=https://your-domain.com/api
OPENAI_API_KEY=sk-your-key
LLM_PROVIDER=openai
AUTO_EMAIL_SYNC_ENABLED=true
AUTO_SEND_QUOTATION=true
```

### Step 5: Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Check status
docker-compose ps
```

Your app will be running on:
- Frontend: `http://your-server-ip:3000`
- Backend: `http://your-server-ip:3001`

### Step 6: Setup Nginx Reverse Proxy (Optional)

Install Nginx:
```bash
apt install nginx -y
```

Create config:
```bash
nano /etc/nginx/sites-available/quotebot
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/quotebot /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 7: Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

---

## 📊 Comparison Table

| Feature | Railway | Render | Docker VPS |
|---------|---------|--------|-----------|
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Free Tier** | $5/month credit | Yes | No (VPS cost) |
| **PostgreSQL** | Included | Included | Self-managed |
| **Auto-Deploy** | Yes | Yes | Manual |
| **Scalability** | Excellent | Good | Full control |
| **Best For** | Quick start | Production | Full control |

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change default JWT_SECRET to a secure random string
- [ ] Use strong database passwords
- [ ] Enable SSL/HTTPS
- [ ] Set up environment variables (never commit secrets to Git)
- [ ] Configure CORS properly (FRONTEND_URL)
- [ ] Review and set proper Gmail OAuth redirect URIs
- [ ] Enable database backups
- [ ] Set up monitoring and logging
- [ ] Review user permissions and roles

---

## 🛠️ Post-Deployment

### Initialize Database

Run migrations:
```bash
# Railway/Render: Auto-runs on deploy
# Docker: Already configured in docker-compose

# Manual migration if needed:
npx prisma migrate deploy
```

### Create Admin User

```bash
# Access your backend container/service
# Run the seed script
npm run db:seed
```

### Test Email Integration

1. Go to Settings → Email in your deployed app
2. Connect Gmail account
3. Test sending a quotation

---

## 📞 Support

If you encounter issues:

1. Check logs:
   - **Railway**: Project → Deployments → View Logs
   - **Render**: Service → Logs tab
   - **Docker**: `docker-compose logs -f`

2. Verify environment variables are set correctly
3. Check database connection
4. Ensure migrations ran successfully

---

## 🚀 Quick Start (Railway - Fastest)

**1 Minute Setup:**

1. Push code to GitHub
2. Go to Railway.app → New Project → Deploy from GitHub
3. Add PostgreSQL to project
4. Add environment variables from `.env.production.example`
5. Deploy! 🎉

Your app will be live in minutes!
