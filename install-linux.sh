#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${LIGHTTASK_REPO:-https://github.com/Jiu-xiaolin/lighttask.git}"
BRANCH="${LIGHTTASK_BRANCH:-main}"
INSTALL_DIR="${LIGHTTASK_DIR:-/opt/lighttask}"
DEPLOY_ARGS=("--rebuild")

usage() {
  cat <<'EOF'
LightTask GitHub pull and deploy

Usage:
  ./install-linux.sh [--dir /opt/lighttask] [--branch main] [--repo URL] [--logs] [--skip-install]

Environment:
  LIGHTTASK_DIR     Install directory. Default: /opt/lighttask
  LIGHTTASK_BRANCH  Git branch to deploy. Default: main
  LIGHTTASK_REPO    Git repository URL.

Options:
  --dir PATH        Override install directory.
  --branch NAME     Override branch.
  --repo URL        Override repository URL.
  --logs            Follow Docker logs after startup.
  --skip-install    Do not auto-install Docker in the deploy step.
  -h, --help        Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      INSTALL_DIR="${2:?Missing value for --dir}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:?Missing value for --branch}"
      shift 2
      ;;
    --repo)
      REPO_URL="${2:?Missing value for --repo}"
      shift 2
      ;;
    --logs)
      DEPLOY_ARGS+=("--logs")
      shift
      ;;
    --skip-install)
      DEPLOY_ARGS+=("--skip-install")
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

install_git_if_missing() {
  if command -v git >/dev/null 2>&1; then
    return 0
  fi

  echo "Git is not installed. Installing git..."
  if command -v apt-get >/dev/null 2>&1; then
    run_as_root apt-get update
    run_as_root apt-get install -y git
  elif command -v dnf >/dev/null 2>&1; then
    run_as_root dnf install -y git
  elif command -v yum >/dev/null 2>&1; then
    run_as_root yum install -y git
  else
    echo "Cannot install git automatically on this distribution." >&2
    exit 1
  fi
}

ensure_parent_dir() {
  local parent
  parent="$(dirname "$INSTALL_DIR")"
  if [[ -d "$parent" && -w "$parent" ]]; then
    return 0
  fi
  run_as_root mkdir -p "$INSTALL_DIR"
  if [[ "$(id -u)" -ne 0 ]]; then
    run_as_root chown "$(id -u):$(id -g)" "$INSTALL_DIR"
  fi
}

clone_or_update_repo() {
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    echo "Updating LightTask in $INSTALL_DIR..."
    git -C "$INSTALL_DIR" fetch origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout "$BRANCH"
    git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
  elif [[ -e "$INSTALL_DIR" ]]; then
    echo "$INSTALL_DIR exists but is not a git repository." >&2
    echo "Move it away or choose another path with --dir." >&2
    exit 1
  else
    ensure_parent_dir
    echo "Cloning LightTask into $INSTALL_DIR..."
    git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$INSTALL_DIR"
  fi
}

deploy() {
  local deploy_script="$INSTALL_DIR/source/deploy-docker.sh"
  if [[ ! -f "$deploy_script" ]]; then
    echo "Missing deploy script: $deploy_script" >&2
    exit 1
  fi

  chmod +x "$deploy_script"
  cd "$INSTALL_DIR/source"
  "$deploy_script" "${DEPLOY_ARGS[@]}"
}

install_git_if_missing
clone_or_update_repo
deploy
