#!/usr/bin/env bash
set -euo pipefail

# Disposable integration rehearsal. This script only connects to the local
# PostgreSQL service supplied by its CI workflow; it never reads project secrets.
ROOT=$(cd "$(dirname "$0")" && pwd)
ENCRYPT="$ROOT/age-encrypt.sh"
DECRYPT="$ROOT/age-decrypt.sh"

for command_name in psql pg_dump pg_restore createdb dropdb openssl age age-keygen; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Required command missing: $command_name" >&2
    exit 127
  }
done

: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGPASSWORD:=postgres}"
: "${PGDATABASE:=postgres}"
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
umask 077

# Refuse to run unless connected to the dedicated disposable CI service.
server_name=$(psql -X -v ON_ERROR_STOP=1 -Atc 'SELECT inet_server_addr()::text')
current_db=$(psql -X -v ON_ERROR_STOP=1 -Atc 'SELECT current_database()')
[[ "$current_db" == "postgres" ]] || {
  echo "Refusing rehearsal outside the disposable postgres maintenance database" >&2
  exit 1
}
[[ "$server_name" == "127.0.0.1" || "$server_name" == "::1" ]] || {
  echo "Refusing rehearsal: PostgreSQL server is not loopback" >&2
  exit 1
}

db_url="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"
source_db="nexafilm_restore_fixture"
legacy_db="nexafilm_restore_legacy"
age_db="nexafilm_restore_age"
repeat_db="nexafilm_restore_age_repeat"

reset_db() {
  local name=$1
  dropdb --if-exists --maintenance-db="$db_url" "$name"
  createdb --maintenance-db="$db_url" "$name"
}

# Create deterministic synthetic data; no Production data or credentials.
reset_db "$source_db"
psql -X -v ON_ERROR_STOP=1 --dbname="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$source_db" <<'SQL'
CREATE TABLE public.users (
  id integer PRIMARY KEY,
  email text NOT NULL UNIQUE
);
CREATE TABLE public.movies (
  id integer PRIMARY KEY,
  title text NOT NULL
);
INSERT INTO public.users (id, email) VALUES
  (1, 'fixture-one@example.invalid'),
  (2, 'fixture-two@example.invalid');
INSERT INTO public.movies (id, title) VALUES
  (101, 'Synthetic Film One'),
  (102, 'Synthetic Film Two'),
  (103, 'Synthetic Film Three');
SQL

source_url="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$source_db"
pg_dump --format=custom --no-owner --no-acl --dbname="$source_url" \
  --file="$work/fixture.dump"
test -s "$work/fixture.dump"
pg_restore --list "$work/fixture.dump" > "$work/archive-list.txt"
test -s "$work/archive-list.txt"
echo "Synthetic PostgreSQL archive creation and listing: PASS"

# Legacy OpenSSL compatibility rehearsal using a disposable test-only secret.
export LEGACY_TEST_PASSPHRASE="nexafilm-ci-only-$(openssl rand -hex 24)"
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -pass env:LEGACY_TEST_PASSPHRASE \
  -in "$work/fixture.dump" \
  -out "$work/fixture.dump.openssl"
test -s "$work/fixture.dump.openssl"
openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:LEGACY_TEST_PASSPHRASE \
  -in "$work/fixture.dump.openssl" \
  -out "$work/legacy-restored.dump.tmp"
pg_restore --list "$work/legacy-restored.dump.tmp" > "$work/legacy-archive-list.txt"
mv "$work/legacy-restored.dump.tmp" "$work/legacy-restored.dump"
cmp "$work/fixture.dump" "$work/legacy-restored.dump"
echo "Legacy OpenSSL decrypt and archive compatibility: PASS"

# Generate disposable primary/emergency AGE identities and encrypt one backup
# to both recipients. Private identities stay inside this temporary directory.
age-keygen -o "$work/primary.txt" 2> "$work/primary-keygen.log"
age-keygen -o "$work/emergency.txt" 2> "$work/emergency-keygen.log"
chmod 600 "$work/primary.txt" "$work/emergency.txt"
recipient_of() {
  awk '/^# public key:/ {print $4}' "$1"
}
primary_recipient=$(recipient_of "$work/primary.txt")
emergency_recipient=$(recipient_of "$work/emergency.txt")
[[ -n "$primary_recipient" && -n "$emergency_recipient" ]] || {
  echo "Could not derive disposable AGE recipients" >&2
  exit 1
}

bash "$ENCRYPT" "$work/fixture.dump" "$work/fixture.dump.age" \
  "$primary_recipient" "$emergency_recipient"
bash "$DECRYPT" "$work/fixture.dump.age" "$work/age-primary.dump" "$work/primary.txt"
bash "$DECRYPT" "$work/fixture.dump.age" "$work/age-emergency.dump" "$work/emergency.txt"
cmp "$work/fixture.dump" "$work/age-primary.dump"
cmp "$work/fixture.dump" "$work/age-emergency.dump"
echo "AGE primary and emergency decrypt compatibility: PASS"

verify_target() {
  local name=$1
  local url="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$name"
  local users movies
  users=$(psql -X -v ON_ERROR_STOP=1 -At --dbname="$url" \
    -c 'SELECT count(*) FROM public.users')
  movies=$(psql -X -v ON_ERROR_STOP=1 -At --dbname="$url" \
    -c 'SELECT count(*) FROM public.movies')
  [[ "$users" == "2" && "$movies" == "3" ]] || {
    echo "Restore verification failed for $name (users=$users movies=$movies)" >&2
    exit 1
  }
  echo "Restore schema/data verification ($name): PASS"
}

# Each restore uses a newly created, isolated database.
reset_db "$legacy_db"
pg_restore --exit-on-error --no-owner --no-acl \
  --dbname="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$legacy_db" \
  "$work/legacy-restored.dump"
verify_target "$legacy_db"

reset_db "$age_db"
pg_restore --exit-on-error --no-owner --no-acl \
  --dbname="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$age_db" \
  "$work/age-primary.dump"
verify_target "$age_db"

# Rehearse a safe repeat by recreating a clean disposable target before the
# second restore; this does not claim that an in-place duplicate restore is safe.
reset_db "$repeat_db"
pg_restore --exit-on-error --no-owner --no-acl \
  --dbname="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$repeat_db" \
  "$work/age-emergency.dump"
verify_target "$repeat_db"
echo "Repeat AGE restore into recreated clean target: PASS"

echo "Dual-format isolated restore rehearsal: ALL PASS"
