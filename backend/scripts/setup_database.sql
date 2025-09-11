-- Database setup script for my-gaff-list RDS PostgreSQL
-- Run this script as the master user (postgres) when connected to the RDS instance

-- 1. Create the application database
CREATE DATABASE mygafflist
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    CONNECTION LIMIT = -1
    TEMPLATE = template0;

-- 2. Create a dedicated application user
-- Replace 'YourSecurePasswordHere123!' with a strong password
CREATE USER mygafflist_user WITH
    PASSWORD 'YourSecurePasswordHere123!'
    CREATEDB
    LOGIN
    CONNECTION LIMIT 100;

-- 3. Grant all privileges on the database to the application user
GRANT ALL PRIVILEGES ON DATABASE mygafflist TO mygafflist_user;

-- 4. Connect to the new database
\c mygafflist

-- 5. Grant schema permissions to the application user
GRANT ALL ON SCHEMA public TO mygafflist_user;
GRANT CREATE ON SCHEMA public TO mygafflist_user;

-- 6. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO mygafflist_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO mygafflist_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO mygafflist_user;

-- 7. Create required extensions (if needed by Django)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- 8. Optimize PostgreSQL settings for Django
ALTER DATABASE mygafflist SET timezone TO 'UTC';
ALTER DATABASE mygafflist SET statement_timeout TO '60s';
ALTER DATABASE mygafflist SET lock_timeout TO '10s';
ALTER DATABASE mygafflist SET idle_in_transaction_session_timeout TO '5min';

-- 9. Create a read-only user for analytics/reporting (optional)
CREATE USER mygafflist_readonly WITH
    PASSWORD 'ReadOnlyPasswordHere456!'
    LOGIN
    CONNECTION LIMIT 10;

-- Grant read-only access
GRANT CONNECT ON DATABASE mygafflist TO mygafflist_readonly;
GRANT USAGE ON SCHEMA public TO mygafflist_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mygafflist_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO mygafflist_readonly;

-- 10. Verify the setup
\du  -- List all users
\l   -- List all databases

-- Output message
\echo '✅ Database setup complete!'
\echo 'Database: mygafflist'
\echo 'Application user: mygafflist_user'
\echo 'Read-only user: mygafflist_readonly'
\echo ''
\echo '⚠️  IMPORTANT: Remember to:'
\echo '1. Change the default passwords in this script'
\echo '2. Save the passwords securely'
\echo '3. Update your .env.production file with the connection details'