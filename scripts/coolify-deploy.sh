#!/usr/bin/env bash
# Trigger (and watch) a Coolify deployment for an application that already exists.
# Secrets come from the environment only - nothing is stored in this file.
#
#   export COOLIFY_URL="https://coolify.example.com"     # your dashboard URL, no trailing slash
#   export COOLIFY_TOKEN="..."                            # Keys & Tokens -> API tokens (read + deploy)
#   export COOLIFY_APP_UUID="..."                         # the application's UUID in Coolify
#   ./scripts/coolify-deploy.sh
set -euo pipefail
: "${COOLIFY_URL:?Set COOLIFY_URL}"; : "${COOLIFY_TOKEN:?Set COOLIFY_TOKEN}"; : "${COOLIFY_APP_UUID:?Set COOLIFY_APP_UUID}"
api() { curl -fsS -H "Authorization: Bearer ${COOLIFY_TOKEN}" -H "Accept: application/json" "$@"; }

echo "Triggering deployment..."
resp=$(api "${COOLIFY_URL}/api/v1/deploy?uuid=${COOLIFY_APP_UUID}&force=false")
dep=$(printf '%s' "$resp" | sed -n 's/.*"deployment_uuid":"\([^"]*\)".*/\1/p')
[ -n "$dep" ] || { echo "No deployment UUID returned: $resp"; exit 1; }
echo "Deployment: $dep"

for i in $(seq 1 60); do
  status=$(api "${COOLIFY_URL}/api/v1/deployments/${dep}" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p' | head -1)
  echo "[$i] status: ${status:-unknown}"
  case "$status" in
    finished) echo "Deployment finished."; exit 0;;
    failed|cancelled*) echo "Deployment ended with: $status"; exit 1;;
  esac
  sleep 10
done
echo "Timed out waiting for the deployment."; exit 1
