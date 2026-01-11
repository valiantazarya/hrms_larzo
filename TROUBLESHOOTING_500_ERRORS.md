# Troubleshooting 500 Internal Server Errors in Production

## Quick Checklist

When you encounter a 500 error in production, check these items in order:

---

## 1. **Check Backend Logs** (Most Important)

### If using Docker Compose:
```bash
# View backend logs
docker-compose logs backend --tail=100 -f

# Or if using docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml logs backend --tail=100 -f
```

### If using PM2:
```bash
# View PM2 logs
pm2 logs backend --lines 100

# Or check specific log file
pm2 logs backend --err --lines 100  # Error logs only
pm2 logs backend --out --lines 100 # Output logs only
```

### If using systemd:
```bash
# View service logs
sudo journalctl -u hrms-backend -n 100 --no-pager
sudo journalctl -u hrms-backend -f  # Follow logs
```

**Look for:**
- Stack traces
- Error messages with file names and line numbers
- Database connection errors
- Missing environment variables
- Prisma errors

---

## 2. **Check Nginx/Apache Logs**

### Nginx Error Logs:
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Or if using Docker
docker-compose logs nginx --tail=100 -f
```

### Common Nginx Issues:
- Proxy timeouts
- Upstream connection errors
- SSL certificate issues
- Request size limits

---

## 3. **Check Database Connection**

```bash
# Test database connection
# If using Docker
docker-compose exec backend npm run prisma:studio

# Or manually test connection
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "${DB_PASSWORD}" -Q "SELECT 1"
```

**Common Issues:**
- Database server is down
- Wrong connection string in `.env`
- Database credentials expired
- Network connectivity issues
- Database is full or locked

---

## 4. **Check Environment Variables**

```bash
# Verify environment variables are set
docker-compose exec backend env | grep -E "(DATABASE_URL|JWT_SECRET|MINIO)"

# Check if .env file exists and has correct values
cat backend/.env | grep -v "PASSWORD\|SECRET"  # Don't show secrets
```

**Required Variables:**
- `DATABASE_URL` - Must be valid SQL Server connection string
- `JWT_SECRET` - Must be set
- `JWT_REFRESH_SECRET` - Must be set
- `MINIO_ENDPOINT` - Must be accessible
- `MINIO_ACCESS_KEY` - Must be valid
- `MINIO_SECRET_KEY` - Must be valid
- `CORS_ORIGIN` - Must match frontend URL
- `NODE_ENV=production`

---

## 5. **Check Service Health**

```bash
# Check if backend is running
docker-compose ps

# Check backend health endpoint
curl http://localhost:3000/api/v1/health

# Or from outside
curl https://your-domain.com/api/v1/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 6. **Check Disk Space**

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up if needed
docker system prune -a --volumes  # CAREFUL: Removes unused images/volumes
```

**Common Issues:**
- Disk full (can't write logs or temp files)
- Docker volumes taking too much space
- Log files growing too large

---

## 7. **Check Memory/CPU Usage**

```bash
# Check system resources
htop
# or
top

# Check Docker container resources
docker stats

# Check PM2 process
pm2 monit
```

**Common Issues:**
- Out of memory (OOM errors)
- High CPU usage causing timeouts
- Too many concurrent requests

---

## 8. **Check Recent Code Changes**

```bash
# Check git log for recent commits
git log --oneline -10

# Check if there are uncommitted changes
git status

# Check if production code matches expected version
git describe --tags
```

**Common Issues:**
- Recent deployment introduced bug
- Code not properly built
- Missing dependencies

---

## 9. **Check Prisma/Database Schema**

```bash
# Check if migrations are up to date
docker-compose exec backend npx prisma migrate status

# Check Prisma client is generated
docker-compose exec backend ls -la node_modules/.prisma/client

# Regenerate Prisma client if needed
docker-compose exec backend npx prisma generate
```

**Common Issues:**
- Database schema out of sync
- Missing migrations
- Prisma client not generated

---

## 10. **Check Network/Firewall**

```bash
# Test backend connectivity
curl -v http://localhost:3000/api/v1/health

# Check if port is listening
netstat -tulpn | grep 3000
# or
ss -tulpn | grep 3000

