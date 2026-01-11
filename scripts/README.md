# Deployment Scripts

Scripts to help with deployment and fixing common issues.

## Available Scripts

### 1. `check-mixed-content.sh`
Checks the frontend build for mixed content issues (HTTP URLs when HTTPS is required).

**Usage:**
```bash
./scripts/check-mixed-content.sh
```

**What it does:**
- Scans built JavaScript files for HTTP URLs
- Checks for problematic patterns
- Verifies environment configuration
- Reports any mixed content issues

---

### 2. `fix-mixed-content.sh`
Fixes mixed content issues by rebuilding the frontend with correct HTTPS configuration.

**Usage:**
```bash
./scripts/fix-mixed-content.sh
```

**What it does:**
- Prompts for your domain (or detects from existing config)
- Creates/updates `.env.production` with HTTPS API URL
- Backs up old build
- Rebuilds frontend with production configuration
- Verifies the new build doesn't have HTTP URLs

---

### 3. `deploy-frontend.sh`
Deploys the frontend build to your server.

**Usage:**
```bash
# Check and deploy automatically
./scripts/deploy-frontend.sh user@server /path/to/frontend

# Or just show instructions
./scripts/deploy-frontend.sh
```

**What it does:**
- Checks for mixed content before deploying
- Creates backup on server
- Uploads new build via rsync
- Reloads nginx (if accessible)

---

### 4. `check-deployed-mixed-content.sh`
Checks deployed files on the server for mixed content issues.

**Usage:**
```bash
./scripts/check-deployed-mixed-content.sh user@server /path/to/frontend/dist
```

**What it does:**
- Connects to server via SSH
- Scans deployed JavaScript files for HTTP URLs
- Reports any mixed content issues found

---

## Quick Fix Workflow

If you're experiencing mixed content errors:

```bash
# 1. Fix the build
./scripts/fix-mixed-content.sh

# 2. Verify it's fixed
./scripts/check-mixed-content.sh

# 3. Deploy to server
./scripts/deploy-frontend.sh user@server /path/to/frontend

# 4. Verify deployed files
./scripts/check-deployed-mixed-content.sh user@server /path/to/frontend/dist
```

## Troubleshooting

### Scripts not executable
```bash
chmod +x scripts/*.sh
```

### Build fails
- Make sure you're in the project root
- Ensure `node_modules` is installed: `cd frontend && npm install`

### Deployment fails
- Check SSH access to server
- Verify remote path exists
- Ensure you have write permissions on the server
