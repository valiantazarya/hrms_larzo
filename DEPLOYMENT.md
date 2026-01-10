# HRMS Deployment Guide

## Overview

This guide covers the best and cheapest deployment options for the HRMS application.

**Stack:**
- Backend: NestJS (Node.js 20+)
- Frontend: React + Vite (static build)
- Database: SQL Server
- Storage: MinIO (S3-compatible)

---

## 🏆 Recommended: VPS Self-Hosted (Cheapest Long-term)

### Option 1: DigitalOcean Droplet ($6-12/month)

**Best for:** Production use, full control, lowest long-term cost

**Setup:**
1. **Create Droplet:**
   - Size: 2GB RAM / 1 vCPU ($12/month) or 1GB RAM ($6/month for small traffic)
   - OS: Ubuntu 22.04 LTS
   - Region: Choose closest to your users (Singapore for Indonesia)

2. **Install Dependencies:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install Nginx (for reverse proxy)
sudo apt install nginx
```

3. **Deploy Application:**
```bash
# Clone your repository
git clone <your-repo-url>
cd human_resources

# Setup backend
cd backend
npm install --production
cp .env.example .env
# Edit .env with production values
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed

# Build backend
npm run build

# Setup frontend
cd ../frontend
npm install
npm run build
# Build output in dist/ folder

