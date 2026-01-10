# Database Access Guide

## Connection Details

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `larzo_hrms`
- **Schema**: `public`
- **Username**: `larzo_admin`
- **Password**: `hrms_password`

## Connection String

```
postgresql://larzo_admin:hrms_password@localhost:5432/larzo_hrms?schema=public
```

## Methods to Access

### 1. Using psql (Command Line)

**Via Docker:**
```bash
docker exec -it hrms_postgres psql -U larzo_admin -d larzo_hrms
```

**Direct connection (if psql is installed locally):**
```bash
psql -h hrms_postgres -U larzo_admin -d larzo_hrms
# Password: hrms_password
```

**Quick queries:**
```bash
# List all tables
docker exec hrms_postgres psql -U larzo_admin -d larzo_hrms -c "\dt"

# List all schemas
docker exec hrms_postgres psql -U larzo_admin -d larzo_hrms -c "\dn"

# Run a query
docker exec hrms_postgres psql -U larzo_admin -d larzo_hrms -c "SELECT * FROM users LIMIT 5;"
```

### 2. Using Prisma Studio (Visual GUI)

**Start Prisma Studio:**
```bash
cd backend
npx prisma studio
```

This will open a web interface at `http://localhost:5555` where you can:
- Browse all tables
- View and edit data
- Run queries visually

**Note:** Make sure your `.env` file has the correct `DATABASE_URL`.

### 3. Using Database GUI Tools

**DBeaver:**
1. Download from https://dbeaver.io/
2. Create new PostgreSQL connection
3. Use connection details above

**pgAdmin:**
1. Download from https://www.pgadmin.org/
2. Add new server with connection details above

**TablePlus:**
1. Download from https://tableplus.com/
2. Create new PostgreSQL connection
3. Use connection details above

**Postico (macOS):**
1. Download from https://eggerapps.at/postico/
2. Create new favorite with connection details

### 4. Using Connection String in Applications

**Node.js/Prisma:**
```env
DATABASE_URL="postgresql://larzo_admin:Default123!@hrms_postgres:5432/larzo_hrms?schema=public"
```

**Python (psycopg2):**
```python
import psycopg2
conn = psycopg2.connect(
    host="hrms_postgres",
    port=5432,
    database="larzo_hrms",
    user="larzo_admin",
    password="Default123!"
)
```

**Java (JDBC):**
```
jdbc:postgresql://hrms_postgres:5432/larzo_hrms?user=larzo_admin&password=Default123!
```

## Common psql Commands

Once connected via psql:

```sql
-- List all tables
\dt

-- Describe a table
\d table_name

-- List all schemas
\dn

-- List all databases
\l

-- Switch database
\c database_name

-- List all users
\du

-- Show current database
SELECT current_database();

-- Show current user
SELECT current_user;

-- Exit
\q
```

## Troubleshooting

### Connection Refused
- Make sure PostgreSQL container is running: `docker ps | grep postgres`
- Check if port 5432 is available: `lsof -i :5432`

### Authentication Failed
- Verify username and password
- Check if user exists: `docker exec hrms_postgres psql -U larzo_admin -d postgres -c "\du"`

### Permission Denied
- User should have superuser privileges (already set)
- Check database ownership: `docker exec hrms_postgres psql -U larzo_admin -d postgres -c "\l+"`

## Quick Access Script

Create a file `db-access.sh`:

```bash
#!/bin/bash
docker exec -it hrms_postgres psql -U larzo_admin -d larzo_hrms
```

Make it executable:
```bash
chmod +x db-access.sh
./db-access.sh
```

