#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env.docker"
EXAMPLE_FILE="$ROOT_DIR/.env.docker.example"
REBUILD=0
LOGS=0
SKIP_INSTALL=0
DOCKER_CMD=()
COMPOSE_CMD=()

usage() {
  cat <<'EOF'
LightTask Linux Docker deploy

Usage:
  ./deploy-docker.sh [--rebuild] [--logs] [--skip-install]

Options:
  --rebuild       Rebuild images before starting.
  --logs          Follow docker compose logs after startup.
  --skip-install  Do not try to install Docker automatically.
  -h, --help      Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rebuild)
      REBUILD=1
      shift
      ;;
    --logs)
      LOGS=1
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1" >&2
    return 1
  fi
}

run_as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "This step needs root privileges. Please install sudo or run as root." >&2
    return 1
  fi
}

install_docker() {
  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "Docker is not installed. Install Docker first or rerun without --skip-install." >&2
    exit 1
  fi

  require_command curl
  echo "Docker is not installed. Installing Docker Engine with the official script..."
  curl -fsSL https://get.docker.com -o /tmp/lighttask-get-docker.sh
  run_as_root sh /tmp/lighttask-get-docker.sh
}

setup_docker_cmd() {
  if ! command -v docker >/dev/null 2>&1; then
    install_docker
  fi

  if docker info >/dev/null 2>&1; then
    DOCKER_CMD=(docker)
  elif command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    DOCKER_CMD=(sudo docker)
  else
    echo "Docker is installed but not accessible. Start Docker or add the current user to the docker group." >&2
    exit 1
  fi

  if "${DOCKER_CMD[@]}" compose version >/dev/null 2>&1; then
    COMPOSE_CMD=("${DOCKER_CMD[@]}" compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  elif command -v sudo >/dev/null 2>&1 && sudo docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(sudo docker-compose)
  else
    echo "Docker Compose is not installed. Install docker-compose-plugin or docker-compose first." >&2
    if command -v apt-get >/dev/null 2>&1; then
      echo "Try: apt update && apt install -y docker-compose-plugin" >&2
      echo "Fallback: apt install -y docker-compose" >&2
    fi
    exit 1
  fi
}

install_openssl_if_missing() {
  if command -v openssl >/dev/null 2>&1; then
    return 0
  fi

  echo "OpenSSL is not installed. Installing openssl..."
  if command -v apt-get >/dev/null 2>&1; then
    run_as_root apt-get update
    run_as_root apt-get install -y openssl
  elif command -v dnf >/dev/null 2>&1; then
    run_as_root dnf install -y openssl
  elif command -v yum >/dev/null 2>&1; then
    run_as_root yum install -y openssl
  else
    echo "Cannot install openssl automatically on this distribution." >&2
    exit 1
  fi
}

random_base64() {
  openssl rand -base64 48
}

random_hex() {
  openssl rand -hex 24
}

env_value() {
  local key="$1"
  local fallback="$2"
  local value
  value="$(grep -E "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2- || true)"
  if [[ -z "$value" ]]; then
    printf '%s' "$fallback"
  else
    printf '%s' "$value"
  fi
}

cd "$ROOT_DIR"

setup_docker_cmd
install_openssl_if_missing

if [[ ! -f "$EXAMPLE_FILE" ]]; then
  echo "Missing $EXAMPLE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  sed -i \
    -e "s|please-change-postgres-password|$(random_hex)|g" \
    -e "s|please-change-this-to-a-random-string-longer-than-32-chars|$(random_base64)|g" \
    -e "s|please-change-this-too|$(random_base64)|g" \
    "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Generated .env.docker. Please update domain, Feishu and admin settings if needed."
fi

args=(--env-file .env.docker up -d)
if [[ "$REBUILD" -eq 1 ]]; then
  args+=(--build)
fi

echo "Starting LightTask Docker environment..."
"${COMPOSE_CMD[@]}" "${args[@]}"

web_port="$(env_value WEB_PORT 8080)"
api_port="$(env_value API_PORT 3000)"

cat <<EOF

Deployment complete:
  Web: http://localhost:${web_port}
  API: http://localhost:${api_port}/api/health/ready
  Initial account is configured in .env.docker:
    BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD
EOF

if [[ "$LOGS" -eq 1 ]]; then
  "${COMPOSE_CMD[@]}" --env-file .env.docker logs -f
fi
