# Password policy, lockout and rotation

Three rules are enforced on every password this application writes, plus a
fourth that decides when a password must be replaced:

| Concern | Where | Setting |
| --- | --- | --- |
| Strength | `packages/contracts/src/password.ts` | `PASSWORD_POLICY`, `PASSWORD_MIN_LENGTH` |
| Failed sign-ins | `apps/api/src/modules/auth/login-lock.ts` | `LOGIN_MAX_FAILED_ATTEMPTS`, `LOGIN_LOCK_MINUTES` |
| Rotation | `isPasswordExpired` in the same contracts file | `PASSWORD_MAX_AGE_DAYS` |
| Database roles | `docker/postgres/password-policy.sql` | `passwordcheck`, `scram-sha-256` |

## Why the application and not the database

MySQL has `validate_password` and PostgreSQL has the `passwordcheck` contrib
module, and both are worth having — but they police **database roles**, not the
people using the product. This deployment authenticates users against scrypt
hashes in `auth.users`; a `CREATE ROLE` policy would never see them, and
`FAILED_LOGIN_ATTEMPTS` is a MySQL-only feature that PostgreSQL does not have at
all.

So the split is:

* **In the database** (`docker/postgres/password-policy.sql`): SCRAM storage,
  a minimum length and complexity for role passwords, `VALID UNTIL` for
  expiring an operator account, `CONNECTION LIMIT` instead of lockout.
* **In the application** (this document): everything a signed-in human meets.

## The ladder

`PASSWORD_POLICY` takes the same three names MySQL uses, so a DBA reading the
config does not have to learn a second vocabulary.

| Level | Minimum | Character classes | Dictionary | Sequences | Identity |
| --- | --- | --- | --- | --- | --- |
| `LOW` | 8 | 1 | no | no | no |
| `MEDIUM` | 8 | 3 of 4 | no | no | no |
| `STRONG` | **12** | 4 of 4 | yes | yes | yes |

The four classes are lowercase, uppercase, digit and symbol. `STRONG` adds the
checks that a composition rule alone cannot express, because each one defeats a
different attack:

* **Dictionary** — ~75 leaked passwords, compared after leetspeak folding, so
  `P@ssw0rd1234` is rejected as `password1234` would be.
* **Sequences** — `1234`, `abcd`, `qwerty` and their reverses; also a password
  built from fewer than four distinct characters.
* **Identity** — the account's own email local part and name, which is the
  first thing a credential-stuffing list tries after the password itself.

`PASSWORD_MIN_LENGTH` raises the level's own floor and can never lower it:
`PASSWORD_POLICY=LOW` with `PASSWORD_MIN_LENGTH=4` still yields 8.

## Where it is enforced

All four write paths call `assertPasswordPolicy()` from
`apps/api/src/platform/security/password-policy.ts`, so a new one cannot be
added without passing it:

| Path | Code |
| --- | --- |
| Self-service reset | `auth.service.ts` → `resetPassword` |
| Authenticated change | `auth.service.ts` → `changePassword` |
| Admin creating an account | `users.service.ts` → `create` |
| Bootstrap admin at boot | `rbac/bootstrap-admin.service.ts` |

A reset validates **before** consuming the single-use code: a password that
breaks the policy must not burn a code the user then has to request again.

The response carries every rule that failed, not just the first:

```json
{
  "message": "That password appears in leaked-password dictionaries — choose something you invented",
  "details": {
    "violations": [{ "code": "common_password", "message": "…" }],
    "policy": { "level": "STRONG", "minLength": 12, "rules": [{ "code": "length", "label": "At least 12 characters" }] }
  }
}
```

The browser gets the same rule list from `GET /api/_meta/password-policy`
(public on purpose) and evaluates it live with `checkPassword`, so the checklist
under a password field cannot drift from what the server will accept.

## Lockout

`LOGIN_MAX_FAILED_ATTEMPTS=5` and `LOGIN_LOCK_MINUTES=15` reproduce MySQL's
`FAILED_LOGIN_ATTEMPTS` / `PASSWORD_LOCK_TIME`:

* the counter is per account, stored in `auth.users.failed_login_attempts`;
* the lock is applied on the attempt that reaches the threshold and written to
  `auth.users.locked_until`;
* the streak is reset **when the lock is applied**, so a user returning after
  it expires starts from zero rather than being one typo away from the next lock;
* a successful sign-in clears both columns;
* `LOGIN_MAX_FAILED_ATTEMPTS=0` turns the mechanism off, leaving only the
  per-IP Redis rate limiter in front of `POST /api/auth/login`.

Both the locked response and the lock event are audited (`auth.login.locked`,
`status: failure`) and emitted on the event bus.

## Rotation

`PASSWORD_MAX_AGE_DAYS=30` makes a password older than 30 days unusable, and
sign-in answers `403` telling the user to use "Forgot password". `0` — the
template default — disables rotation.

Rotation is off by default because forced rotation annoys more people than it
protects, and because the deployments that are required to do it by policy are
exactly the ones whose operators read this file. Turning it on is one variable.

`auth.users.password_changed_at` is written in the same statement as the hash,
so a password can never look older than it is. `NULL` means "never set through
this system" — an OAuth-only account, which has no password to expire.

## Running the database half

```bash
psql -U postgres -f docker/postgres/password-policy.sql
docker compose -f docker/docker-compose.yml restart postgres   # reload shared_preload_libraries
```

Then a weak role password is refused by the server itself:

```text
postgres=# CREATE ROLE test_user LOGIN PASSWORD '123';
ERROR:  password is too short
DETAIL:  password must be at least "passwordcheck.min_password_length" (8) bytes long

postgres=# CREATE ROLE letters_only LOGIN PASSWORD 'abcdefgh';
ERROR:  password must contain both letters and nonletters

postgres=# CREATE ROLE secure_user LOGIN PASSWORD 'Secure#123';
CREATE ROLE
```

## Verifying

```bash
pnpm --filter @app/contracts test     # 25 policy tests
pnpm --filter @app/api test           # lockout arithmetic + route-exposure gate
pnpm boundaries                       # no module reaches into another's internals
```

## What this deliberately does not do

* **No password history.** "Not one of your last N" is a table, a retention
  policy and a migration; it stops password reuse one round out of three and
  encourages `Summer2026!` → `Summer2027!`.
* **No breach-API lookup.** Sending candidate passwords to Have I Been Pwned
  is a network dependency in the sign-up path. The embedded dictionary covers
  the same class of password for the cases this template ships with.
* **No per-user policy overrides.** One deployment, one policy; a stricter rule
  for admins belongs in a role-based check, not in a password column.