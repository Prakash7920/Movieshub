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
command -v realpath >/dev/null 2>&1 || { echo "realpath is required" >&2; exit 127; }
[[ -f "$encrypted" && -s "$encrypted" ]] || { echo "Encrypted backup is missing or empty" >&2; exit 1; }
[[ -f "$identity" && -s "$identity" ]] || { echo "AGE identity file is missing or empty" >&2; exit 1; }

out_dir=$(dirname "$output")
mkdir -p "$out_dir"
encrypted_path=$(realpath -e -- "$encrypted")
output_path=$(realpath -m -- "$output")
[[ "$encrypted_path" != "$output_path" ]] || {
  echo "Refusing to overwrite encrypted source with decrypted output" >&2
  exit 1
}
[[ ! -e "$output" && ! -L "$output" ]] || {
  echo "Refusing to replace existing output: $output" >&2
  exit 1
}

tmp=$(mktemp "${out_dir}/.age-decrypted.XXXXXX")
trap 'rm -f "$tmp"' EXIT

# AGE authenticates ciphertext while decrypting. Publish only after success.
age --decrypt --identity "$identity" --output "$tmp" "$encrypted"
[[ -s "$tmp" ]] || { echo "Decrypted backup is empty" >&2; exit 1; }

# Hard-link publication is atomic and fails rather than replacing an existing path.
ln -- "$tmp" "$output"
rm -f "$tmp"
trap - EXIT
