#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")" && pwd)
ENCRYPT="$ROOT/age-encrypt.sh"
DECRYPT="$ROOT/age-decrypt.sh"

command -v age >/dev/null 2>&1 || { echo "age CLI is required" >&2; exit 127; }
command -v age-keygen >/dev/null 2>&1 || { echo "age-keygen is required" >&2; exit 127; }

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
umask 077

age-keygen -o "$work/test-identity.txt" 2>"$work/keygen.log"
recipient=$(awk '/^# public key:/ {print $4}' "$work/test-identity.txt")
[[ -n "$recipient" ]] || { echo "Could not derive test recipient" >&2; exit 1; }

printf 'NexaFilm isolated AGE backup test payload\n' > "$work/plain.dump"
bash "$ENCRYPT" "$work/plain.dump" "$work/backup.dump.age" "$recipient"
bash "$DECRYPT" "$work/backup.dump.age" "$work/restored.dump" "$work/test-identity.txt"
cmp "$work/plain.dump" "$work/restored.dump"

# Existing outputs must never be replaced by either helper.
cp "$work/backup.dump.age" "$work/backup-original.age"
if bash "$ENCRYPT" "$work/plain.dump" "$work/backup.dump.age" "$recipient" >/dev/null 2>&1; then
  echo "FAIL: encryption replaced an existing output" >&2; exit 1
fi
cmp "$work/backup.dump.age" "$work/backup-original.age"

printf 'preserve-existing-output\n' > "$work/existing-plain.dump"
cp "$work/existing-plain.dump" "$work/existing-plain.expected"
if bash "$DECRYPT" "$work/backup.dump.age" "$work/existing-plain.dump" "$work/test-identity.txt" >/dev/null 2>&1; then
  echo "FAIL: decryption replaced an existing output" >&2; exit 1
fi
cmp "$work/existing-plain.dump" "$work/existing-plain.expected"
echo "Existing output preservation: PASS"

# Same-path and symlink-alias cases must be rejected without changing the source.
cp "$work/plain.dump" "$work/same-input.dump"
cp "$work/same-input.dump" "$work/same-input.expected"
if bash "$ENCRYPT" "$work/same-input.dump" "$work/same-input.dump" "$recipient" >/dev/null 2>&1; then
  echo "FAIL: encryption accepted identical input/output paths" >&2; exit 1
fi
cmp "$work/same-input.dump" "$work/same-input.expected"

cp "$work/backup.dump.age" "$work/same-encrypted.age"
cp "$work/same-encrypted.age" "$work/same-encrypted.expected"
if bash "$DECRYPT" "$work/same-encrypted.age" "$work/same-encrypted.age" "$work/test-identity.txt" >/dev/null 2>&1; then
  echo "FAIL: decryption accepted identical input/output paths" >&2; exit 1
fi
cmp "$work/same-encrypted.age" "$work/same-encrypted.expected"

ln -s "$work/plain.dump" "$work/plain-alias.dump"
if bash "$ENCRYPT" "$work/plain.dump" "$work/plain-alias.dump" "$recipient" >/dev/null 2>&1; then
  echo "FAIL: encryption accepted a symlink alias to its input" >&2; exit 1
fi
cmp "$work/plain.dump" "$work/same-input.expected"
echo "Same-path and symlink-alias rejection: PASS"

# A different identity must not decrypt the backup.
age-keygen -o "$work/wrong-identity.txt" 2>"$work/wrong-keygen.log"
if bash "$DECRYPT" "$work/backup.dump.age" "$work/wrong-restored.dump" "$work/wrong-identity.txt" >/dev/null 2>&1; then
  echo "FAIL: wrong identity unexpectedly decrypted the backup" >&2
  exit 1
fi
[[ ! -e "$work/wrong-restored.dump" ]] || { echo "FAIL: partial plaintext was published" >&2; exit 1; }

# Flip a byte in the ciphertext; authenticated decryption must fail.
cp "$work/backup.dump.age" "$work/tampered.dump.age"
python3 - "$work/tampered.dump.age" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
data = bytearray(p.read_bytes())
if len(data) < 32:
    raise SystemExit("ciphertext unexpectedly short")
data[-10] ^= 0x01
p.write_bytes(data)
PY
if bash "$DECRYPT" "$work/tampered.dump.age" "$work/tampered-restored.dump" "$work/test-identity.txt" >/dev/null 2>&1; then
  echo "FAIL: tampered ciphertext unexpectedly decrypted" >&2
  exit 1
fi
[[ ! -e "$work/tampered-restored.dump" ]] || { echo "FAIL: partial plaintext was published" >&2; exit 1; }

echo "AGE round-trip: PASS"
echo "Wrong identity rejection: PASS"
echo "Tamper detection: PASS"
echo "No partial plaintext published: PASS"
