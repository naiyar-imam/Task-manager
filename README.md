# AI-Powered Task Management Dashboard

A full-stack task platform now reworked into a true microservice architecture. The public app is served through a gateway, authentication is handled by a dedicated auth service, task CRUD and analytics live in a task service, and Google Calendar sync state lives in a separate calendar service.

## Architecture

- `gateway`
  - serves the React app
  - routes API traffic to backend services
- `auth-service`
  - registration
  - login
  - refresh
  - current user profile
  - owns the user database
- `task-service`
  - task CRUD
  - filters, search, sorting, pagination
  - dashboard stats
  - analytics and trend data
  - owns the task database
- `calendar-service`
  - Google OAuth
  - Google Calendar connection state
  - two-way sync by calling `task-service` over HTTP
  - owns the calendar integration database

This is no longer a monolith because the core domains are split into independently deployable services with separate databases.

## Project Structure

```text
frontend/                     # React source
gateway/                      # Nginx gateway + frontend static delivery
services/
  auth-service/               # User auth microservice
  task-service/               # Task CRUD + analytics microservice
  calendar-service/           # Google Calendar integration microservice
docker-compose.yml
backend/                      # Legacy monolith reference, no longer the default runtime
```

## Run With Docker

This is the recommended local setup for the microservice version.

1. Start the full stack:

```powershell
cd C:\Users\DELL\Desktop\Task-Manager
docker compose up --build
```

2. Open the app:

