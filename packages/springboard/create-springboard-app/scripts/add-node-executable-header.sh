#!/bin/bash

DIST_FILE="dist/cli.js"

if [ ! -d "dist" ]; then
  echo "Error: 'dist' folder does not exist. Run 'tsc' to compile TypeScript files first."
  exit 1
fi

if [ ! -f "$DIST_FILE" ]; then
  echo "Error: '$DIST_FILE' does not exist."
  exit 1
fi

if ! grep -q '^#!/usr/bin/env node' "$DIST_FILE"; then
  (echo '#!/usr/bin/env node' && cat "$DIST_FILE") > "$DIST_FILE.tmp" && mv "$DIST_FILE.tmp" "$DIST_FILE"
  chmod +x "$DIST_FILE"
fi
