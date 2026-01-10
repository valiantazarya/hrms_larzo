# CI/CD Setup Guide

This guide will help you set up CI/CD for the HRMS application using GitHub Actions.

## Quick Start

1. **Add Required Secrets** (see below)
2. **Push to GitHub** - Workflows will run automatically
3. **Monitor in Actions Tab** - View workflow runs and logs

## Required GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

### For Railway Deployment
- `RAILWAY_TOKEN` - Get from Railway dashboard → Settings → Tokens

### For Render Deployment
- `RENDER_API_KEY` - Get from Render dashboard → Account Settings → API Keys
- `RENDER_BACKEND_SERVICE_ID` - Found in service URL: `render.com/services/{SERVICE_ID}`
- `RENDER_FRONTEND_SERVICE_ID` - Found in service URL

### For VPS Deployment
- `VPS_SSH_PRIVATE_KEY` - Your SSH private key (without passphrase recommended)
- `VPS_HOST` - Your VPS IP or domain (e.g., `123.45.67.89` or `server.example.com`)
- `VPS_USER` - SSH username (usually `root` or `ubuntu`)
- `VPS_URL` - Your app URL for health checks (e.g., `https://hrms.example.com`)

### For Fly.io Deployment
- `FLY_API_TOKEN` - Get from: `flyctl auth token`

### General
- `VITE_API_URL` - Your production API URL (e.g., `https://api.example.com/api/v1`)

## Workflow Overview

### CI Workflows (Run on every push/PR)

1. **Backend CI** (`.github/workflows/ci-backend.yml`)
   - Lints code
   - Runs tests
   - Builds application
   - Uses SQL Server service container

2. **Frontend CI** (`.github/workflows/ci-frontend.yml`)
   - Lints code
   - Type checks
   - Builds application
   - Uploads build artifacts

### Deployment Workflows (Run on push to main)

3. **Railway** (`.github/workflows/deploy-railway.yml`)
   - Deploys when commit message contains `[deploy]`
   - Or trigger manually from Actions tab

4. **Render** (`.github/workflows/deploy-render.yml`)
   - Auto-deploys on push to main
   - Or trigger manually

5. **VPS** (`.github/workflows/deploy-vps.yml`)
   - Deploys via SSH
   - Runs migrations
   - Restarts services

6. **Fly.io** (`.github/workflows/deploy-flyio.yml`)
   - Deploys to Fly.io
   - Requires `fly.toml` in backend/frontend directories

7. **Docker Build** (`.github/workflows/docker-build.yml`)
   - Builds and pushes Docker images to GitHub Container Registry
   - Images available at: `ghcr.io/valiantazarya/hrms_larzo-backend:latest`

## Usage Examples

### Automatic Deployment to Railway

Add `[deploy]` to your commit message:

```bash
git commit -m "feat: add new feature [deploy]"
git push origin main
```

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select workflow (e.g., "Deploy to Railway")
3. Click **"Run workflow"**
4. Select branch and click **"Run workflow"**

### View Workflow Runs

1. Go to **Actions** tab
2. Click on a workflow run
3. View logs for each step
4. Download artifacts if needed

## Docker Deployment

### Build Images Locally

```bash
# Backend
cd backend
docker build -t hrms-backend:latest .

# Frontend
cd frontend
docker build -t hrms-frontend:latest --build-arg VITE_API_URL=https://api.example.com/api/v1 .
```

### Use Pre-built Images

```bash
# Pull from GitHub Container Registry
docker pull ghcr.io/valiantazarya/hrms_larzo-backend:latest
docker pull ghcr.io/valiantazarya/hrms_larzo-frontend:latest
```

### Run with Docker Compose

```bash
# Copy production compose file
cp .github/workflows/docker-compose.prod.yml docker-compose.prod.yml

# Set environment variables
export DATABASE_URL="..."
export JWT_SECRET="..."
# ... etc

# Start services
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### CI Fails

**Problem:** Tests fail
- Check test database connection
- Verify environment variables in workflow
- Check test files exist

**Problem:** Build fails
- Check for TypeScript errors
- Verify all dependencies in package.json
- Check Node.js version (should be 20)

### Deployment Fails

**Problem:** Railway deployment fails
- Verify `RAILWAY_TOKEN` is set correctly
- Check Railway project is linked
- Verify service names match

**Problem:** VPS deployment fails
- Check SSH key is correct
- Verify user has sudo permissions
- Check VPS has Node.js 20+ installed
- Verify git is installed on VPS

**Problem:** Docker build fails
- Check Dockerfile syntax
- Verify build context is correct
- Check for missing files

### Health Check Fails

**Problem:** Health endpoint returns error
- Verify database connection
- Check Prisma client is generated
- Verify port is correct (3000)

## Environment Variables for Production

### Backend
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=sqlserver://...
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend
```env
VITE_API_URL=https://api.your-domain.com/api/v1
```

## Next Steps

1. ✅ Add all required secrets
2. ✅ Test CI workflows with a PR
3. ✅ Set up your deployment platform
4. ✅ Test deployment workflow
5. ✅ Monitor first production deployment
6. ✅ Set up monitoring and alerts

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Docker Documentation](https://docs.docker.com)