# Start services with Docker Compose
cd ..
docker compose up -d
```

4. **Configure Nginx:**
```nginx
# /etc/nginx/sites-available/hrms
server {
    listen 80;
    server_name azarya.space www.azarya.space;

    # Let's Encrypt ACME challenge - MUST come before other location blocks
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    # Security headers (but not for ACME challenge)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend API - match /api/v1 prefix (must come before root location)
    location /api/v1 {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend (static files) - must come last
    location / {
        root /home/ubuntu/hrms_larzo/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

7. **Setup PM2 (Process Manager):**
```bash
npm install -g pm2
cd backend
pm2 start dist/main.js --name hrms-backend
pm2 startup
pm2 save
```

8. **Setup SSL (Free with Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx

# Get certificate for both www and non-www domains
sudo certbot --nginx -d azarya.space -d www.azarya.space

# Certbot will automatically:
# - Update nginx config for HTTPS
# - Set up redirect from HTTP to HTTPS
# - Configure auto-renewal
```

**Cost:** $6-12/month + domain ($10-15/year)
**Total:** ~$8-13/month

**Alternatives:**
- **Vultr:** Similar pricing, $6/month for 1GB RAM
- **Linode:** $5/month for 1GB RAM (now Akamai)
- **Hetzner:** €4.15/month (cheapest, but EU-based)

---

## 🚀 Option 2: Railway (Easiest, Free Trial)

**Best for:** Quick deployment, minimal setup, managed services

**Pricing:**
- Free: $5 credit/month (enough for small apps)
- Paid: $5/month + usage

**Setup:**
1. Sign up at [railway.app](https://railway.app)
2. Create new project
3. Add services:
   - **PostgreSQL** (managed database)
   - **Backend** (connect GitHub repo, auto-deploy)
   - **Frontend** (static site)

**Railway automatically:**
- Detects Node.js projects
- Runs build commands
- Handles environment variables
- Provides HTTPS

**Configuration:**
- Backend: Set build command: `npm install && npm run build`
- Backend: Set start command: `npm run start:prod`
- Frontend: Set build command: `npm install && npm run build`
- Frontend: Set output directory: `dist`

**Note:** Railway uses PostgreSQL by default. You'll need to:
- Switch to SQL Server or use PostgreSQL (requires Prisma schema update)
- Or use Railway's SQL Server addon (if available)

**Cost:** Free tier available, then ~$5-10/month

---

## ☁️ Option 3: Render (Free Tier Available)

**Best for:** Free tier testing, managed services

**Pricing:**
- Free tier: 750 hours/month (enough for 1 service)
- Paid: $7/month per service

**Setup:**
1. Sign up at [render.com](https://render.com)
2. Create:
   - **PostgreSQL Database** (free tier available)
   - **Web Service** (backend)
   - **Static Site** (frontend)

**Configuration:**
- Backend: Connect GitHub, auto-deploy on push
- Frontend: Build command: `npm run build`, publish directory: `dist`

**Limitations:**
- Free tier services spin down after 15 min inactivity
- PostgreSQL free tier: 90 days, then $7/month

**Cost:** Free for testing, ~$14/month for production (backend + database)

---

## 🎯 Option 4: Fly.io (Free Tier + Pay-as-you-go)

**Best for:** Global edge deployment, Docker-based

**Pricing:**
- Free: 3 shared VMs, 3GB persistent volumes
- Paid: $1.94/month per 256MB RAM

**Setup:**
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Create `fly.toml` for backend
3. Deploy: `fly deploy`

**Best for:** Docker-based deployments, global edge network

**Cost:** Free tier available, ~$5-10/month for production

---

## 💰 Cost Comparison

| Option | Monthly Cost | Setup Difficulty | Best For |
|--------|-------------|------------------|-----------|
| **VPS (DigitalOcean)** | $6-12 | Medium | Production, long-term |
| **Railway** | $0-10 | Easy | Quick deployment |
| **Render** | $0-14 | Easy | Free tier testing |
| **Fly.io** | $0-10 | Medium | Global edge |
| **Vercel (Frontend) + Railway (Backend)** | $0-10 | Easy | Split deployment |

---

## 🎨 Recommended: Hybrid Approach (Cheapest)

### Frontend: Vercel/Netlify (Free)
- Deploy React build to Vercel (free tier)
- Automatic HTTPS, CDN, zero config
- Connect GitHub for auto-deploy

### Backend: Railway/Render (Free tier or $5/month)
- Managed Node.js hosting
- Auto-scaling, HTTPS included

### Database: Managed SQL Server
- Azure SQL Database (pay-as-you-go, ~$5/month)
- Or use PostgreSQL on Railway/Render (free tier)

**Total Cost:** $0-5/month

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Update environment variables for production
- [ ] Set strong JWT secrets
- [ ] Configure CORS for production domain
- [ ] Update `VITE_API_URL` in frontend
- [ ] Test database migrations
- [ ] Backup strategy

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL="sqlserver://..."
JWT_SECRET="<strong-random-secret>"
JWT_REFRESH_SECRET="<strong-random-secret>"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@your-domain.com
APP_NAME=HRMS
```

**Frontend (.env.production):**
```env
# Use HTTPS and same domain (or specify full API URL)
VITE_API_URL=https://azarya.space/api/v1
# Or if using subdomain:
# VITE_API_URL=https://api.azarya.space/api/v1
```

**Note:** If `VITE_API_URL` is not set, the frontend will automatically use the same protocol and domain as the current page (HTTPS in production).

### Production Build Commands

**Backend:**
```bash
npm install --production
npm run build
npm run prisma:generate
npm run prisma:migrate:deploy
```

**Frontend:**
```bash
npm install
npm run build
# Output: dist/ folder
```

### Security Checklist

- [ ] Use HTTPS (Let's Encrypt free SSL)
- [ ] Strong database passwords
- [ ] Secure JWT secrets (32+ characters)
- [ ] Enable CORS only for your domain
- [ ] Regular security updates
- [ ] Database backups
- [ ] Environment variables secured (not in git)

---

## 🐳 Docker Production Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - sqlserver
      - minio
    restart: unless-stopped

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: ${DB_PASSWORD}
    volumes:
      - sqlserver_data:/var/opt/mssql
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9003"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  sqlserver_data:
  minio_data:
```

---

## 🚨 Important Notes

1. **Database:** Your app uses SQL Server. Most cloud providers offer PostgreSQL. Consider:
   - Migrating to PostgreSQL (easier, cheaper)
   - Using Azure SQL (native SQL Server, more expensive)
   - Using managed SQL Server on AWS/Azure

2. **MinIO:** Can be replaced with:
   - AWS S3 (pay-as-you-go, ~$0.023/GB)
   - Cloudflare R2 (S3-compatible, free 10GB)
   - DigitalOcean Spaces ($5/month for 250GB)

3. **Monitoring:** Set up:
   - Uptime monitoring (UptimeRobot - free)
   - Error tracking (Sentry - free tier)
   - Logs (PM2 logs or cloud logging)

---

## 🎯 Quick Start: VPS Deployment Script

Save as `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting HRMS Deployment..."

# Install dependencies
sudo apt update
sudo apt install -y nodejs npm docker.io docker-compose nginx

# Clone and setup
git clone <your-repo> /opt/hrms
cd /opt/hrms

# Backend
cd backend
npm install --production
npm run build
npx prisma generate
npx prisma migrate deploy

# Frontend
cd ../frontend
npm install
npm run build

# Start services
cd ..
docker compose -f docker-compose.prod.yml up -d

# Setup PM2
npm install -g pm2
pm2 start backend/dist/main.js --name hrms-backend
pm2 startup
pm2 save

echo "✅ Deployment complete!"
```

---

## 📞 Support

For deployment issues, check:
- [DigitalOcean Community](https://www.digitalocean.com/community)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)

---

**Recommended for Indonesia:** DigitalOcean Singapore region ($6-12/month) or Railway ($5-10/month)
