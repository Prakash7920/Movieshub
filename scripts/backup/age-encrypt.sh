#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <input-file> <output-file> <age-recipient>" >&2
  exit 2
}

[[ $# -eq 3 ]] || usage
input=$1
output=$2
recipient=$3

command -v age >/dev/null 2>&1 || { echo "age CLI is required" >&2; exit 127; }
command -v realpath >/dev/null 2>&1 || { echo "realpath is required" >&2; exit 127; }
[[ -f "$input" && -s "$input" ]] || { echo "Input backup is missing or empty" >&2; exit 1; }
[[ -n "$recipient" ]] || { echo "AGE recipient is required" >&2; exit 2; }

out_dir=$(dirname "$output")
mkdir -p "$out_dir"
input_path=$(realpath -e -- "$input")
output_path=$(realpath -m -- "$output")
[[ "$input_path" != "$output_path" ]] || {
  echo "Refusing to overwrite input with encrypted output" >&2
  exit 1
}
[[ ! -e "$output" && ! -L "$output" ]] || {
  echo "Refusing to replace existing output: $output" >&2
  exit 1
}

tmp=$(mktemp "${out_dir}/.age-encrypted.XXXXXX")
trap 'rm -f "$tmp"' EXIT

age --encrypt --recipient "$recipient" --output "$tmp" "$input"
[[ -s "$tmp" ]] || { echo "Encrypted output is empty" >&2; exit 1; }

# Atomic publication that fails rather than replacing an existing path.
ln -- "$tmp" "$output"
rm -f "$tmp"
trap - EXIT
