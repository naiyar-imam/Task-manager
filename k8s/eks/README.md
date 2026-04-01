# EKS Production Deployment

This directory is the production deployment path for Amazon EKS. It is separate from the root `k8s` directory, which is still the local-cluster setup.

## Production Behavior

- Django services run with `gunicorn`
- backend services default to `DEBUG=False`
- the gateway exposes `/healthz`
- external PostgreSQL is expected
- migrations run as one-off Kubernetes `Job` resources
- Google Calendar stays effectively disabled until you set a real public URL

## Before You Deploy

Edit these files after cloning the repo on the server:

1. `k8s/eks/kustomization.yaml`
2. `k8s/eks/jobs/kustomization.yaml`
3. `k8s/eks/configmap.yaml`
4. copy `k8s/eks/secret.example.yaml` to `k8s/eks/secret.yaml`

Fill in:

- real ECR image names
- real namespace if you want a custom one
- real database URLs
- real Django secret keys
- real JWT signing key
- real Google credentials if you want Calendar integration
- real public app URL after ALB or DNS is ready

## Important Path And URL Notes

- all Docker build commands below are run from the repository root
- all Kubernetes commands use repo-relative paths
- there are no runtime references to your old Windows local path
- the calendar service no longer falls back to `127.0.0.1` for public redirect URLs

## Build And Push Images

```bash
aws ecr get-login-password --region <aws-region> | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com

docker build -t task-manager-auth-service:prod -f services/auth-service/Dockerfile .
docker build -t task-manager-task-service:prod -f services/task-service/Dockerfile .
docker build -t task-manager-calendar-service:prod -f services/calendar-service/Dockerfile .
docker build -t task-manager-gateway:prod -f gateway/Dockerfile .

docker tag task-manager-auth-service:prod <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/task-manager-auth-service:prod
docker tag task-manager-task-service:prod <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/task-manager-task-service:prod
docker tag task-manager-calendar-service:prod <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/task-manager-calendar-service:prod
docker tag task-manager-gateway:prod <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/task-manager-gateway:prod

docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/task-manager-auth-service:prod
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/task-manager-task-service:prod
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/task-manager-calendar-service:prod
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/task-manager-gateway:prod
```

## Deploy Order

```bash
kubectl apply -f k8s/eks/namespace.yaml
kubectl apply -f k8s/eks/configmap.yaml
kubectl apply -f k8s/eks/secret.yaml

kubectl apply -k k8s/eks/jobs
kubectl wait --for=condition=complete -n warfield-task-manager job/auth-service-migrate --timeout=180s
kubectl wait --for=condition=complete -n warfield-task-manager job/task-service-migrate --timeout=180s
kubectl wait --for=condition=complete -n warfield-task-manager job/calendar-service-migrate --timeout=180s

kubectl apply -k k8s/eks
kubectl get pods -n warfield-task-manager
kubectl get ingress -n warfield-task-manager
```

If you change the namespace, update it in:

- `k8s/eks/kustomization.yaml`
- `k8s/eks/jobs/kustomization.yaml`
- `k8s/eks/namespace.yaml`
- `k8s/eks/secret.yaml`
- `k8s/eks/subdomain-ingress.example.yaml`

## Get The First Public URL

```bash
kubectl get ingress task-manager-gateway -n warfield-task-manager -o jsonpath="{.status.loadBalancer.ingress[0].hostname}"
```

Use that ALB hostname for first testing.

## Google Calendar In Production

Do not enable Google Calendar until you have a stable public URL.

Then update:

- `FRONTEND_BASE_URL`
- `GOOGLE_CALENDAR_REDIRECT_URI`

in `k8s/eks/configmap.yaml`, and also update the same redirect URI in Google Cloud Console.
