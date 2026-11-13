#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")" && pwd)
REHEARSAL="$ROOT/test-dual-format-restore.sh"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

set +e
env -u GITHUB_ACTIONS -u GITHUB_RUN_ID -u GITHUB_WORKSPACE -u RUNNER_OS \
  NEXAFILM_DISPOSABLE_RESTORE_TEST=1 \
  PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres \
  bash "$REHEARSAL" >"$work/stdout.txt" 2>"$work/stderr.txt"
status=$?
set -e

if [[ "$status" -eq 0 ]]; then
  echo "FAIL: rehearsal accepted execution without GitHub Actions context" >&2
  exit 1
fi
grep -q "Refusing rehearsal outside GitHub Actions" "$work/stderr.txt" || {
  cat "$work/stderr.txt" >&2
  echo "FAIL: rehearsal did not fail at the GitHub Actions context guard" >&2
  exit 1
}
echo "Non-GitHub-Actions execution refusal: PASS"
