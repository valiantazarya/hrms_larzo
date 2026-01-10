# Production Deployment Checklist

## Pre-Deployment

### Code Quality
- [x] Remove all `console.log` debug statements
- [x] Remove `console.warn` for non-critical issues
- [x] Keep `console.error` for critical error logging
- [x] Fix all linting errors
- [x] Remove TODO/FIXME comments or document them
- [x] Review and test all error handling

### Environment Variables
- [x] Create `.env.example` files for backend and frontend
- [ ] Set strong JWT secrets (32+ characters, random)
- [ ] Set strong database passwords
- [ ] Configure production database URL
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for production domain
- [ ] Set `FRONTEND_URL` to production URL
- [ ] Configure MinIO credentials (change from defaults)

### Security
- [ ] Review all API endpoints for proper authentication
- [ ] Verify all routes have appropriate role guards
- [ ] Check input validation on all DTOs
- [ ] Review SQL injection prevention (Prisma handles this)
- [ ] Verify CORS is properly configured
- [ ] Check for hardcoded secrets (none should exist)
- [ ] Review file upload security
- [ ] Verify password hashing (bcrypt with salt rounds)

### Database
- [ ] Backup existing database (if upgrading)
- [ ] Test migrations on staging environment
- [ ] Verify all migrations are production-ready
- [ ] Check database indexes are optimized
- [ ] Review database connection pooling settings

### Frontend
- [ ] Update `VITE_API_URL` to production API URL
- [ ] Verify all API calls use environment variables
- [ ] Test error boundaries
- [ ] Verify offline handling
- [ ] Check responsive design on mobile devices
- [ ] Test all user flows

### Testing
- [ ] Test authentication flow
- [ ] Test employee management (CRUD)
- [ ] Test attendance (clock in/out)
- [ ] Test leave requests
- [ ] Test overtime requests
- [ ] Test payroll generation
- [ ] Test shift schedule management
- [ ] Test audit log viewing
- [ ] Test file uploads/downloads

### Documentation
- [x] Update SETUP.md with environment variables
- [x] Create .env.example files
- [ ] Document production deployment steps
- [ ] Document rollback procedure
- [ ] Document monitoring setup

## Deployment Steps

### 1. Backend Deployment

```bash
# Build backend
cd backend
npm install --production
npm run build

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start application
npm run start:prod
```

### 2. Frontend Deployment

```bash
# Build frontend
cd frontend
npm install
npm run build

# Deploy dist/ folder to hosting service
```

### 3. Database Migration

```bash
# Run migrations (if not done in step 1)
cd backend
npx prisma migrate deploy
```

### 4. Verify Deployment

- [ ] Health check endpoint returns 200
- [ ] API is accessible from frontend
- [ ] Authentication works
- [ ] Database connection is stable
- [ ] File uploads work
- [ ] All features are functional

## Post-Deployment

### Monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Set up application monitoring
- [ ] Monitor database performance
- [ ] Set up uptime monitoring
- [ ] Configure alerts for critical errors

### Backup
- [ ] Set up automated database backups
- [ ] Test backup restoration
- [ ] Document backup schedule

### Security
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Review security headers
- [ ] Set up rate limiting (if needed)
- [ ] Monitor for suspicious activity

### Performance
- [ ] Monitor API response times
- [ ] Check database query performance
- [ ] Optimize slow queries
- [ ] Set up caching if needed

## Rollback Procedure

If deployment fails:

1. **Backend Rollback:**
   ```bash
   # Revert to previous version
   git checkout <previous-commit>
   npm install --production
   npm run build
   npx prisma generate
   npm run start:prod
   ```

2. **Database Rollback:**
   ```bash
   # Revert last migration (if needed)
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

3. **Frontend Rollback:**
   - Revert to previous build
   - Deploy previous dist/ folder

## Environment Variables Reference

### Backend (.env)
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=sqlserver://...
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MINIO_ENDPOINT=...
MINIO_PORT=9002
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET_NAME=hrms-documents
MINIO_USE_SSL=false
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
API_PREFIX=api/v1
```

### Frontend (.env.production)
```env
VITE_API_URL=https://api.your-domain.com/api/v1
VITE_NODE_ENV=production
```

## Common Issues

### Database Connection Fails
- Check DATABASE_URL format
- Verify database server is accessible
- Check firewall rules
- Verify credentials

### CORS Errors
- Verify CORS_ORIGIN matches frontend URL exactly
- Check FRONTEND_URL is set correctly
- Verify backend CORS configuration

### JWT Token Issues
- Verify JWT_SECRET is set
- Check token expiration settings
- Verify refresh token secret is different

### File Upload Fails
- Check MinIO connection
- Verify bucket exists
- Check MinIO credentials
- Verify file size limits

## Support

For issues during deployment:
1. Check application logs
2. Check database logs
3. Review error messages
4. Check environment variables
5. Verify all services are running
