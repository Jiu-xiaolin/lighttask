#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.docker"
EXAMPLE_FILE="$ROOT_DIR/.env.docker.example"
PUBLIC_URL="${1:-}"

usage() {
  cat <<'EOF'
Configure LightTask public URL for Docker deployment.

Usage:
  ./scripts/configure-public-url.sh http://your-server-ip:8080

The script updates .env.docker:
  CORS_ORIGINS=<public-url>
  PUBLIC_BASE_URL=<public-url>

Then it recreates api and web containers so updated environment variables take effect.
EOF
}

if [[ -z "$PUBLIC_URL" || "$PUBLIC_URL" == "-h" || "$PUBLIC_URL" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! "$PUBLIC_URL" =~ ^https?://[^[:space:]]+$ ]]; then
  echo "Invalid public URL: $PUBLIC_URL" >&2
  echo "Expected: http://host:port or https://domain" >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ ! -f "$EXAMPLE_FILE" ]]; then
    echo "Missing $EXAMPLE_FILE" >&2
    exit 1
  fi
  cp "$EXAMPLE_FILE" "$ENV_FILE"
fi

set_env() {
  local key="$1"
  local value="$2"
  local escaped
  escaped="$(printf '%s' "$value" | sed 's/[&|\\]/\\&/g')"

  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

set_env "CORS_ORIGINS" "$PUBLIC_URL"
set_env "PUBLIC_BASE_URL" "$PUBLIC_URL"

echo "Updated $ENV_FILE:"
grep -E '^(CORS_ORIGINS|PUBLIC_BASE_URL)=' "$ENV_FILE"

if docker compose version >/dev/null 2>&1; then
  docker compose --env-file .env.docker up -d --force-recreate api web
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose --env-file .env.docker up -d --force-recreate api web
else
  echo "Docker Compose not found. Restart manually after installing Compose." >&2
  exit 0
fi

echo "Recreated api and web. Visit: $PUBLIC_URL"
