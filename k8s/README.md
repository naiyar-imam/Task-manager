# Kubernetes Setup

These manifests run the microservice version of the project inside a Kubernetes cluster with:

- one namespace: `task-manager`
- one deployment/service per backend
- one deployment/service for the gateway
- one PostgreSQL deployment + PVC per service-owned database

## Files

- [namespace.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/namespace.yaml): namespace
- [secret.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/secret.yaml): passwords, JWT signing key, Django secrets, Google credentials
- [configmap.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/configmap.yaml): non-secret environment values
- [databases.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/databases.yaml): auth/task/calendar PostgreSQL deployments, services, PVCs
- [auth-service.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/auth-service.yaml): auth-service deployment and service
- [task-service.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/task-service.yaml): task-service deployment and service
- [calendar-service.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/calendar-service.yaml): calendar-service deployment and service
- [gateway.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/gateway.yaml): frontend gateway deployment and service
- [kustomization.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/kustomization.yaml): apply everything together

## 1. Build Local Images

Build the images first:

```powershell
cd C:\Users\DELL\Desktop\Task-Manager
docker build -t task-manager-auth-service:local -f services/auth-service/Dockerfile .
docker build -t task-manager-task-service:local -f services/task-service/Dockerfile .
docker build -t task-manager-calendar-service:local -f services/calendar-service/Dockerfile .
docker build -t task-manager-gateway:local -f gateway/Dockerfile .
```

## 2. Make Images Available To Your Cluster

Use the command that matches your local Kubernetes environment:

### Docker Desktop Kubernetes

If your cluster uses the same Docker daemon, you usually do not need an extra load step.

### Kind

```powershell
kind load docker-image task-manager-auth-service:local
kind load docker-image task-manager-task-service:local
kind load docker-image task-manager-calendar-service:local
kind load docker-image task-manager-gateway:local
```

### Minikube

```powershell
minikube image load task-manager-auth-service:local
minikube image load task-manager-task-service:local
minikube image load task-manager-calendar-service:local
minikube image load task-manager-gateway:local
```

## 3. Optional: Add Google Credentials

Edit [secret.yaml](C:/Users/DELL/Desktop/Task-Manager/k8s/secret.yaml) before applying if you want Google Calendar:

- `google-client-id`
- `google-client-secret`
- `google-calendar-id`

If you do not set them, the app still runs. Google Calendar will just show as not configured.

## 4. Apply The Stack

```powershell
kubectl apply -k C:\Users\DELL\Desktop\Task-Manager\k8s
```

Check status:

```powershell
kubectl get pods -n task-manager
kubectl get svc -n task-manager
```

## 5. Open The App

Port-forward the gateway service:

```powershell
kubectl port-forward -n task-manager svc/gateway 8080:80
```

Then open:

[http://127.0.0.1:8080](http://127.0.0.1:8080)

## 6. Seed Demo Data

The auth deployment already creates the demo user on startup because `SEED_DEMO_USER=true`.

To print the current demo user id:

```powershell
kubectl exec -n task-manager deploy/auth-service -- python manage.py seed_demo_user
```

Then seed tasks for that user:

```powershell
kubectl exec -n task-manager deploy/task-service -- python manage.py seed_demo_tasks --user-id 1 --wipe
```

If the auth command prints a different user id, use that instead of `1`.

Demo login:

```text
Username: nehasharma
Password: Demo@12345
```

## 7. View Individual Databases

Port-forward each Postgres service if you want to inspect it from DBeaver or pgAdmin.

### Auth DB

```powershell
kubectl port-forward -n task-manager svc/auth-db 5433:5432
```

- Host: `127.0.0.1`
- Port: `5433`
- Database: `auth_service`
- Username: `postgres`
- Password: `0000`

### Task DB

```powershell
kubectl port-forward -n task-manager svc/task-db 5434:5432
```

- Host: `127.0.0.1`
- Port: `5434`
- Database: `task_service`
- Username: `postgres`
- Password: `0000`

### Calendar DB

```powershell
kubectl port-forward -n task-manager svc/calendar-db 5435:5432
```

- Host: `127.0.0.1`
- Port: `5435`
- Database: `calendar_service`
- Username: `postgres`
- Password: `0000`

## Why The Manifests Are Structured This Way

- Separate Postgres instances make the service-owned database boundary explicit.
- The gateway remains the single public entrypoint, just like in Docker.
- `initContainers` wait for the dependent database or service so the app containers do not start too early.
- The gateway service is `ClusterIP` because `kubectl port-forward` works in any local control-plane environment without requiring an ingress controller.
