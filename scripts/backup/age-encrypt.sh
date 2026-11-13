#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <input-file> <output-file> <age-recipient> [<age-recipient> ...]" >&2
  exit 2
}

[[ $# -ge 3 ]] || usage
input=$1
output=$2
shift 2
recipients=("$@")

command -v age >/dev/null 2>&1 || { echo "age CLI is required" >&2; exit 127; }
[[ -f "$input" && -s "$input" ]] || { echo "Input backup is missing or empty" >&2; exit 1; }

for recipient in "${recipients[@]}"; do
  [[ -n "$recipient" ]] || { echo "AGE recipients must not be empty" >&2; exit 2; }
done

out_dir=$(dirname "$output")
mkdir -p "$out_dir"
tmp=$(mktemp "${out_dir}/.age-encrypted.XXXXXX")
trap 'rm -f "$tmp"' EXIT

age_args=(--encrypt)
for recipient in "${recipients[@]}"; do
  age_args+=(--recipient "$recipient")
done

# AGE writes one authenticated ciphertext that any listed recipient can open.
age "${age_args[@]}" --output "$tmp" "$input"
[[ -s "$tmp" ]] || { echo "Encrypted output is empty" >&2; exit 1; }
mv -f "$tmp" "$output"
trap - EXIT
