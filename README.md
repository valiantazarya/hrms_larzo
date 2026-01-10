# HRMS - Human Resource Management System

Production-ready HRMS for single company in Indonesia.

## Tech Stack

### Backend
- Node.js + NestJS + TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- MinIO (S3-compatible storage)

### Frontend
- React + TypeScript
- Vite
- React Router
- React Query
- React Hook Form + Zod
- react-i18next (Bahasa Indonesia)

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Setup

1. **Start Docker services**

   **Note:** Modern Docker installations use `docker compose` (without hyphen). If you get "command not found", try:
   ```bash
   docker compose up -d
   ```
   
   For older installations:
   ```bash
   docker-compose up -d
   ```
   
   **Troubleshooting:**
   - Make sure Docker Desktop is installed and running
   - Check Docker status: `docker ps`
   - If Docker isn't installed: Download from https://www.docker.com/products/docker-desktop/ or use `brew install --cask docker`

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

3. **Setup Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Database Migrations

```bash
cd backend
npx prisma migrate dev --name migration_name
```

### Seed Data

```bash
cd backend
npm run prisma:seed
```

## Project Structure

```
human_resources/
├── backend/          # NestJS backend
├── frontend/         # React frontend
├── docker-compose.yml
└── DESIGN.md         # Complete design document
```

## Documentation

- [Design Document](./DESIGN.md) - Complete system design and architecture
- [API Documentation](./API_DOCUMENTATION.md) - API endpoints and usage
- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Implementation Status](./IMPLEMENTATION_STATUS.md) - Current progress

## Features

- ✅ Employee Management
- ✅ Attendance Tracking (Clock In/Out with Geofencing)
- ✅ Leave Management (Requests, Approvals, Balance Tracking)
  - Leave quota management (owner can configure max balance, accrual rate, carryover, expiry)
  - Automatic balance recalculation based on quota settings
  - Leave balance display with max balance and used days tracking
- ✅ Overtime Management (Requests, Calculations, Approvals)
- ✅ Payroll Processing (Monthly Runs, Calculations, Payslips)
- ✅ Reporting (Attendance, Leave, Overtime, Payroll)
- ✅ Audit Logging
- ✅ Role-Based Access Control (OWNER, MANAGER, EMPLOYEE)
- ✅ Password Reset (Forgot/Reset Password)
- ✅ Geofencing for Attendance (Location-based Clock In/Out)
- ✅ Mobile-First Responsive UI
- ✅ Bahasa Indonesia Language Support

## Business Rules

- **Working Days**: Tuesday to Sunday (Monday is non-working day)
- **Leave Days**: Calculated excluding Monday (only Tuesday-Sunday count as leave days)
- **Overtime**: Monday is treated as overtime (WEEKEND rates apply)
- **Leave Balances**: Automatically reflect owner's quota settings (max balance, accrual rate, etc.)
- **Date Calculations**: All dates use Asia/Jakarta timezone with proper timezone handling

## Security Features

- JWT authentication with refresh token rotation
- Role-based access control (RBAC)
- Input validation on all endpoints
- SQL injection prevention (Prisma)
- XSS protection
- Audit logging for sensitive operations
- Global error handling and consistent API responses

## License

MIT

# hrms_larzo
