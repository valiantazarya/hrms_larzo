# Setup Guide

## Quick Start

### 1. Docker Services

Start PostgreSQL and MinIO:

```bash
# Modern Docker (recommended)
docker compose up -d

# Older Docker installations
docker-compose up -d
```

**Verify services are running:**
```bash
docker ps
```

You should see:
- `hrms_postgres` on port 5432
- `hrms_minio` on ports 9002 (API) and 9003 (Console)

**Note:** If you get port conflicts, see [PORT_CONFIG.md](./PORT_CONFIG.md) for how to change ports.

**If Docker is not installed:**
- macOS: `brew install --cask docker` or download from https://www.docker.com/products/docker-desktop/
- Make sure Docker Desktop is running before executing docker commands

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example or create manually)
# The .env file is protected, so you need to create it manually with:
# - DATABASE_URL pointing to PostgreSQL
# - JWT secrets
# - MinIO configuration

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed initial data (company, owner user, policies, holidays)
npm run prisma:seed

# Start development server
npm run start:dev
```

The backend will be available at: `http://localhost:3000/api/v1`

**Default credentials after seeding:**
- Email: `owner@contoh.com`
- Password: `owner123`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## Troubleshooting

### Docker Issues

**"docker-compose: command not found"**
- Use `docker compose` (without hyphen) for newer Docker versions
- Or install docker-compose: `brew install docker-compose`

**"Cannot connect to Docker daemon"**
- Make sure Docker Desktop is running
- Check Docker status: `docker ps`

**Port already in use**
- Check if PostgreSQL is already running: `lsof -i :5432`
- Check if MinIO is already running: `lsof -i :9000`
- Stop existing services or change ports in docker-compose.yml

### Backend Issues

**"Cannot connect to database"**
- Verify Docker services are running: `docker ps`
- Check DATABASE_URL in .env file
- Test connection: `psql postgresql://hrms_user:hrms_password@hrms_postgres:5432/hrms_db`

**"Prisma client not generated"**
- Run: `npx prisma generate`
- Make sure DATABASE_URL is correct

**"Migration failed"**
- Check database connection
- Verify PostgreSQL is running
- Check Prisma schema for errors

### Frontend Issues

**"Cannot connect to API"**
- Verify backend is running on port 3000
- Check VITE_API_URL in frontend/.env
- Check CORS settings in backend

**"Module not found"**
- Run `npm install` again
- Delete node_modules and package-lock.json, then reinstall
- Check Node.js version (requires 20+)

## Environment Variables

### Backend (.env)

Create a `.env` file in the `backend/` directory with the following variables:

**Required variables:**
- `DATABASE_URL` - Database connection string (SQL Server format)
- `JWT_SECRET` - Secret for access tokens (use strong random string, 32+ characters)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (use strong random string, 32+ characters)
- `JWT_EXPIRES_IN` - Access token expiration (default: 15m)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: 7d)
- `MINIO_ENDPOINT` - MinIO server address (default: localhost)
- `MINIO_PORT` - MinIO port (default: 9002)
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `MINIO_BUCKET_NAME` - MinIO bucket name (default: hrms-documents)
- `MINIO_USE_SSL` - Use SSL for MinIO (default: false)

