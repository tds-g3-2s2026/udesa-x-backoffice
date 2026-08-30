#!/usr/bin/env bash
set -euo pipefail

echo "Running linter and code formatting checks..."
bun run lint
