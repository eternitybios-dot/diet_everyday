#!/usr/bin/env bash
# Snapshot public/ex so exercise art can always be restored.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/ex"
DEST_ROOT="$ROOT/backups/ex"
STAMP="${1:-$(date +%Y%m%d-%H%M%S)}"
DEST="$DEST_ROOT/$STAMP"

if [[ ! -d "$SRC" ]]; then
  echo "missing $SRC" >&2
  exit 1
fi

mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"
ln -sfn "$STAMP" "$DEST_ROOT/latest"
echo "backed up $SRC -> backups/ex/$STAMP"
