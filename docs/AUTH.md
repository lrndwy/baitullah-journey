# Authentication and authorization

Two different questions, answered in two different places. Keeping them apart is
what stops a codebase from growing an `if (user.isAdmin)` in every handler.

| | Authentication | Authorization |
|---|---|---|
| Question | *Who is calling?* | *May they do this?* |
| Where | `platform/security/auth.guard.ts` | `platform/security/permissions.guard.ts` |
| Input | `Authorization: Bearer <jwt>` | `@RequirePermissions('users.delete')` |
| Failure | `401 unauthorized` | `403 forbidden` |
| Owner | the `auth` module | the `rbac` module |

Both run on **every** route. The only opt-out is an explicit `@Public()`.

---

## Authentication

### The three credentials

| Credential | Lifetime | Where it lives | Why |
|---|---|---|---|
| Access token (JWT) | 15 min | Browser memory only | Verified without a database round trip, so the hot path stays cheap |
| Refresh token | 30 days | `httpOnly` cookie, hashed in Postgres | A script cannot read it, and a database leak cannot replay it |
| Password | — | scrypt hash in Postgres | Only for accounts that opt into email + password |

The access token is never written to `localStorage`. A page reload re-runs the
refresh flow instead, which costs one request and removes the most common token
theft vector.

### The flows

```
Google sign-in
  browser → GET /api/auth/google            → redirect to Google
  Google  → GET /api/auth/google/callback   → park profile in Redis, redirect with ?code
  browser → POST /api/auth/exchange {code}  → session + tokens

Email + password
  browser → POST /api/auth/login {email, password}

Every subsequent request
  browser → Authorization: Bearer <jwt>     → AuthGuard verifies, resolves roles
  on 401  → POST /api/auth/refresh (cookie) → one transparent retry
```

Tokens in a redirect URL end up in browser history, server logs and `Referer`
headers. That is why the OAuth callback hands back a **single-use code** instead
(120-second TTL, stored in Redis, consumed once).

### Why refresh tokens rotate

Every refresh invalidates the presented token and issues a new one. A stolen
refresh token therefore works only until the legitimate client refreshes — after
which the copy is dead. There is no reuse-detection window to reason about.

### Password reset

```
POST /api/auth/password/forgot {email}          → emails a 6-digit code
POST /api/auth/password/reset  {email, code, newPassword}
POST /api/auth/password/change {currentPassword, newPassword}   (signed in)
POST /api/auth/password/reset-for/:userId                        (administrator)
```

The administrator variant issues the **same single-use code** and mails it. The
admin never chooses or sees the new password: an action that sets someone else's
credentials is an action nobody can be held to, and it turns a support tool into
an account-takeover tool. It is gated on `auth.password.reset_request` and lands
in the audit trail as `auth.password.reset_requested_by_admin`.

- The response is **identical** for an unknown address, so the endpoint cannot be
  used to enumerate accounts. Wrong passwords take the same code path.
- Only the code's SHA-256 hash is stored; comparison is constant-time.
- A code is single-use, expires, and dies after a bounded number of wrong guesses.
- Any successful reset **revokes every session** for that user. If the reason for
  the reset was a compromised account, the attacker's session must stop working.

---

## Authorization

### The model

```
user ──< user_roles >── role ──< role_permissions >── permission
```

A permission is a string like `users.delete`. A role is a named set of them. A
user holds roles. Nothing else.

The guard flattens the user's roles into a permission list once per request and
checks it — **the only place in the codebase that decides**. A module never
implements its own authorisation logic; it declares what it needs:

```ts
@RequirePermissions('users.delete')
@Delete(':id')
async remove(@Param(…) params: { id: string }) { … }
```

### Where permissions come from

Modules contribute them, in the manifest:

```ts
export const usersManifest: ModuleManifest = {
  permissions: [
    { key: 'users.read',   description: 'List and inspect users' },
    { key: 'users.delete', description: 'Delete users' },
  ],
  // …
}
```

At boot the `rbac` module reconciles those with the `rbac.permissions` table:
declared keys are upserted onto their roles (`admin` receives all of them), and
keys that no longer exist — because a module was removed — are deleted along
with their role grants.

**That reconciliation is what makes module removal safe.** Install a module and
its permissions appear; remove it and they disappear, along with any grants.

### Three layers of authorisation

| Layer | Example | Enforced by |
|---|---|---|
| Route permission | `@RequirePermissions('storage.file.delete')` | `PermissionsGuard` |
| Ownership | a private file belongs to its uploader | the module's service |
| Capability | `storage.file.read` makes you a file administrator | the module's service |

Route permissions are declarative and uniform. Ownership and capability rules are
genuinely module-specific, so they live in the service — but they are always a
`ForbiddenError`, never a silent empty result.

### Three things that are deliberately *not* permissions

- **Your own profile.** `GET /api/profile/me` requires only a session. Editing
  yourself is not a privilege.
- **Reading the module list.** `GET /api/_meta/modules` is public: it is
  deployment metadata, not user data.
- **Recording an audit entry.** The kernel interceptor records unconditionally.
  A compliance trail that modules can skip is not a compliance trail.

### Why permissions are resolved per request

A cached permission set keeps a revoked role effective until the TTL expires.
For an authorization check that is a security bug, not a performance win. The
resolution is one indexed join; when profiling says it matters, add a cache with
explicit invalidation on role writes — never a bare TTL.

---

## Adding a new permission

1. Declare it in the owning module's manifest.
2. Annotate the routes that need it.
3. Restart. The catalogue and the `admin` role pick it up automatically; assign
   it to other roles from **Admin → Roles**.

Step 3 is the point: no migration, no seeding script, no code change in the
kernel or in `rbac`.
