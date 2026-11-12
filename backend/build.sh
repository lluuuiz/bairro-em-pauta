#!/usr/bin/env bash
set -o errexit
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py makemigrations core --noinput
python manage.py migrate --noinput
# SEED=1 cria dados de exemplo (só na primeira vez; ignora se já houver relatos)
if [ "${SEED:-0}" = "1" ]; then python manage.py seed; fi
