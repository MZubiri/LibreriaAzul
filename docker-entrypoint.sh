#!/bin/sh
set -eu

mkdir -p "${DATA_DIR:-/data}"
chown -R app:app "${DATA_DIR:-/data}"

ADMIN_FILE="${DATA_DIR:-/data}/.admin-password"
SECRET_FILE="${DATA_DIR:-/data}/.session-secret"

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  if [ -s "$ADMIN_FILE" ]; then
    ADMIN_PASSWORD="$(cat "$ADMIN_FILE")"
  else
    ADMIN_PASSWORD="$(head -c 18 /dev/urandom | base64 | tr -d '\n=')"
    printf '%s' "$ADMIN_PASSWORD" > "$ADMIN_FILE"
    chmod 600 "$ADMIN_FILE"
    chown app:app "$ADMIN_FILE"
    printf '\n========================================================\n'
    printf ' LIBRERIA AZUL - CONTRASENA INICIAL DEL PANEL\n %s\n' "$ADMIN_PASSWORD"
    printf ' Guardala ahora. Panel: /admin\n'
    printf '========================================================\n\n'
  fi
fi

if [ -z "${SESSION_SECRET:-}" ]; then
  if [ -s "$SECRET_FILE" ]; then
    SESSION_SECRET="$(cat "$SECRET_FILE")"
  else
    SESSION_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '\n=')"
    printf '%s' "$SESSION_SECRET" > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"
    chown app:app "$SECRET_FILE"
  fi
fi

export ADMIN_PASSWORD SESSION_SECRET
exec su-exec app "$@"