# Check firewall rules
sudo ufw status
# or
sudo iptables -L
```

**Common Issues:**
- Port blocked by firewall
- Backend not listening on correct interface
- Network connectivity issues

---

## 11. **Check Browser Console & Network Tab**

**In Browser DevTools (F12):**
1. **Console Tab:**
   - Look for JavaScript errors
   - Check for CORS errors
   - Look for network errors

2. **Network Tab:**
   - Find the failed request (status 500)
   - Click on it to see:
     - Request URL
     - Request headers
     - Response headers
     - Response body (error message)
   - Check if it's a specific endpoint or all endpoints

**Common Frontend Issues:**
- CORS errors
- API endpoint misconfiguration
- Authentication token expired
- Missing request headers

---

## 12. **Check Application-Specific Logs**

### Backend Application Logs:
```bash
# If using Winston or custom logger
docker-compose exec backend ls -la logs/

# Check application-specific log files
docker-compose exec backend tail -f logs/app.log
docker-compose exec backend tail -f logs/error.log
```

### Audit Logs:
```bash
# Check audit logs in database
docker-compose exec backend npx prisma studio
# Navigate to AuditLog table
```

---

## 13. **Common 500 Error Scenarios**

### Scenario 1: Database Connection Error
**Symptoms:**
- Error: "Connection refused" or "ECONNREFUSED"
- Error: "Login failed for user"

**Solution:**
```bash
# Check database is running
docker-compose ps sqlserver

# Restart database
docker-compose restart sqlserver

# Check connection string
echo $DATABASE_URL
```

### Scenario 2: Missing Environment Variable
**Symptoms:**
- Error: "Cannot read property of undefined"
- Error: "process.env.XXX is not defined"

**Solution:**
```bash
# Check .env file
cat backend/.env

# Restart backend after fixing
docker-compose restart backend
```

### Scenario 3: Prisma Client Error
**Symptoms:**
- Error: "PrismaClient is not configured"
- Error: "Cannot find module '@prisma/client'"

**Solution:**
```bash
# Regenerate Prisma client
docker-compose exec backend npx prisma generate

# Restart backend
docker-compose restart backend
```

### Scenario 4: Out of Memory
**Symptoms:**
- Error: "JavaScript heap out of memory"
- Process killed (OOM)

**Solution:**
```bash
# Increase Node.js memory limit in docker-compose.yml
environment:
  - NODE_OPTIONS=--max-old-space-size=2048

# Restart backend
docker-compose restart backend
```

### Scenario 5: File Permission Issues
**Symptoms:**
- Error: "EACCES: permission denied"
- Error: "Cannot write to file"

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:$USER /path/to/app
chmod -R 755 /path/to/app
```

---

## 14. **Quick Recovery Steps**

### Step 1: Restart Services
```bash
# Restart all services
docker-compose restart

# Or restart specific service
docker-compose restart backend
```

### Step 2: Rebuild if Needed
```bash
# Rebuild and restart
docker-compose up -d --build backend
```

### Step 3: Check Logs Again
```bash
# Monitor logs after restart
docker-compose logs backend -f
```

### Step 4: Rollback if Necessary
```bash
# Rollback to previous version
git checkout <previous-commit-hash>
docker-compose up -d --build
```

---

## 15. **Prevention & Monitoring**

### Set Up Error Monitoring:
1. **Sentry** (Free tier available)
   - Automatic error tracking
   - Stack traces
   - Performance monitoring

2. **PM2 Monitoring** (if using PM2)
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   ```

3. **Docker Logging**
   ```yaml
   # In docker-compose.yml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

### Set Up Health Checks:
```bash
# Add to cron for automated health checks
*/5 * * * * curl -f http://localhost:3000/api/v1/health || echo "Backend down" | mail -s "Alert" admin@example.com
```

---

## 16. **Getting Help**

When reporting the issue, include:

1. **Error Message:** Full error from logs
2. **Stack Trace:** Complete stack trace
3. **Request Details:** URL, method, headers
4. **Environment:** OS, Node version, Docker version
5. **Recent Changes:** What changed before the error
6. **Logs:** Relevant log excerpts (last 50-100 lines)
7. **Configuration:** Environment variables (without secrets)

---

## Quick Command Reference

```bash
# View all logs
docker-compose logs --tail=100

# Follow logs
docker-compose logs -f

# Check service status
docker-compose ps

# Restart service
docker-compose restart backend

# Rebuild service
docker-compose up -d --build backend

# Execute command in container
docker-compose exec backend <command>

# Check environment
docker-compose exec backend env

# Test database connection
docker-compose exec backend npx prisma db pull

# Check disk space
df -h && docker system df
```

---

## Emergency Rollback

If the site is completely down:

```bash
# 1. Stop current version
docker-compose down

# 2. Checkout previous working version
git checkout <previous-tag-or-commit>

# 3. Rebuild and start
docker-compose up -d --build

# 4. Monitor logs
docker-compose logs -f
```

---

**Remember:** Always check logs first - they usually tell you exactly what's wrong!
