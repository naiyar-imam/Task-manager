FROM node:20-alpine AS frontend-builder

WORKDIR /workspace/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./
COPY --from=frontend-builder /workspace/backend/frontend_build /app/frontend_build
RUN chmod +x entrypoint.sh

EXPOSE 8001

CMD ["./entrypoint.sh"]
