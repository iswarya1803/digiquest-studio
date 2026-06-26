# DigiQuest Delivery Tracker – API Documentation

All API endpoints require JSON format. Authenticated routes require an `Authorization` header containing the JWT token:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Routes

### POST `/api/auth/signup`
Creates a new client or admin account.
- **Request Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@company.com",
    "password": "securepassword123",
    "role": "client"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "User created successfully"
  }
  ```

### POST `/api/auth/login`
Authenticates a user and returns a token.
- **Request Body:**
  ```json
  {
    "email": "jane@company.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 2,
      "email": "jane@company.com",
      "role": "client",
      "fullName": "Jane Doe"
    }
  }
  ```

---

## 2. Projects & Checklist Routes

### GET `/api/projects`
Retrieves all projects. Admins see all projects; clients only see projects assigned to them.
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "title": "Quantum Odyssey Trailer",
      "client_id": 2,
      "status": "In Progress",
      "priority": "High",
      "deadline": "2026-06-30T00:00:00.000Z",
      "completion_rate": 65
    }
  ]
  ```

### POST `/api/projects` (Admin Only)
Creates a new project.
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
  ```json
  {
    "title": "Neon Dreams Short Film",
    "client_id": 2,
    "priority": "Medium",
    "deadline": "2026-08-15"
  }
  ```

---

## 3. Revisions & Approvals Routes

### POST `/api/projects/:projectId/revisions`
Submits a change or revision request for a specific project.
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
  ```json
  {
    "version_id": 1,
    "category": "Color Grading",
    "comment": "Shadows look too heavy on shot 3.",
    "screenshot_data": "data:image/png;base64,..."
  }
  ```

### POST `/api/projects/:projectId/approve`
Approves and digitally signs off a project version.
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
  ```json
  {
    "version_id": 1,
    "signed_by": "Jane Doe",
    "signature_svg": "data:image/png;base64,...",
    "status": "Approved",
    "feedback": "Perfect job, thanks!"
  }
  ```

---

## 4. Reports & Downloads

### GET `/api/reports/projects`
Generates a PDF report containing a breakdown of all projects.
- **Response:** File download (`projects_report.pdf`).

### GET `/api/reports/projects/excel`
Generates an Excel spreadsheet tracking project statuses.
- **Response:** File download (`projects_report.xlsx`).
