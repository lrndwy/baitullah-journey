-- ─────────────────────────────────────────────────────────────────────────────
-- Database-side password policy for PostgreSQL.
--
-- The application enforces the policy its users actually meet (see
-- docs/PASSWORD-POLICY.md) because it authenticates them against scrypt hashes
-- it owns. This file covers the other half: the credentials that live *inside*
-- the cluster — the migration user, an operator's psql account, a reporting
-- role — which no application code ever sees.
--
-- It is the PostgreSQL counterpart of the MySQL lab in "MODUL VI": where that
-- module runs `INSTALL PLUGIN validate_password` and sets
-- `validate_password.length` / `validate_password.policy`, PostgreSQL uses the
-- `passwordcheck` contrib module plus cluster settings.
--
-- Apply as a superuser:
--   psql -U postgres -f docker/postgres/password-policy.sql
-- Then restart the server once so `shared_preload_libraries` takes effect:
--   docker compose -f docker/docker-compose.yml restart postgres
--
-- The `postgres` image also runs every *.sql in /docker-entrypoint-initdb.d on a
-- *fresh* volume; mounting this file there is enough for a new deployment.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Store role passwords as SCRAM-SHA-256, never as MD5 --------------------
--    The MySQL analogue is the server's default authentication plugin; the
--    point is identical: a password that leaks out of pg_authid must not be
--    cheap to crack.
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

-- 2. Reject weak role passwords at CREATE/ALTER ROLE time --------------------
--    `passwordcheck` enforces, for every `CREATE ROLE ... PASSWORD` and
--    `ALTER ROLE ... PASSWORD`:
--      * at least MIN_PASSWORD_LENGTH characters (default 8)
--      * the password must contain both letters and non-letters
--    It is a shared library, so it has to be preloaded before the server
--    accepts connections. Keep whatever else is already preloaded.
ALTER SYSTEM SET shared_preload_libraries = 'passwordcheck';

-- 3. Expired password --------------------------------------------------------
--    MySQL:  ALTER USER ... PASSWORD EXPIRE INTERVAL 30 DAY
--    Postgres has no "expire", only "valid until": the role stops being able
--    to log in at that instant, which is the stricter of the two behaviours.
--    Replace the password with a random one when the policy requires rotation
--    *and* continued access; `VALID UNTIL` alone ends access.
--    Example (not run here — it targets a real operator account):
--      ALTER ROLE reporting VALID UNTIL '2026-12-08 00:00:00+00';

-- 4. Limit concurrent sessions instead of account lockout --------------------
--    MySQL:  FAILED_LOGIN_ATTEMPTS 3 / PASSWORD_LOCK_TIME 1
--    PostgreSQL has no failed-login counter and no PASSWORD_LOCK_TIME. The
--    equivalent controls are:
--      * `CONNECTION LIMIT` per role, which caps how many sessions it can hold;
--      * a pgbouncer / fail2ban / pgAudit pipeline that reacts to
--        `FATAL: password authentication failed for user` in the server log;
--      * the application's own lockout, which is what this template uses for
--        its users (see apps/api/src/modules/auth/auth.service.ts).
--    Example:
--      ALTER ROLE reporting CONNECTION LIMIT 3;

-- 5. Verify -----------------------------------------------------------------
--    `rolpassword` is readable in pg_authid only by a superuser; a non-empty
--    prefix means the role has a password.
SELECT
  rolname,
  rolcanlogin,
  rolconnlimit,
  CASE
    WHEN rolpassword IS NULL THEN 'none'
    WHEN rolpassword LIKE 'SCRAM-SHA-256%' THEN 'scram-sha-256'
    ELSE 'other'
  END AS password_storage,
  rolvaliduntil
FROM pg_authid
WHERE rolname NOT LIKE 'pg\_%'
ORDER BY rolname;

SHOW password_encryption;
SHOW shared_preload_libraries;