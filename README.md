# AI-Powered Task Management Dashboard

A local-first full-stack task and productivity platform with Django REST Framework, JWT authentication, React, Tailwind CSS, Chart.js analytics, and PostgreSQL-ready backend configuration.

## Features

- JWT registration, login, refresh, and profile session restore
- User-isolated task CRUD with title, description, status, priority, due date, and timestamps
- Dashboard cards powered by backend aggregation
- Task tabs for All, Today, Upcoming, and Completed
- Filtering, search, sorting, and pagination
- Analytics with status distribution, productivity trends, overdue tracking, and recent activity
- Dark SaaS-style responsive UI with modal-based task creation and editing
- Google Calendar OAuth connection with two-way task and calendar sync
- Demo seed command with a polished portfolio-ready dataset

## Project Structure

```text
backend/
frontend/
README.md
docker-compose.yml
```

## Backend Run (Local)

1. Install Python 3.11+.
2. Move into the backend folder:

```bash
cd backend
```

3. Create and activate a virtual environment:

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
```

If you already created it earlier, just run:

```bash
.venv\Scripts\Activate.ps1
```

4. Install dependencies:

```bash
pip install -r requirements.txt
```

5. Copy environment values:

```bash
Copy-Item .env.example .env
```

Recommended PostgreSQL values in `.env`:

```env
POSTGRES_DB=task_dashboard
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
```

If you prefer a single URL instead, you can use:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/task_dashboard
```

Optional Google Calendar setup:

- Set `FRONTEND_BASE_URL=http://127.0.0.1:5173`
- Set `GOOGLE_CLIENT_ID=<your-google-client-id>`
- Set `GOOGLE_CLIENT_SECRET=<your-google-client-secret>`
- Set `GOOGLE_CALENDAR_REDIRECT_URI=http://127.0.0.1:8001/api/integrations/google/callback/`
- Keep `GOOGLE_CALENDAR_ID=primary` unless you want a different calendar target
- For the cleanest two-way sync, point `GOOGLE_CALENDAR_ID` to a dedicated Google calendar instead of your main personal calendar

6. Run migrations:

```bash
python manage.py migrate
```

7. Seed the demo user and portfolio dataset:

```bash
python manage.py seed_demo_data --wipe
```

Demo credentials:

- Username: `nehasharma`
- Password: `Demo@12345`

8. Start the Django API:

```bash
python manage.py runserver 127.0.0.1:8001
```

Backend base URL: `http://127.0.0.1:8001/api`
Default database behavior:

- PostgreSQL if `DATABASE_URL` or `POSTGRES_*` values are present
- SQLite fallback via `backend/db.sqlite3` if PostgreSQL is not configured

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api
```

## Frontend Run (Local)

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Copy environment values:

```bash
Copy-Item .env.example .env
```

3. Start the React development server:

```bash
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

## Docker Run

1. Build and start the full stack:

```bash
docker-compose up --build
```

2. Open the app:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8001/api`
- Backend health check: `http://127.0.0.1:8001/api/health/`

3. Seed demo data inside Docker if you want a fresh dataset:

```bash
docker-compose exec backend python manage.py seed_demo_data --wipe
```

Docker services included:

- `db`: PostgreSQL 16
- `backend`: Django API on port `8001`
- `frontend`: Nginx serving the built React app on port `5173`

Notes:

- The Docker backend auto-seeds the portfolio demo user on startup
- Demo login: `nehasharma` / `Demo@12345`

## PostgreSQL Setup

1. Install PostgreSQL and pgAdmin.
2. Create a database named `task_dashboard`.
3. Update `backend/.env` with either `POSTGRES_*` values or a `DATABASE_URL`.
4. Run backend migrations:

```bash
cd backend
.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py seed_demo_data --wipe
python manage.py runserver 127.0.0.1:8001
```

## How To View The Database

### Option 1: pgAdmin

1. Open pgAdmin.
2. Register or open your local PostgreSQL server.
3. Use:
   - Host: `127.0.0.1`
   - Port: `5432`
   - Username: `postgres`
   - Password: your PostgreSQL password
4. Open:
   - `Servers`
   - `PostgreSQL`
   - `Databases`
   - `task_dashboard`
   - `Schemas`
   - `public`
   - `Tables`

Main tables to inspect:

- `tasks_task`
- `tasks_googlecalendarconnection`
- `auth_user`

### Option 2: psql

```bash
psql -U postgres -h 127.0.0.1 -d task_dashboard
```

Useful commands:

```sql
\dt
SELECT * FROM auth_user;
SELECT * FROM tasks_task;
SELECT * FROM tasks_googlecalendarconnection;
```

### Option 3: Django Admin

Create an admin user:

```bash
cd backend
.venv\Scripts\Activate.ps1
python manage.py createsuperuser
```

Then open:

- `http://127.0.0.1:8001/admin/`

## Google Calendar Setup

1. In Google Cloud Console, create or choose a project.
2. Enable the Google Calendar API.
3. Configure the OAuth consent screen.
4. Create an OAuth Client ID for a Web application.
5. Add an authorized redirect URI:

```text
http://127.0.0.1:8001/api/integrations/google/callback/
```

6. Put the client ID and client secret into `backend/.env`.
7. Start backend and frontend, then open `Settings` and click `Connect Google Calendar`.

The app uses the `https://www.googleapis.com/auth/calendar.events` scope so it can create, update, and import calendar events for task due dates.

After you connect:

- `Run Two-Way Sync` pulls new and edited Google Calendar events into the task app
- The same sync also pushes local task changes back to Google Calendar
- If a synced Google event is deleted, the linked local task is removed during the next sync

## API Endpoints

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `GET /api/auth/me/`
- `GET /api/tasks/`
- `POST /api/tasks/`
- `PUT /api/tasks/{id}/`
- `DELETE /api/tasks/{id}/`
- `GET /api/stats/`
- `GET /api/analytics/?days=7`
- `GET /api/integrations/google/authorize/`
- `GET /api/integrations/google/callback/`
- `GET /api/integrations/google/status/`
- `POST /api/integrations/google/sync/`
- `DELETE /api/integrations/google/disconnect/`

## Query Parameters

### Task listing

- `tab=all|today|upcoming|completed|overdue`
- `status=pending|in_progress|completed`
- `priority=low|medium|high`
- `search=<term>`
- `ordering=due_date|-due_date|created_at|-created_at|title|-title|priority|-priority|status`
- `page=<number>`
- `page_size=<number>`
