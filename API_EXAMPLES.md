# Example API Calls

Base URL: `http://localhost:5295/api`

## 1. Login

```bash
curl -X POST http://localhost:5295/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"student123"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "student1",
  "role": "Student",
  "studentId": 1,
  "userId": 3
}
```

## 2. Student Dashboard (requires Bearer token)

```bash
curl -X GET http://localhost:5295/api/students/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 3. Record Attendance (Staff/Admin)

```bash
curl -X POST http://localhost:5295/api/attendance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId":1,"date":"2025-03-14T00:00:00Z","status":"Present"}'
```

## 4. Check Eligibility

```bash
curl -X GET http://localhost:5295/api/eligibility/student/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 5. Get Eligible Students for Payment (Admin)

```bash
curl -X GET "http://localhost:5295/api/payments/eligible?month=2025-03" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 6. Approve Payment (Admin)

```bash
curl -X POST http://localhost:5295/api/payments/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId":1,"month":"2025-03","scholarshipType":"Mahapola"}'
```
