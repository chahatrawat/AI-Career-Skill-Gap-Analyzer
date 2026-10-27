@echo off
REM Windows: run from project root. Requires Node 18+ and MySQL 8 (mysql in PATH).
set /p DBPW=MySQL root password: 
set MYSQL_PWD=%DBPW%
mysql -u root -e "CREATE DATABASE IF NOT EXISTS career_skill_analyzer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if errorlevel 1 (
  echo Could not connect to MySQL. Check the password and that MySQL is running.
  exit /b 1
)
REM Load schema and seed only when the database is still empty (safe to re-run this script).
set TABLES=0
for /f %%i in ('mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='career_skill_analyzer'"') do set TABLES=%%i
if "%TABLES%"=="0" (
  mysql -u root career_skill_analyzer < backend\database\schema.sql
  mysql -u root career_skill_analyzer < backend\database\seed.sql
)
REM Existing databases: add tables introduced in version 2 (safe to repeat).
mysql -u root career_skill_analyzer < backend\database\migration_002_features.sql
if not exist backend\.env (
  powershell -Command "$pw=$env:DBPW; (Get-Content backend\.env.example) -replace 'your_database_password',$pw.Replace('$','$$') -replace 'change_this_to_a_long_random_secret','dev_secret_change_me_1234567890' | Set-Content backend\.env"
)
if not exist frontend\.env copy frontend\.env.example frontend\.env
cd backend && call npm install && start "API" cmd /k npm start
cd ..\frontend && call npm install && npm run dev
