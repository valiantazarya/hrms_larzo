# Port Configuration

## Default Ports

- **PostgreSQL**: `5432`
- **MinIO API**: `9002` (changed from 9000 if port conflict)
- **MinIO Console**: `9003` (changed from 9001 if port conflict)
- **Backend API**: `3000`
- **Frontend**: `5173`

## Changing Ports

If you encounter port conflicts, you can change them in `docker-compose.yml`:

### MinIO Port Conflict

If port 9000 or 9001 is already in use, edit `docker-compose.yml`:

```yaml
minio:
  ports:
    - "9002:9000"  # Host:Container - Change 9002 to any available port
    - "9003:9001"  # Host:Container - Change 9003 to any available port
```

**Important:** After changing ports, update your backend `.env` file:

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9002  # Match the first port number above
```

### PostgreSQL Port Conflict

If port 5432 is already in use:

```yaml
postgres:
  ports:
    - "5433:5432"  # Change 5433 to any available port
```

Then update `DATABASE_URL` in backend `.env`:

```env
DATABASE_URL="postgresql://hrms_user:hrms_password@hrms_postgres:5433/hrms_db?schema=public"
```

### Backend Port Conflict

If port 3000 is already in use, change in backend `.env`:

```env
PORT=3001
```

And update frontend `.env`:

```env
VITE_API_URL=http://localhost:3001/api/v1
```

## Finding What's Using a Port

```bash
# Check what's using a port
lsof -i :9000

# Or use netstat
netstat -an | grep 9000
```

## Current Configuration

Based on the docker-compose.yml:
- MinIO API: Port `9002` (maps to container port 9000)
- MinIO Console: Port `9003` (maps to container port 9001)
- PostgreSQL: Port `5432`

Make sure your backend `.env` matches these ports!


