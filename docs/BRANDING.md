# Branding, avatars and uploaded backups

Three features that share one mechanism: **a presigned upload the server
verifies afterwards**. Learning it once covers all three.

## The upload handshake

```
1. POST   …/upload-url        { filename, contentType, size }
          → { key, uploadUrl }        presigned PUT, 15 minutes

2. PUT    <uploadUrl>         <bytes>          browser → object storage directly

3. POST   …/complete          { key }
          → the server reads the object back and checks it
```

Bytes never pass through the API, which is what keeps a 40 MB backup from
occupying an API worker.

Two checks happen at step 3, and both exist because step 2 cannot be trusted:

| Check | Why it cannot happen earlier |
|---|---|
| Real size against the limit | A presigned PUT signs the content type; it cannot cap the body |
| **Actual bytes against the declared type** | The bucket echoes whatever content type was signed, so a text file renamed `.png` would otherwise be accepted |

The byte check reads the image's magic number (PNG, JPEG, GIF, WebP, ICO) and
rejects anything that does not match what it claimed to be. A rejected object is
**deleted**, not merely ignored.

**SVG is not accepted anywhere.** An SVG can carry script, and any navigation to
its URL would execute it in this origin. The allow-list is raster-only.

---

## Avatars

```
POST   /api/profile/me/avatar/upload-url
POST   /api/profile/me/avatar/complete
DELETE /api/profile/me/avatar
```

An avatar is stored as a **key**, never a URL. A presigned URL written to the
database would be a dead link within the hour, so `avatarUrl` is resolved fresh
on every read.

Two sources, one field:

| Source | Column | Used when |
|---|---|---|
| Uploaded | `auth.users.avatar_key` | always wins |
| Provider (Google) | `auth.users.avatar_url` | fallback, and what returns after a delete |

The key lives on the **identity** table rather than in `profile`, because the
session, the user directory and the profile page all need it — and the module
contract forbids any of them importing another module. The kernel resolves it
(`platform/storage/avatar-url.ts`), so all three agree by construction.

Uploads are namespaced per user (`avatars/<userId>/…`) and the key a client
sends back is checked against that prefix, so nobody can point their avatar at
someone else's object.

---

## Branding

```
GET    /api/settings                    public — the login page needs it
PATCH  /api/settings                    { siteName }
POST   /api/settings/assets/:slot/upload-url     slot: logo | favicon
POST   /api/settings/assets/:slot/complete
DELETE /api/settings/assets/:slot
GET    /api/settings/assets/:slot       public — 302 to a fresh presigned URL
```

The site name and logo appear **before anyone signs in**, so reading is public
and writing needs `settings.write`.

### Why `logoUrl` is a redirect, not a bucket URL

`GET /api/settings` returns `/api/settings/assets/logo` — a stable path, not a
presigned URL. Each request to it redirects to a fresh presigned link.

A presigned URL in the response would expire; a long-lived one would be a
standing capability. The redirect keeps the value in the HTML permanently valid
while the underlying link stays short-lived, which is what makes it safe to put
in a `<title>`/`<link rel="icon">` and let the browser cache.

The web app appends `?v=<updatedAt>` when previewing, because the stable path
would otherwise be served from cache after a change.

### Where branding is read

`apps/web/src/lib/branding.ts` runs on the **server** and feeds
`generateMetadata()` (tab title, favicon) plus a context the sidebar and login
page read from.

It never throws. An unreachable API or a deployment that disabled the settings
module falls back to the built-in defaults, because a branding lookup must not
be able to take the site down.

Server-side fetches need a different base URL than the browser:

| Variable | Used by | Value inside Docker |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | the browser, baked in at build time | `http://localhost:3000` |
| `API_INTERNAL_URL` | the Next server | `http://api:3000` (the compose service name) |

Getting this wrong is invisible locally and breaks branding in a container.

---

## Uploading a backup

```
POST /api/backup/backups/upload-url   { filename, size } → presigned PUT
POST /api/backup/backups/:id/complete → validated, then listed
```

The same handshake, with a stronger step 3: the archive is **extracted and its
manifest parsed** before the row becomes `ready`. An upload that is not a
readable archive is rejected and both the object and the row are removed, so a
broken file is caught at upload time rather than at 3am during a restore.

| Status | Meaning |
|---|---|
| `pending` | signed, bytes not yet confirmed — not listed, not restorable |
| `ready` | manifest parsed, safe to restore |

| Source | Meaning |
|---|---|
| `created` | built by this deployment |
| `uploaded` | arrived from elsewhere |

A restore refuses a backup that is not `ready`. The archive format version is
checked too, so a backup from a future schema is refused with a clear message
instead of failing halfway through.

This is the intended path for moving data between environments: take a backup in
staging, download it, upload it in production, restore in `merge` mode.
