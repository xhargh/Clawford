#!/usr/bin/env bash
# Deploys the static site (index.html, manifest, service worker, favicon.ico, img/, css/, js/) to the remote host.
set -euo pipefail

REMOTE_HOST="${1:-fsdata}"
REMOTE_PATH="${2:-~/www/clawford}"

cd "$(dirname "${BASH_SOURCE[0]}")"

# Stamp sw.js's cache version with a hash of the app-shell contents, so
# clients automatically invalidate their cache whenever a shipped file
# changes. No manual version bump needed.
SHELL_FILES=(index.html manifest.webmanifest favicon.ico css js img)
HASH=$(find "${SHELL_FILES[@]}" -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | cut -c1-12)

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
sed "s/clawford-dev/clawford-${HASH}/" sw.js > "${TMP_DIR}/sw.js"

echo "Deploying to ${REMOTE_HOST}:${REMOTE_PATH} (cache version clawford-${HASH}) ..."
ssh "$REMOTE_HOST" "mkdir -p ${REMOTE_PATH}"
scp -r index.html manifest.webmanifest favicon.ico img css js "${REMOTE_HOST}:${REMOTE_PATH}/"
scp "${TMP_DIR}/sw.js" "${REMOTE_HOST}:${REMOTE_PATH}/sw.js"
echo "Done."
