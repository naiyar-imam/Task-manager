#!/bin/sh
set -e

python manage.py migrate

if [ "${SEED_DEMO_USER:-false}" = "true" ]; then
  python manage.py seed_demo_user
fi

python manage.py runserver 0.0.0.0:8000
