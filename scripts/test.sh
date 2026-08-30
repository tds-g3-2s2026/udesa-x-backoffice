#!/usr/bin/env bash
set -euo pipefail

echo "Running backoffice tests..."
bun run test
