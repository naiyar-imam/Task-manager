# AI-Powered Task Management Dashboard

This repository contains the microservice version of the project.

## Services

- `gateway`
  - serves the React frontend
  - proxies API traffic to backend services
- `services/auth-service`
  - registration
  - JWT login and refresh
  - current user profile
- `services/task-service`
  - task CRUD
  - filters, tabs, pagination, search, sorting
  - stats and analytics
- `services/calendar-service`
  - Google OAuth
  - Google Calendar sync state
  - service-to-service sync with `task-service`

## Local Docker Run

From the repository root:

```bash
docker compose up --build
```

Open:

- App: [http://127.0.0.1:8080](http://127.0.0.1:8080)

## Demo Data

```bash
docker compose exec auth-service python manage.py seed_demo_user
docker compose exec task-service python manage.py seed_demo_tasks --user-id 1 --wipe
```

Demo login:

```text
Username: nehasharma
Password: Demo@12345
```

## Kubernetes Paths

- `k8s`
  - local cluster manifests for Rancher Desktop, Docker Desktop, kind, or minikube
- `k8s/eks`
  - production-oriented EKS manifests
  - external PostgreSQL expected
  - ALB ingress
  - migration jobs

If you are deploying to EKS, start with `k8s/eks/README.md`.
