#!/usr/bin/env bash
# Deploys the static site (index.html, css/, js/) to the remote host.
set -euo pipefail

REMOTE_HOST="${1:-fsdata}"
REMOTE_PATH="${2:-~/www/bnm}"

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "Deploying to ${REMOTE_HOST}:${REMOTE_PATH} ..."
ssh "$REMOTE_HOST" "mkdir -p ${REMOTE_PATH}"
scp -r index.html css js "${REMOTE_HOST}:${REMOTE_PATH}/"
echo "Done."
