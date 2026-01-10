# HRMS Frontend Testing Report
Generated: 2026-01-08

## Server Status ✅

- **Frontend**: Running on http://localhost:5173
- **Backend**: Running on http://localhost:3000/api/v1
- **Authentication**: Working (tested with owner credentials)

## Backend API Verification ✅

### Tested Endpoints:
1. ✅ **POST /auth/login** - Authentication successful
2. ✅ **GET /company** - Company data retrieved
3. ✅ **GET /employees** - Employee list retrieved
4. ✅ **GET /policies** - Policies retrieved (Attendance, Leave, Overtime, Payroll)

## Frontend Testing Checklist

### 1. Authentication & Access Control

#### Login Page (`/login`)
- [ ] **Test Login with Owner Credentials**
  - Email: `owner@contoh.com`
  - Password: `owner123`
  - Expected: Redirect to `/owner` dashboard
  
- [ ] **Test Invalid Credentials**
  - Enter wrong email/password
  - Expected: Error message displayed
  
- [ ] **Test Form Validation**
  - Submit empty form
  - Enter invalid email format
  - Expected: Validation errors shown

#### Role-Based Routing
- [ ] **Owner Role** - Redirects to `/owner` dashboard
- [ ] **Manager Role** - Redirects to `/manager` dashboard  
- [ ] **Employee Role** - Redirects to `/employee/attendance`

---

### 2. Owner Dashboard Features

#### Company Settings Tab
- [ ] **View Company Information**
  - Company name, address, phone, email, NPWP displayed
  
- [ ] **Edit Company Information**
  - Click "Edit" button
  - Modify fields
  - Save changes
  - Expected: Success toast, data updated

#### Policy Management Tab
- [ ] **View Policies**
  - Attendance Rules
  - Leave Policy
  - Overtime Policy
  - Payroll Config
  
- [ ] **Edit Attendance Rules**
  - Grace period, rounding, minimum work hours
  - Save changes
  - Expected: Policy updated
  
- [ ] **Edit Leave Policy**
  - Accrual method, max balance, carryover rules
  - Save changes
  
- [ ] **Edit Overtime Policy**
  - Weekday/weekend/holiday multipliers
  - Save changes
  
- [ ] **Edit Payroll Config**
  - BPJS rates, currency
  - Save changes

#### Employee Management Tab
- [ ] **View Employee List**
  - All employees displayed with details
  
- [ ] **Create New Employee**
  - Fill employee form (code, name, email, password, role, NIK, join date)
  - Add employment info (type, salary, manager)
  - Submit
  - Expected: Employee created, appears in list
  
- [ ] **Edit Employee**
  - Click edit on existing employee
  - Modify fields
  - Save
  - Expected: Changes saved
  
- [ ] **Deactivate Employee**
  - Click deactivate
  - Confirm
  - Expected: Status changed to INACTIVE

#### Payroll Tab
- [ ] **View Payroll Runs**
  - List of all payroll runs displayed
  
- [ ] **Create Payroll Run**
  - Select month and year
  - Create run
  - Expected: New run created in DRAFT status
  
- [ ] **Calculate Payroll**
  - Select a payroll run
  - Click "Calculate"
  - Expected: Payroll items calculated for all employees
  
- [ ] **Edit Payroll Items**
  - Modify allowances, bonuses, deductions
  - Save
  - Expected: Changes saved
  
- [ ] **Lock Payroll Run**
  - Click "Lock" button
  - Confirm
  - Expected: Status changed to LOCKED, items immutable

#### Reports Tab
- [ ] **Attendance Summary Report**
  - Select date range
  - View attendance statistics
  - Expected: Data displayed correctly
  
- [ ] **Leave Usage Report**
  - Select date range
  - View leave statistics
  - Expected: Data displayed correctly
  
- [ ] **Overtime Cost Report**
  - Select date range
  - View overtime costs
  - Expected: Data displayed correctly
  
- [ ] **Payroll Totals Report**
  - View payroll totals by month
  - Expected: Data displayed correctly

#### Audit Log Tab
- [ ] **View Audit Logs**
  - List of all audit entries
  - Filter by entity type, action, date range
  - Expected: Filtered results displayed
  
- [ ] **View Entity History**
  - Select entity type and ID
  - View change history
  - Expected: History displayed

---

### 3. Manager Dashboard Features

#### Approval Inbox Tab
- [ ] **View Pending Attendance Adjustments**
  - List of pending adjustments from team members
  - Employee name, date, reason displayed
  
- [ ] **Approve Attendance Adjustment**
  - Click "Approve" on an adjustment
  - Expected: Status changed to APPROVED, removed from pending list
  
- [ ] **Reject Attendance Adjustment**
  - Click "Reject"
  - Enter rejection reason
  - Expected: Status changed to REJECTED
  
- [ ] **View Pending Leave Requests**
  - List of pending leave requests
  - Leave type, dates, days, reason displayed
  
- [ ] **Approve Leave Request**
  - Click "Approve"
  - Expected: Status changed to APPROVED
  
- [ ] **Reject Leave Request**
  - Click "Reject"
  - Enter rejection reason
  - Expected: Status changed to REJECTED
  
- [ ] **View Pending Overtime Requests**
  - List of pending overtime requests
  - Date, duration, calculated pay displayed
  
