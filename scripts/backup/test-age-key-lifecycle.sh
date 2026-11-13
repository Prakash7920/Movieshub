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

# All identities are disposable test keys created inside this temporary folder.
age-keygen -o "$work/primary.txt" 2>"$work/primary-keygen.log"
age-keygen -o "$work/emergency.txt" 2>"$work/emergency-keygen.log"
age-keygen -o "$work/rotated.txt" 2>"$work/rotated-keygen.log"
chmod 600 "$work/"*.txt

recipient_of() {
  awk '/^# public key:/ {print $4}' "$1"
}
primary_recipient=$(recipient_of "$work/primary.txt")
emergency_recipient=$(recipient_of "$work/emergency.txt")
rotated_recipient=$(recipient_of "$work/rotated.txt")
[[ -n "$primary_recipient" && -n "$emergency_recipient" && -n "$rotated_recipient" ]] || {
  echo "FAIL: could not derive all test recipients" >&2; exit 1;
}

printf 'NexaFilm recovery lifecycle fixture\n' > "$work/old-backup.dump"
printf 'NexaFilm post-rotation fixture\n' > "$work/new-backup.dump"

# Exercise the production helper itself with both primary and emergency recipients.
bash "$ENCRYPT" "$work/old-backup.dump" "$work/old-backup.dump.age" \
  "$primary_recipient" "$emergency_recipient"

bash "$DECRYPT" "$work/old-backup.dump.age" "$work/primary-restored.dump" "$work/primary.txt"
cmp "$work/old-backup.dump" "$work/primary-restored.dump"
echo "Primary-key recovery through multi-recipient helper: PASS"

bash "$DECRYPT" "$work/old-backup.dump.age" "$work/emergency-restored.dump" "$work/emergency.txt"
cmp "$work/old-backup.dump" "$work/emergency-restored.dump"
echo "Emergency-key recovery through multi-recipient helper: PASS"

# Simulate loss of the primary identity without touching any real key.
mv "$work/primary.txt" "$work/primary.unavailable"
if bash "$DECRYPT" "$work/old-backup.dump.age" "$work/lost-primary-restored.dump" "$work/primary.txt" >/dev/null 2>&1; then
  echo "FAIL: missing primary identity unexpectedly worked" >&2; exit 1
fi
[[ ! -e "$work/lost-primary-restored.dump" ]] || {
  echo "FAIL: plaintext appeared after primary-key loss" >&2; exit 1;
}
bash "$DECRYPT" "$work/old-backup.dump.age" "$work/disaster-restored.dump" "$work/emergency.txt"
cmp "$work/old-backup.dump" "$work/disaster-restored.dump"
echo "Primary-loss emergency recovery: PASS"

# Rotation applies the new recipient to future backups; retain old identity
# custody so historical backups remain recoverable.
bash "$ENCRYPT" "$work/new-backup.dump" "$work/new-backup.dump.age" "$rotated_recipient"
bash "$DECRYPT" "$work/new-backup.dump.age" "$work/new-restored.dump" "$work/rotated.txt"
cmp "$work/new-backup.dump" "$work/new-restored.dump"
echo "Post-rotation new-backup recovery: PASS"

# Historical backup must still decrypt with its retained emergency identity.
bash "$DECRYPT" "$work/old-backup.dump.age" "$work/old-after-rotation.dump" "$work/emergency.txt"
cmp "$work/old-backup.dump" "$work/old-after-rotation.dump"
echo "Historical-backup compatibility: PASS"

# The new identity is not a recipient of the historical backup.
if bash "$DECRYPT" "$work/old-backup.dump.age" "$work/wrong-generation.dump" "$work/rotated.txt" >/dev/null 2>&1; then
  echo "FAIL: rotated identity unexpectedly decrypted historical backup" >&2; exit 1
fi
[[ ! -e "$work/wrong-generation.dump" ]] || {
  echo "FAIL: partial plaintext published for wrong key" >&2; exit 1;
}
echo "Wrong-key rejection and no-partial-output: PASS"

# Tampering with the multi-recipient ciphertext must fail authentication.
cp "$work/old-backup.dump.age" "$work/tampered.dump.age"
python3 - "$work/tampered.dump.age" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
data = bytearray(path.read_bytes())
if len(data) < 32:
    raise SystemExit("ciphertext unexpectedly short")
data[-10] ^= 0x01
path.write_bytes(data)
PY
if bash "$DECRYPT" "$work/tampered.dump.age" "$work/tampered-restored.dump" "$work/emergency.txt" >/dev/null 2>&1; then
  echo "FAIL: tampered multi-recipient ciphertext unexpectedly decrypted" >&2; exit 1
fi
[[ ! -e "$work/tampered-restored.dump" ]] || {
  echo "FAIL: plaintext published after tamper failure" >&2; exit 1;
}
echo "Multi-recipient ciphertext tamper rejection: PASS"

# Test-only identity permissions must be restrictive.
[[ "$(stat -c '%a' "$work/primary.unavailable")" == "600" ]]
[[ "$(stat -c '%a' "$work/emergency.txt")" == "600" ]]
[[ "$(stat -c '%a' "$work/rotated.txt")" == "600" ]]
echo "Private identity file permissions: PASS"
echo "AGE recovery-key lifecycle: ALL PASS"
