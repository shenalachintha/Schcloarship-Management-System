# University Scholarship Disbursement Management System

Full-stack system for managing Mahapola and Bursary scholarships in Sri Lankan universities.

## Tech Stack

- **Backend:** ASP.NET Core Web API (.NET 8)
- **Frontend:** React.js (Vite) with Tailwind CSS
- **Database:** SQL Server
- **ORM:** Entity Framework Core
- **Authentication:** JWT

## Project Structure

```
backend/
├── ScholarshipManagement.Domain/     # Entities, Constants
├── ScholarshipManagement.Application/ # Services, Interfaces
├── ScholarshipManagement.Infrastructure/ # DbContext, Implementations
└── ScholarshipManagement.API/        # Controllers, REST API

frontend/
├── src/
│   ├── api/          # API client
│   ├── components/   # Reusable components
│   ├── context/      # Auth context
│   └── pages/        # Student, Staff, Admin dashboards
```

## Setup

### Backend

1. Update connection string in `backend/ScholarshipManagement.API/appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=YOUR_SERVER;Database=ScholarshipManagement;..."
   }
   ```

2. Run migrations (if not using LocalDB):
   ```bash
   cd backend
   dotnet ef database update --project ScholarshipManagement.Infrastructure --startup-project ScholarshipManagement.API
   ```

3. Start API:
   ```bash
   cd backend
   dotnet run --project ScholarshipManagement.API
   ```
   API runs at http://localhost:5295 (or see launchSettings.json)

### Frontend

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Update API URL in `frontend/vite.config.js` if backend runs on different port.

3. Start frontend:
   ```bash
   npm run dev
   ```
   Frontend at http://localhost:3000

## Demo Credentials

| Role   | Username  | Password  |
|--------|-----------|-----------|
| Admin  | admin     | admin123  |
| Staff  | staff1    | staff123  |
| Student| student1  | student123|

## API Endpoints

### Auth
- `POST /api/auth/login` - Login

### Students
- `GET /api/students/dashboard` - Student dashboard (Student role)
- `GET /api/students` - List all students (Staff, Admin)
- `GET /api/students/{id}` - Get student (Staff, Admin)

### Attendance
- `POST /api/attendance` - Record attendance
- `PUT /api/attendance/{id}` - Update attendance
- `GET /api/attendance/student/{id}/monthly?year=&month=` - Monthly attendance
- `GET /api/attendance/report` - Attendance report

### Eligibility
- `GET /api/eligibility/student/{id}` - Check eligibility

### Discipline
- `POST /api/discipline` - Record discipline issue
- `GET /api/discipline/student/{id}` - Get discipline records

### Payments
- `GET /api/payments/eligible?month=` - Eligible students (Admin)
- `POST /api/payments/approve` - Approve payment
- `POST /api/payments/reject` - Reject payment

### Analytics
- `GET /api/analytics/dashboard` - Admin analytics

### Notifications
- `GET /api/notifications/student` - Student notifications

## Eligibility Rules

**Mahapola:** Family income ≤ 300,000 | GPA ≥ 2.0 | Attendance ≥ 80% | No discipline issues
**Bursary:** Family income ≤ 500,000 | Attendance ≥ 80% | No discipline issues

## Payment Amounts

- Mahapola: Rs 7,500/month × 10 months
- Bursary: Rs 6,500/month × 12 months
