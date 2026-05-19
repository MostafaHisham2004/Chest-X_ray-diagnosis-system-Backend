# Chest X-ray Diagnosis Backend

Node.js/Express backend for MediScan AI. It provides JWT authentication, role-based access control, X-ray history APIs, doctor verification, real-time patient-doctor chat, and administrator user management.

## Stack

- Express 5
- PostgreSQL
- Sequelize
- JWT authentication
- Server-Sent Events for real-time chat updates

## Setup

```powershell
cd "D:\Graduation project\gradproject-main\backend\Chest-X_ray-diagnosis-system-Backend\backend"
npm install
```

Create a PostgreSQL database and configure `.env`:

```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medical_imaging_db
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:3000
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
AI_SERVICE_URL=http://127.0.0.1:8000
```

Optional admin bootstrap:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!
```

Run the server:

```powershell
npm run dev
```

The API defaults to `http://localhost:5001`.

## Database Schema

Sequelize creates and syncs these tables:

- `Users`: email, password hash, role, timestamps.
- `Patients`: user profile, name, gender, date of birth, medical history.
- `Doctors`: user profile, specialization, certificate, verification status.
- `Xray_Images`: uploaded X-ray metadata.
- `Result_Images`: AI analysis image/result metadata.
- `Diagnosis_Reports`: doctor conclusions and notes.
- `Chat_Threads`: unique patient-doctor conversation pairs.
- `Chat_Messages`: stored chat messages with sender and timestamp.

## API Summary

- `POST /auth/signup`: patient registration.
- `POST /auth/login`: login for patient, doctor, or admin.
- `GET /auth/me`: current signed-in user.
- `GET /api/chat/contacts`: doctor or patient contacts for chat.
- `GET /api/chat/threads`: current user's chat threads.
- `POST /api/chat/threads`: create or reuse a patient-doctor thread.
- `GET /api/chat/threads/:id/messages`: message history.
- `POST /api/chat/threads/:id/messages`: send a message.
- `GET /api/chat/threads/:id/stream`: SSE live message stream.
- `GET /api/admin/users`: admin-only user list.
- `POST /api/admin/users`: admin-only create user.
- `PATCH /api/admin/users/:id`: admin-only edit user.
- `DELETE /api/admin/users/:id`: admin-only delete user.
- `GET /api/admin/activity`: admin-only activity summary.
- `GET /api/admin/doctors/pending`: pending doctor verification queue.
- `PATCH /api/admin/doctors/:id/verify`: approve or reject a doctor.

## Admin Access

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first startup to create an admin automatically, or promote an existing user:

```powershell
node scripts/set-admin.js user@example.com
```

## Deployment Notes

- Use HTTPS in production, especially for JWTs and chat traffic.
- Set a strong `JWT_SECRET` and a specific `CORS_ORIGIN`.
- Put uploads on persistent storage.
- Configure your reverse proxy to allow long-lived SSE connections for `/api/chat/*/stream`.
- Run database backups before changing schema or deploying migrations.