- [ ] **Approve Overtime Request**
  - Click "Approve"
  - Expected: Status changed to APPROVED
  
- [ ] **Reject Overtime Request**
  - Click "Reject"
  - Enter rejection reason
  - Expected: Status changed to REJECTED

#### Team Overview Tab
- [ ] **View Team Members**
  - List of all direct reports
  - Employee details displayed (name, code, email, status)
  - Expected: All team members visible

---

### 4. Employee Features

#### Attendance Page (`/employee/attendance`)
- [ ] **View Today's Status**
  - Clock in time, clock out time, work duration displayed
  
- [ ] **Clock In**
  - Click "Clock In" button
  - Expected: Success toast, status updated, button changes to "Clock Out"
  
- [ ] **Clock Out**
  - Click "Clock Out" button
  - Expected: Success toast, status updated, work duration calculated
  
- [ ] **Offline Warning**
  - Disconnect network
  - Try to clock in/out
  - Expected: Offline warning displayed, actions disabled

#### Leave Page (`/employee/leave`)
- [ ] **View Leave Balances**
  - Balance cards for each leave type displayed
  
- [ ] **Create Leave Request**
  - Click on a leave type card
  - Fill form (start date, end date, reason)
  - Submit
  - Expected: Request created, appears in "My Requests" list
  
- [ ] **View Leave Requests**
  - List of all requests with status (PENDING, APPROVED, REJECTED)
  - Dates, days, reason displayed
  
- [ ] **View Rejected Reason**
  - If request is rejected, rejection reason displayed

#### Overtime Page (`/employee/overtime`)
- [ ] **View Overtime Requests**
  - List of all overtime requests with status
  
- [ ] **Create Overtime Request**
  - Click "New Request"
  - Fill form (date, duration in minutes, reason, notes)
  - Submit
  - Expected: Request created, appears in list
  
- [ ] **View Calculated Pay**
  - If approved, calculated pay displayed in IDR format

#### Profile Page (`/employee/me`)
- [ ] **View Profile Information**
  - Personal details, employment info displayed
  
- [ ] **Edit Profile**
  - Modify editable fields
  - Save
  - Expected: Changes saved

#### Payslips Page (`/employee/payslips`)
- [ ] **View Payslip List**
  - List of all available payslips by month
  
- [ ] **View Payslip Details**
  - Click on a payslip
  - View detailed breakdown
  - Expected: All components displayed (base pay, allowances, deductions, BPJS, net pay)

---

### 5. UI/UX Testing

#### Responsive Design
- [ ] **Mobile View (< 768px)**
  - Employee layout uses bottom navigation
  - All pages are mobile-friendly
  - Forms are usable on small screens
  
- [ ] **Tablet View (768px - 1024px)**
  - Layout adapts appropriately
  
- [ ] **Desktop View (> 1024px)**
  - Owner/Manager dashboards use full width
  - Tables and lists are properly formatted

#### Navigation
- [ ] **Employee Bottom Navigation**
  - Attendance, Leave, Overtime, Profile icons
  - Active state highlighted
  - Navigation works correctly
  
- [ ] **Owner/Manager Top Navigation**
  - Tab switching works
  - Active tab highlighted
  - Logout button works

#### Error Handling
- [ ] **Network Errors**
  - Display appropriate error messages
  - Retry functionality works
  
- [ ] **Validation Errors**
  - Form validation errors displayed
  - Field-level error messages
  
- [ ] **404 Errors**
  - Invalid routes redirect appropriately

#### Loading States
- [ ] **Loading Indicators**
  - Spinners shown during API calls
  - Buttons show loading state
  - Data fetching shows loading state

#### Toast Notifications
- [ ] **Success Messages**
  - Displayed after successful actions
  - Auto-dismiss after timeout
  
- [ ] **Error Messages**
  - Displayed after failed actions
  - Clear error descriptions

---

### 6. Internationalization (i18n)

- [ ] **Language Support**
  - All text in Bahasa Indonesia
  - Date formats in Indonesian locale
  - Currency in IDR format

---

### 7. Security Testing

- [ ] **Unauthorized Access**
  - Try accessing owner routes as employee
  - Expected: Redirected or access denied
  
- [ ] **Token Expiration**
  - Wait for token to expire
  - Try to make API call
  - Expected: Redirected to login
  
- [ ] **Logout**
  - Click logout
  - Try to access protected routes
  - Expected: Redirected to login

---

## Test Results Summary

### Backend API Status: ✅ PASSING
- Authentication: ✅
- Company API: ✅
- Employee API: ✅
- Policy API: ✅

### Frontend Status: ✅ RUNNING
- Server: Running on port 5173
- Build: No errors detected
- Routes: Configured correctly

### Manual Testing Required
The following require manual browser testing:
- UI interactions and user flows
- Form submissions and validations
- Navigation between pages
- Responsive design verification
- Error handling display
- Toast notifications

---

## Next Steps

1. Open http://localhost:5173 in browser
2. Login with owner credentials: `owner@contoh.com` / `owner123`
3. Test each feature systematically following the checklist above
4. Document any bugs or issues found
5. Test with different user roles (create manager/employee accounts if needed)

---

## Notes

- Default owner credentials: `owner@contoh.com` / `owner123`
- Frontend uses React Query for data fetching
- All API calls require JWT authentication
- Mobile-first design for employee interface
- Desktop-focused design for owner/manager interfaces