- App: [http://127.0.0.1:8080](http://127.0.0.1:8080)

3. Seed the demo auth user:

```powershell
docker compose exec auth-service python manage.py seed_demo_user
```

This prints the user id for the demo account.

4. Seed the demo tasks into `task-service` using that user id:

```powershell
docker compose exec task-service python manage.py seed_demo_tasks --user-id 1 --wipe
```

If the auth-service command prints a different id, replace `1` with that id.

5. Login with:

```text
Username: nehasharma
Password: Demo@12345
```

## Service Ports

- Gateway app: `8080`
- Auth database: `5433`
- Task database: `5434`
- Calendar database: `5435`

The backend service containers are intentionally private behind the gateway in the default Docker setup.

## Google Calendar Setup

Set these values before starting Docker, or add them to your shell environment:

```powershell
$env:GOOGLE_CLIENT_ID="your_client_id"
$env:GOOGLE_CLIENT_SECRET="your_client_secret"
$env:GOOGLE_CALENDAR_REDIRECT_URI="http://127.0.0.1:8080/api/integrations/google/callback/"
$env:GOOGLE_CALENDAR_ID="primary"
```

Then run:

```powershell
docker compose up --build
```

In Google Cloud Console, add this authorized redirect URI exactly:

```text
http://127.0.0.1:8080/api/integrations/google/callback/
```

The configuration now belongs to `calendar-service`, not the old monolith backend.

## How The Frontend Talks To Services

The React app uses a single same-origin base path:

- `/api/auth/*` -> `auth-service`
- `/api/tasks/*` -> `task-service`
- `/api/stats/*` -> `task-service`
- `/api/analytics/*` -> `task-service`
- `/api/integrations/google/*` -> `calendar-service`

That routing is handled by [gateway/nginx.conf](C:/Users/DELL/Desktop/Task-Manager/gateway/nginx.conf).

## Viewing The Databases

You now have separate databases per service.

### Auth Database

- Host: `127.0.0.1`
- Port: `5433`
- Database: `auth_service`
- Username: `postgres`
- Password: `0000`

### Task Database

- Host: `127.0.0.1`
- Port: `5434`
- Database: `task_service`
- Username: `postgres`
- Password: `0000`

### Calendar Database

- Host: `127.0.0.1`
- Port: `5435`
- Database: `calendar_service`
- Username: `postgres`
- Password: `0000`

### Example DBeaver / pgAdmin tables

`auth_service`:
- `auth_user`

`task_service`:
- `tasks_task`

`calendar_service`:
- `calendar_integration_googlecalendarconnection`

## Key Files

- Gateway: [gateway/nginx.conf](C:/Users/DELL/Desktop/Task-Manager/gateway/nginx.conf)
- Auth API: [services/auth-service/accounts/views.py](C:/Users/DELL/Desktop/Task-Manager/services/auth-service/accounts/views.py)
- Task API: [services/task-service/tasks/views.py](C:/Users/DELL/Desktop/Task-Manager/services/task-service/tasks/views.py)
- Calendar API: [services/calendar-service/calendar_integration/views.py](C:/Users/DELL/Desktop/Task-Manager/services/calendar-service/calendar_integration/views.py)
- Calendar sync logic: [services/calendar-service/calendar_integration/google_calendar.py](C:/Users/DELL/Desktop/Task-Manager/services/calendar-service/calendar_integration/google_calendar.py)
- Compose stack: [docker-compose.yml](C:/Users/DELL/Desktop/Task-Manager/docker-compose.yml)

## Notes

- The legacy [backend](C:/Users/DELL/Desktop/Task-Manager/backend) folder is no longer the default runtime path for the app.
- The microservice version is Docker-first for local development because it is the simplest way to run the service graph together.
- Google sync is now service-to-service: `calendar-service` talks to `task-service` over HTTP instead of importing the task model directly.


##################################################
k8 running and stopping  command 
##################################################
🛑 STOP YOUR APPLICATION (Kubernetes way)
✅ Option 1 — Delete everything (clean stop)
kubectl delete -k C:\Users\DELL\Desktop\Task-Manager\k8s

👉 This removes:

pods
services
deployments
everything in your setup

✔ Clean shutdown

✅ Option 2 — Scale to zero (best practice)
kubectl scale deployment auth-service --replicas=0 -n task-manager
kubectl scale deployment task-service --replicas=0 -n task-manager
kubectl scale deployment calendar-service --replicas=0 -n task-manager
kubectl scale deployment gateway --replicas=0 -n task-manager

👉 This:

stops all containers
keeps configuration intact

✔ Preferred in real systems

🔁 RESTART YOUR APPLICATION
✅ Option 1 — Scale back up
kubectl scale deployment auth-service --replicas=1 -n task-manager
kubectl scale deployment task-service --replicas=1 -n task-manager
kubectl scale deployment calendar-service --replicas=1 -n task-manager
kubectl scale deployment gateway --replicas=1 -n task-manager
✅ Option 2 — Restart pods (most common)
kubectl rollout restart deployment auth-service -n task-manager
kubectl rollout restart deployment task-service -n task-manager
kubectl rollout restart deployment calendar-service -n task-manager
kubectl rollout restart deployment gateway -n task-manager

👉 This recreates pods cleanly

✅ Option 3 — Delete pods (quick & dirty)
kubectl delete pod -n task-manager --all

👉 Kubernetes auto-creates new ones

🔍 CHECK STATUS
kubectl get pods -n task-manager
⚠️ If you want to STOP Kubernetes completely

Since you're using Rancher Desktop:

👉 Just turn off Kubernetes from Rancher Desktop UI

💀 Brutal Truth

If you think:

“stop container = docker stop”
  
###############################################################################
how to setup the project in you local first of all clone this repo in your local and then build the  image here are the command to build the image in the local terminal or powerShell first go to project folder.

cd C:\Users\DELL\Desktop\Task-Manager
docker build -t task-manager-auth-service:local -f services/auth-service/Dockerfile .
docker build -t task-manager-task-service:local -f services/task-service/Dockerfile .
docker build -t task-manager-calendar-service:local -f services/calendar-service/Dockerfile .
docker build -t task-manager-gateway:local -f gateway/Dockerfile .



after builder the image then run the below command to activate the image in containers

kubectl apply -k C:\Users\DELL\Desktop\Task-Manager\k8s


after the open the port for publically access below the command 

kubectl port-forward -n task-manager svc/gateway 8080:80

 thats it and already i wiil share the command how to stop the running container