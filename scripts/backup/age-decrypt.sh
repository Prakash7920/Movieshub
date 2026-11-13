#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <encrypted-file> <output-file> <age-identity-file>" >&2
  exit 2
}

[[ $# -eq 3 ]] || usage
encrypted=$1
output=$2
identity=$3

command -v age >/dev/null 2>&1 || { echo "age CLI is required" >&2; exit 127; }
[[ -f "$encrypted" && -s "$encrypted" ]] || { echo "Encrypted backup is missing or empty" >&2; exit 1; }
[[ -f "$identity" && -s "$identity" ]] || { echo "AGE identity file is missing or empty" >&2; exit 1; }

out_dir=$(dirname "$output")
mkdir -p "$out_dir"
tmp=$(mktemp "${out_dir}/.age-decrypted.XXXXXX")
trap 'rm -f "$tmp"' EXIT

# AGE verifies its authenticated ciphertext while decrypting. Never publish
# partial plaintext: move into place only after age exits successfully.
age --decrypt --identity "$identity" --output "$tmp" "$encrypted"
[[ -s "$tmp" ]] || { echo "Decrypted backup is empty" >&2; exit 1; }
mv -f "$tmp" "$output"
trap - EXIT