**Optional variables:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `API_PREFIX` - API prefix (default: api/v1)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `CORS_ORIGIN` - CORS origin (default: http://localhost:5173)

**Example .env file:**
```env
DATABASE_URL="sqlserver://sa:YourStrongPassword123@localhost:1433/hrms_db?encrypt=true&trustServerCertificate=true"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MINIO_ENDPOINT=localhost
MINIO_PORT=9002
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=hrms-documents
MINIO_USE_SSL=false
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
API_PREFIX=api/v1
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)

Create a `.env` file in the `frontend/` directory with the following variables:

**Required variables:**
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000/api/v1)

**Optional variables:**
- `VITE_NODE_ENV` - Environment (development/production)

**Example .env file:**
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_NODE_ENV=development
```

**Note:** For production, update `VITE_API_URL` to your production API URL.

## Important Configuration Notes

### Working Days
- **Working Days**: Tuesday to Sunday
- **Non-Working Day**: Monday (if worked, treated as overtime)
- Leave days calculation excludes Monday
- Overtime on Monday uses WEEKEND rates

### Leave Management
- Owner can configure leave quotas (max balance, accrual rate, carryover, expiry)
- Leave balances automatically recalculate based on current quota settings
- Balance display shows: `maxBalance - used` when max balance is set
- Employees can refresh balances to see latest quota changes

### Date Handling
- All date calculations use Luxon with Asia/Jakarta timezone
- Dates are normalized to start of day to avoid timezone issues
- Leave requests include both start and end dates (inclusive)

### Geofencing (Optional)
- Geofencing can be enabled in Company Settings (Owner Dashboard)
- When enabled, employees must be within the configured radius to clock in/out
- Configure work location center (latitude/longitude) and radius in meters
- System uses browser Geolocation API to get user's current location
- Distance calculation uses Haversine formula for accuracy

### Payroll Configuration

The payroll system uses a policy-based configuration system to set BPJS rates and other payroll parameters.

#### Setting Up Payroll Configuration

**Via API (Recommended for initial setup):**

1. Login as Owner and get your access token
2. Create a payroll configuration policy:

```bash
POST /api/v1/policies
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "type": "PAYROLL_CONFIG",
  "isActive": true,
  "config": {
    "bpjsKesehatan": {
      "type": "percentage",
      "value": 5
    },
    "bpjsKetenagakerjaan": {
      "type": "percentage",
      "value": 2
    }
  }
}
```

**Via Frontend (Owner Dashboard):**

1. Navigate to **Policy Management** in the Owner Dashboard
2. Select **Payroll Configuration** from the policy type dropdown
3. Configure BPJS rates:
   - **BPJS Kesehatan**: Set type (percentage or fixed) and value
   - **BPJS Ketenagakerjaan**: Set type (percentage or fixed) and value
4. Click **Create Policy** or **Update Policy**

#### Configuration Options

**BPJS Kesehatan (Health Insurance):**
- `type`: `"percentage"` or `"fixed"`
  - `percentage`: Rate as percentage of gross pay (e.g., 5 = 5%)
  - `fixed`: Fixed amount in IDR (e.g., 50000)
- `value`: The rate value (percentage: 0-100, fixed: amount in IDR)

**BPJS Ketenagakerjaan (Employment Insurance):**
- `type`: `"percentage"` or `"fixed"`
  - `percentage`: Rate as percentage of gross pay (e.g., 2 = 2%)
  - `fixed`: Fixed amount in IDR (e.g., 20000)
- `value`: The rate value (percentage: 0-100, fixed: amount in IDR)

#### Default Configuration

If no payroll configuration policy is set, the system uses these defaults:
- BPJS Kesehatan: 5% (percentage)
- BPJS Ketenagakerjaan: 2% (percentage)

#### Example Configurations

**Standard Indonesian BPJS Rates (Percentage-based):**
```json
{
  "bpjsKesehatan": {
    "type": "percentage",
    "value": 5
  },
  "bpjsKetenagakerjaan": {
    "type": "percentage",
    "value": 2
  }
}
```

**Fixed Amount Configuration:**
```json
{
  "bpjsKesehatan": {
    "type": "fixed",
    "value": 50000
  },
  "bpjsKetenagakerjaan": {
    "type": "fixed",
    "value": 20000
  }
}
```

**Mixed Configuration:**
```json
{
  "bpjsKesehatan": {
    "type": "percentage",
    "value": 5
  },
  "bpjsKetenagakerjaan": {
    "type": "fixed",
    "value": 25000
  }
}
```

#### How BPJS is Calculated

1. **For employees with `hasBPJS = true`:**
   - BPJS is calculated based on the configured rates
   - Employee portion: Calculated from gross pay
   - Employer portion: Calculated from gross pay
   - Both are deducted from net pay

2. **For employees with `hasBPJS = false`:**
   - No BPJS deductions are applied
   - Employee can still have transport/lunch bonuses and THR

3. **Calculation Formula:**
   - **Percentage type**: `(grossPay × value) / 100`
   - **Fixed type**: `value` (fixed amount)

#### Employee-Level BPJS Settings

Each employee can have individual BPJS settings:
- `hasBPJS`: Boolean flag to enable/disable BPJS for the employee
- Set in **Employee Management** → **Employment Details**
- When `hasBPJS = false`, no BPJS deductions are applied regardless of policy

#### Transport, Lunch Bonuses, and THR

These are set per employee in **Employee Management** → **Employment Details**:
- `transportBonus`: Fixed monthly transport allowance (IDR)
- `lunchBonus`: Fixed monthly lunch allowance (IDR)
- `thr`: THR (Tunjangan Hari Raya) - Holiday bonus (IDR)

These bonuses are:
- Added to gross pay
- Included in payroll calculations
- Can be edited in the payroll page by owners

#### Payroll Calculation Flow

1. **Base Pay Calculation:**
   - Monthly: Uses `baseSalary` directly
   - Hourly: `hourlyRate × totalHours` (from attendance records)
   - Daily: `dailyRate × presentDays` (counts PRESENT status as 1 day, HALF_DAY as 0.5 days)

2. **Gross Pay Calculation:**
   ```
   Gross Pay = Base Pay + Overtime Pay + Allowances + Bonuses + Transport Bonus + Lunch Bonus + THR - Deductions
   ```

3. **Net Pay Calculation:**
   ```
   Net Pay = Gross Pay - BPJS Kesehatan (Employee) - BPJS Ketenagakerjaan (Employee) - PPh 21
   ```

#### Updating Payroll Configuration

1. Navigate to **Policy Management** → **Payroll Configuration**
2. Click **Create New Version** to update the configuration
3. The old version will be automatically deactivated
4. New payroll runs will use the updated configuration
5. Existing payroll runs remain unchanged (locked/paid runs cannot be modified)

#### Important Notes

- **Policy Versioning**: Each update creates a new version, keeping history
- **Active Policy**: Only the active policy is used for new payroll runs
- **Backward Compatibility**: Old rate format (`bpjsKesehatanRate`) is automatically converted
- **Validation**: Invalid configurations fall back to default values
- **Employee Override**: `hasBPJS = false` on employee level overrides policy settings

## Next Steps

1. Login with default owner credentials
2. Create employees and managers
3. Configure company policies
4. Set up leave quotas in Leave Quota Management
5. (Optional) Configure geofencing in Company Settings if location-based attendance is needed
6. Start using the system!

For detailed architecture and API documentation, see [DESIGN.md](./DESIGN.md).

