#!/bin/sh
set -eu

echo "[lighttask] syncing database schema"
npx prisma db push --skip-generate

if [ "${BOOTSTRAP_ADMIN:-true}" = "true" ]; then
  echo "[lighttask] checking bootstrap admin"
  node deploy/api/bootstrap-admin.mjs
fi

echo "[lighttask] starting api"
exec node apps/api/dist/main.js
