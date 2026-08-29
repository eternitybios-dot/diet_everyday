#!/usr/bin/env bash
# Restore public/ex from a local snapshot created by backup-ex.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_ROOT="$ROOT/backups/ex"
STAMP="${1:-latest}"
SRC="$SRC_ROOT/$STAMP"

if [[ ! -d "$SRC" ]]; then
  echo "missing backup $SRC" >&2
  echo "available:" >&2
  ls -1 "$SRC_ROOT" 2>/dev/null || true
  exit 1
fi

bash "$ROOT/scripts/backup-ex.sh" "pre-restore-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ROOT/public/ex"
rm -f "$ROOT/public/ex/"*
cp -R "$SRC/." "$ROOT/public/ex/"
echo "restored backups/ex/$STAMP -> public/ex"
