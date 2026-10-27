#!/usr/bin/env bash
# One-time setup + run. Usage: DB_PASSWORD=yourmysqlpass ./setup-and-run.sh
set -e
cd "$(dirname "$0")"
DBPW="${DB_PASSWORD:-}"
# Pass the password through the environment so special characters are safe.
export MYSQL_PWD="$DBPW"
MYSQL="mysql -u root"
$MYSQL -e "CREATE DATABASE IF NOT EXISTS career_skill_analyzer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if [ "$($MYSQL -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='career_skill_analyzer'")" = "0" ]; then
  $MYSQL career_skill_analyzer < backend/database/schema.sql
  $MYSQL career_skill_analyzer < backend/database/seed.sql
fi
# Existing databases: add tables introduced in version 2 (safe to repeat).
$MYSQL career_skill_analyzer < backend/database/migration_002_features.sql
if [ ! -f backend/.env ]; then
  SECRET="$(head -c24 /dev/urandom | base64 | tr -dc A-Za-z0-9)"
  # Escape characters that are special on the replacement side of sed (\ & |).
  ESC_PW="$(printf '%s' "$DBPW" | sed -e 's/[\\&|]/\\&/g')"
  sed -e "s|your_database_password|$ESC_PW|" -e "s|change_this_to_a_long_random_secret|$SECRET|" backend/.env.example > backend/.env
fi
[ -f frontend/.env ] || cp frontend/.env.example frontend/.env
(cd backend && npm install --silent) ; (cd frontend && npm install --silent)
(cd backend && npm start) &
cd frontend && npm run dev
