#!/bin/sh
set -e

python manage.py migrate

if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
  python manage.py seed_demo_data
fi

python manage.py runserver 0.0.0.0:8001
