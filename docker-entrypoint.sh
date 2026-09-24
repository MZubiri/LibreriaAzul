#!/bin/sh
set -eu

mkdir -p "${DATA_DIR:-/data}"
chown -R app:app "${DATA_DIR:-/data}"

SECRET_FILE="${DATA_DIR:-/data}/.session-secret"

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  ADMIN_PASSWORD='LibreriaAzul2026!'
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
