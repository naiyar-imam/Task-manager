#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="${NAMESPACE:-warfield-task-manager-prod}"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)}"

if [[ -z "${AWS_REGION}" ]]; then
  echo "AWS region not found. Set AWS_REGION or configure AWS CLI first." >&2
  exit 1
fi

if [[ -z "${AWS_ACCOUNT_ID}" ]]; then
  echo "AWS account id not found. Set AWS_ACCOUNT_ID or configure AWS CLI first." >&2
  exit 1
fi

ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Using namespace: ${NAMESPACE}"
echo "Using AWS region: ${AWS_REGION}"
echo "Using AWS account: ${AWS_ACCOUNT_ID}"

cd "${ROOT_DIR}"

for repo in \
  task-manager-auth-service \
  task-manager-task-service \
  task-manager-calendar-service \
  task-manager-gateway
do
  aws ecr describe-repositories --repository-names "${repo}" --region "${AWS_REGION}" >/dev/null 2>&1 || \
    aws ecr create-repository --repository-name "${repo}" --region "${AWS_REGION}" >/dev/null
done

aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_BASE}"

docker build -t task-manager-auth-service:prod -f services/auth-service/Dockerfile .
docker build -t task-manager-task-service:prod -f services/task-service/Dockerfile .
docker build -t task-manager-calendar-service:prod -f services/calendar-service/Dockerfile .
docker build -t task-manager-gateway:prod -f gateway/Dockerfile .

docker tag task-manager-auth-service:prod "${ECR_BASE}/task-manager-auth-service:prod"
docker tag task-manager-task-service:prod "${ECR_BASE}/task-manager-task-service:prod"
docker tag task-manager-calendar-service:prod "${ECR_BASE}/task-manager-calendar-service:prod"
docker tag task-manager-gateway:prod "${ECR_BASE}/task-manager-gateway:prod"

docker push "${ECR_BASE}/task-manager-auth-service:prod"
docker push "${ECR_BASE}/task-manager-task-service:prod"
docker push "${ECR_BASE}/task-manager-calendar-service:prod"
docker push "${ECR_BASE}/task-manager-gateway:prod"

cp k8s/eks/secret.example.yaml k8s/eks/secret.yaml

sed -i \
  -e "s|warfield-task-manager-prod|${NAMESPACE}|g" \
  -e "s|<aws-account-id>|${AWS_ACCOUNT_ID}|g" \
  -e "s|<aws-region>|${AWS_REGION}|g" \
  k8s/eks/kustomization.yaml \
  k8s/eks/jobs/kustomization.yaml \
  k8s/eks/namespace.yaml \
  k8s/eks/secret.yaml \
  k8s/eks/subdomain-ingress.example.yaml \
  k8s/eks/configmap.yaml \
  k8s/eks/README.md

kubectl apply -f k8s/eks/namespace.yaml
kubectl apply -f k8s/eks/configmap.yaml
kubectl apply -f k8s/eks/secret.yaml

kubectl apply -k k8s/eks/jobs
kubectl wait --for=condition=complete -n "${NAMESPACE}" job/auth-service-migrate --timeout=300s
kubectl wait --for=condition=complete -n "${NAMESPACE}" job/task-service-migrate --timeout=300s
kubectl wait --for=condition=complete -n "${NAMESPACE}" job/calendar-service-migrate --timeout=300s

kubectl apply -k k8s/eks

kubectl rollout status deployment/auth-service -n "${NAMESPACE}" --timeout=300s
kubectl rollout status deployment/task-service -n "${NAMESPACE}" --timeout=300s
kubectl rollout status deployment/calendar-service -n "${NAMESPACE}" --timeout=300s
kubectl rollout status deployment/gateway -n "${NAMESPACE}" --timeout=300s

ALB_HOSTNAME="$(kubectl get ingress task-manager-gateway -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"

echo ""
echo "Deployment complete."
echo "Namespace: ${NAMESPACE}"
echo "ALB hostname: ${ALB_HOSTNAME}"
echo ""
echo "Google Calendar is intentionally disabled until you later set:"
echo "  FRONTEND_BASE_URL"
echo "  GOOGLE_CALENDAR_REDIRECT_URI"
echo "to your final public hostname."
