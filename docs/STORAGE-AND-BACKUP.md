# Storage, backups and restore

## Object storage

Any S3-compatible server works — **RustFS, MinIO, MaxIO**, or AWS S3 itself. The
kernel owns a single `ObjectStore` (`apps/api/src/platform/storage`), so the
`storage` and `backup` modules share one client without importing each other.

```bash
S3_ENDPOINT=http://rustfs:9000          # what the API talks to (in-cluster)
S3_PUBLIC_ENDPOINT=http://localhost:9000 # what the browser talks to (presigning)
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
S3_BUCKET=app
S3_FORCE_PATH_STYLE=true                # required by RustFS, MinIO and most gateways
```

Two endpoints, deliberately:

- `S3_ENDPOINT` is the address the **API** uses. Inside Docker that is a service
  name the browser cannot resolve.
- `S3_PUBLIC_ENDPOINT` is the address presigned URLs are **signed against**.
  Without it, a URL handed to a browser points at `rustfs:9000` and fails.

The bucket is created on boot if it is missing. That is done in the application
rather than a `mc`/`aws` sidecar because RustFS, MinIO and MaxIO do not share a
CLI — but they all implement the same bucket API.

### Upload and download

Bytes never pass through the API:

```
1. POST /api/storage/files            { filename, contentType, size, visibility }
   → { fileId, key, uploadUrl }        presigned PUT, 15 min

2. PUT <uploadUrl>  <bytes>            browser → object storage directly

3. POST /api/storage/files/:id/complete
   → the server HEADs the object and marks the row `ready`
```

Step 3 exists because a signature proves nothing: a client that requests one and
never uploads leaves a `pending` row, not a phantom file. Only a record whose
object is confirmed present is listed or downloadable.

Downloads return a presigned GET (15 min). `visibility: 'public'` is readable by
any signed-in caller; `private` is restricted to the uploader unless the caller
holds `storage.file.read`, which is what makes someone a file administrator.

**Ceiling:** `ObjectStore.get()` buffers the whole object in memory. Fine for
documents and backups of modest size; move to `@aws-sdk/lib-storage` streaming if
you need to move multi-gigabyte objects.

---

## Backups

A backup is a `.tar.gz` in the object bucket containing:

```
manifest.json         format version, tables, columns, primary keys, object list
data/<schema>__<table>.ndjson    one JSON object per line
objects/<key>         the stored file bytes (when includeFiles is set)
```

### What is included — and what is not

The archive contains **only tables a module declares** in its manifest:

```ts
export const usersManifest: ModuleManifest = {
  tables: [users, oauthAccounts],   // parents before children
  // …
}
```

That one decision produces the useful behaviour:

| Table | Declared | In a backup | Why |
|---|---|---|---|
| `auth.users` | yes | ✅ | the data you actually want |
| `rbac.*` | yes | ✅ | roles and grants travel with the users |
| `profile.user_profiles` | yes | ✅ | profile data |
| `storage.files` | yes | ✅ | file metadata |
| `auth.sessions` | no | ❌ | live credentials must not travel in an archive |
| `auth.password_reset_codes` | no | ❌ | short-lived secrets |
| `audit.audit_logs` | no | ❌ | the trail is infrastructure, not tenant data |
| `backup.backups` | no | ❌ | an archive cannot contain itself |

Because undeclared tables are invisible to restore, **restoring a backup can
never silently empty the audit trail**, and never has to reason about schema
ordering it cannot see.

### Export

```
POST /api/backup/backups  { label?, includeFiles? }
```

Writes NDJSON per table, streams each declared object into the archive, uploads
it, and records the manifest in `backup.backups` for inspection without a
download.

### Restore

```
POST /api/backup/backups/:id/restore  { mode: 'merge' | 'replace' }
```

The whole data import runs in **one transaction** on a single connection. A
failure mid-restore leaves the database exactly as it was.

#### `merge` — the database is the truth

Rows are matched on primary key. Existing rows are overwritten with the archive's
values; rows that do not exist are inserted; **nothing is deleted**. Files that
are still present are skipped.

Safe on a live system. Use it to restore a user someone deleted by mistake, or to
push a corrected dataset into an environment that has newer work.

```
auth.users      del=0 ins=0 upd=7 skip=0
rbac.user_roles del=0 ins=0 upd=0 skip=7     ← primary key is the whole row
files           written=0 skipped=2
```

#### `replace` — the archive is the truth

Every declared table is emptied, then filled from the archive. The database ends
up equal to the backup. Anything created afterwards is gone.

Two deliberate consequences:

- **Every session ends.** `auth.sessions` and `auth.password_reset_codes` are
  truncated even though they are never archived — a restored database must not
  keep sessions issued against the pre-restore state.
- **The audit trail survives.** It is not declared, so it is not touched. The
  record of the restore itself is written afterwards.

```
auth.users       del=9 ins=7    ← 9 present, 7 restored
rbac.roles       del=2 ins=2
storage.files    del=2 ins=2
files            deleted=2 written=2   ← the bucket is replaced too
```

Files behave differently between modes: `replace` clears the `files/` prefix
before writing, so the bucket matches the archive; `merge` only writes objects
that are missing.

### Operator notes

- **Take a backup before a `replace`.** The API offers no undo.
- Archives are ordinary objects. Copy them off the bucket for real disaster
  recovery — a backup that lives only on the disk that failed is not a backup.
- The API returns a per-table report (`deleted` / `inserted` / `updated` /
  `skipped`) and the admin UI renders it, so a restore is verifiable rather than
  a leap of faith.

---

## Verifying restore semantics

`scripts/smoke-restore.mjs` runs the whole thing against a live stack: it signs
in, takes a backup, adds a row, restores in `replace`, and asserts that the new
row is gone, the archived rows are back, the audit trail survived and the caller
was signed out.

```bash
docker compose -f docker/docker-compose.yml up -d
node scripts/smoke-restore.mjs
```