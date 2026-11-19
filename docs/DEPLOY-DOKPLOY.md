# Deploying on Dokploy

The release pipeline publishes two images to GHCR:

```
ghcr.io/developer-plenger/baitullah-journey-api:<tag>
ghcr.io/developer-plenger/baitullah-journey-web:<tag>
```

Dokploy runs them as **five separate services** in one project — Postgres, Redis,
object storage, `api`, `web` — and nothing is configured by rebuilding an image.
Every setting is an environment variable read at container start, which is why
the same tag works in staging and production.

| Service | Dokploy service type | Image |
| --- | --- | --- |
| `postgres` | Database → PostgreSQL | managed by Dokploy |
| `redis` | Database → Redis | managed by Dokploy |
| `rustfs` | Application (Docker image) | `rustfs/rustfs:latest` — or use external S3 |
| `api` | Application (Docker image) | `ghcr.io/…/baitullah-journey-api:<tag>` |
| `web` | Application (Docker image) | `ghcr.io/…/baitullah-journey-web:<tag>` |

---

## 1. Before you start

**A GitHub token to pull the images.** The repository is private, so its packages
are too. Create a *classic* PAT with **`read:packages`** (that is the only scope
needed to pull; `write:packages` is only for pushing, which the pipeline already
does with `GITHUB_TOKEN`).

**Three DNS records**, all pointing at the Dokploy server:

| Record | Points to | Purpose |
| --- | --- | --- |
| `app.example.com` | web | the dashboard |
| `api.example.com` | api | the API the browser calls |
| `s3.example.com` | object storage | **only if** you self-host RustFS |

Keep all three under the **same registrable domain**. The refresh token is an
`httpOnly` cookie with `sameSite=lax`, which the browser only sends on
same-site requests — two unrelated domains break session refresh in a way that
looks like a random logout.

**Secrets.** Generate them on your machine, never in the browser:

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
openssl rand -base64 24   # POSTGRES_PASSWORD
openssl rand -base64 24   # S3_SECRET_ACCESS_KEY
```

---

## 2. The four registry fields

Dokploy stores registry credentials per **Application**, under *General → Source →
Docker*. For **both** the `api` and the `web` service:

| Field | Value |
| --- | --- |
| **Docker Image** | `ghcr.io/developer-plenger/baitullah-journey-api:edge` |
| **Docker Registry URL** | `ghcr.io` |
| **Docker Registry Username** | your GitHub username, e.g. `developer-plenger` |
| **Docker Registry Password** | the `read:packages` PAT from step 1 |

The `web` service is identical except for the image name
(`…-web:edge`).

Notes that matter:

- **The tag belongs in the Docker Image field**, not in the registry URL.
- **Registry URL is the bare host** — `ghcr.io`, not `https://ghcr.io`.
- **Do not deploy `:edge` in production.** It moves on every push to `main`. Use
  an immutable tag — `:sha-62fc3c5` or `:main-62fc3c5` — and bump it deliberately.
  `:edge` is the right choice for a staging environment.
- Dokploy has a *Registry* section that stores the same credentials once and
  reuses them; either way works, the four fields above are what get sent.

---

## 3. Shared variables

Set these **once at project level** and reference them from each service. In
Dokploy: *Project → Shared Variables*. A service then reads them as
`${{project.NAME}}`.

```dotenv
# ── Database ──────────────────────────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<openssl rand -base64 24>
POSTGRES_DB=app

# ── Secrets ───────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>

# ── Public URLs (the addresses the browser uses) ──────────────────────────────
WEB_ORIGIN=https://app.example.com
API_PUBLIC_URL=https://api.example.com

# ── Object storage ────────────────────────────────────────────────────────────
S3_ACCESS_KEY_ID=rustfsadmin
S3_SECRET_ACCESS_KEY=<openssl rand -base64 24>
S3_BUCKET=app

# ── Google sign-in (see step 7 — without it a fresh deployment cannot be signed into) ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 4. Environment per service

### `postgres`

Set through Dokploy's own fields, not raw env: *User* `postgres`, *Password* the
value of `POSTGRES_PASSWORD`, *Database Name* `app`.

Then copy **Internal Connection URL** from the service's *Connection* panel — that
is the authoritative `DATABASE_URL`, and it is what step 5 pastes into the API.
Do **not** expose it externally; nothing outside the project needs it.

### `redis`

Dokploy's managed Redis needs no configuration. Its internal hostname is the
service name, port `6379`.

### `rustfs` (skip if you use external S3)

Application, Docker image `rustfs/rustfs:latest`, volume mounted at `/data`:

```dotenv
RUSTFS_ACCESS_KEY=${{project.S3_ACCESS_KEY_ID}}
RUSTFS_SECRET_KEY=${{project.S3_SECRET_ACCESS_KEY}}
RUSTFS_VOLUMES=/data
RUSTFS_OBS_LOGGER_LEVEL=warn
```

Add a domain `s3.example.com` targeting container port **9000**. The browser
uploads directly to this host, so it must be HTTPS and publicly reachable — the
API only signs the URL, it never proxies the bytes.

> **This is the step that breaks uploads.** If `S3_PUBLIC_ENDPOINT` is unset the
> API falls back to signing against `S3_ENDPOINT` — an in-network hostname like
> `http://rustfs:9000` — and every upload fails in the browser while the API log
> looks perfectly healthy. Both variables are required, and they are different
> addresses for the same bucket.

### `api`

```dotenv
NODE_ENV=production
PORT=3000

# Internal addresses — service names, reachable only inside the project.
DATABASE_URL=postgres://${{project.POSTGRES_USER}}:${{project.POSTGRES_PASSWORD}}@<postgres-service-name>:5432/${{project.POSTGRES_DB}}
REDIS_URL=redis://<redis-service-name>:6379

JWT_ACCESS_SECRET=${{project.JWT_ACCESS_SECRET}}
JWT_REFRESH_SECRET=${{project.JWT_REFRESH_SECRET}}

# Browser-facing: CORS is an exact-origin allow-list, so this must match the
# web origin character for character, including the scheme.
WEB_ORIGIN=${{project.WEB_ORIGIN}}
CORS_ORIGINS=

GOOGLE_CLIENT_ID=${{project.GOOGLE_CLIENT_ID}}
GOOGLE_CLIENT_SECRET=${{project.GOOGLE_CLIENT_SECRET}}
GOOGLE_CALLBACK_URL=https://api.example.com/api/auth/google/callback

# Object storage: one address for the API, one for the browser. Same bucket.
S3_ENDPOINT=http://<rustfs-service-name>:9000
S3_PUBLIC_ENDPOINT=https://s3.example.com
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=${{project.S3_ACCESS_KEY_ID}}
S3_SECRET_ACCESS_KEY=${{project.S3_SECRET_ACCESS_KEY}}
S3_BUCKET=${{project.S3_BUCKET}}
S3_FORCE_PATH_STYLE=true

# Never enable this in production: it hands out a session to any email, and the
# first account created becomes the administrator.
AUTH_DEV_LOGIN=false

# Without SMTP_URL, password-reset codes are only written to the API log.
# SMTP_URL=smtp://user:pass@smtp.example.com:587
MAIL_FROM=no-reply@example.com
LOG_LEVEL=info

# Turn modules off without rebuilding, e.g. MODULES_DISABLED=backup
MODULES_ENABLED=
MODULES_DISABLED=
```

Domain: `api.example.com` → container port **3000**.

The API applies migrations on boot, so the database must already be running and
reachable. A database that is down is a crash-loop, not a warning — deploy
Postgres first.

### `web`

```dotenv
NODE_ENV=production
PORT=3001

# Where the browser sends its requests. Read at container start and injected
# into the page — this is why changing it needs a restart, not a rebuild.
API_PUBLIC_URL=${{project.API_PUBLIC_URL}}

# Where the Next server itself reaches the API. The browser cannot resolve this
# one, which is exactly why it is separate.
API_INTERNAL_URL=http://<api-service-name>:3000
```

Domain: `app.example.com` → container port **3001**.

The web service needs no ordering relative to the API: the branding lookup has a
3-second timeout and falls back to defaults, so a web container that starts
before the API serves pages rather than failing.

---

## 4b. The API and its dependencies must share a Docker network

Dokploy does **not** put everything on one network:

- a **single Application** (the `api`, the `web`) joins the shared
  `dokploy-network`;
- a **Docker Compose** stack gets a network of its own when *Isolated
  Deployments* is on — and it is on by default for the templates. That network
  is named after the stack's `appName`, for example `hapis-rustfs-6zqcla`.

A container resolves only the names on a network it is attached to, so an API on
`dokploy-network` cannot resolve anything inside an isolated stack:

```
getaddrinfo ENOTFOUND hapis-rustfs-6zqcla
```

**This is the failure that looks like a storage bug and is not one.** The browser
keeps working, because Traefik is attached to *both* networks — so
`https://s3.example.com` routes, uploads land in the bucket, and the console
shows the file. The API, which has to reach the bucket directly to verify what
landed, is on the other network and cannot. The result is "the object was not
found in the bucket" for a file that is visibly there.

### Find the real name and network

On the Dokploy host:

```bash
# Which networks exist? The isolated one is named after the stack's appName.
docker network ls

# The container, and the network it is actually attached to.
docker ps --format '{{.Names}}' | grep -i rustfs
docker inspect --format \
  '{{range $name, $net := .NetworkSettings.Networks}}{{$name}} {{end}}' <container-name>

# The real Swarm service name — for a stack it is <stack>_<service>.
docker service ls | grep -i rustfs
```

The `appName` on its own is **not** a hostname. In Swarm the resolvable name is
the service name, which for a stack is `<stack>_<service>` — the compose service
name usually resolves too.

### Fix

**Preferred — put both services on one network.** In the `api` Application, open
the **Networks** section and attach the network the storage service is on, then
redeploy `api` and point `S3_ENDPOINT` at the name that now resolves:

```dotenv
S3_ENDPOINT=http://hapis-rustfs-6zqcla_rustfs:9000
```

The Networks section exists from the Dokploy release containing
[Dokploy/dokploy#3774](https://github.com/Dokploy/dokploy/pull/3774); before that,
attaching an Application to an existing network needed `docker network connect`
on the host, which does not survive a redeploy.

**Alternative — remove the isolation.** Turn *Isolated Deployments* off for the
storage stack, so its services join `dokploy-network`, and use the compose
service name (`rustfs`).

**Fastest unblock, with a cost.** Set `S3_ENDPOINT` to the same public URL as
`S3_PUBLIC_ENDPOINT` (`https://s3.example.com`). The API then reaches the bucket
exactly as the browser does. It works, but the API's own traffic leaves the host
and comes back through Traefik, and now depends on public DNS and TLS.

### Verify

From inside the `api` container:

```bash
# Does the name resolve now? Prints the hostname and the address, or the error.
node -e "const u=new URL(process.env.S3_ENDPOINT); require('dns').lookup(u.hostname,(e,a)=>console.log(u.hostname,'->',e?e.code:a))"

# And is the bucket reachable over it?
node -e "fetch(process.env.S3_ENDPOINT+'/'+process.env.S3_BUCKET+'/',{method:'HEAD'}).then(r=>console.log('bucket',r.status)).catch(e=>console.log('UNREACHABLE',e.cause?.code||e.message))"
```

---

## 4c. When the API is refused by the object store

Once the endpoint resolves, an upload can still fail with
`storage_unauthorized` (HTTP 503 with `status: 403` in the details). That means
the store answered and **refused the request** — a different problem from the
one above, and the one that looks most like a bug because the file may still be
sitting in the bucket.

The reason it is confusing: **the API and the browser authenticate differently.**

| Path | Who | How the request is signed |
| --- | --- | --- |
| Browser upload | presigned `PUT` | signature travels in the **query string** |
| API verification | `HEAD` / `GET` | signature travels in the **`Authorization` header** |

So a proxy or WAF that strips or rewrites `Authorization` — while leaving the
query string alone — lets the upload succeed and refuses the verification. The
file is in the bucket, the console shows it, and the API says it cannot read it.

### Run the diagnostic

```bash
docker exec -it <api-container> node apps/api/scripts/diagnose-storage.mjs --write
```

It prints the configuration the API is using, resolves both endpoints, asks who
answers without credentials, then makes **both kinds of request** and compares
them:

| Step 3 (signed HEAD) | Step 5 (presigned PUT) | Meaning |
| --- | --- | --- |
| 404 | — | healthy: the credentials work, the key simply does not exist |
| **403** | **200** | the store accepts presigned URLs but refuses the header — something between the container and the store is stripping `Authorization` |
| **403** | **403** | the credentials or the endpoint are wrong for both paths |

Read the `reason` it reports: `SignatureDoesNotMatch` means the secret or the
region is wrong; `AccessDenied` means the credentials are valid but lack
permission on that bucket.

### What each answer means

**403 on both.** `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` do not match the
store. Note that a *presigned URL is signed with the API's own credentials*, so
wrong credentials break the upload too — and a browser PUT failure never reaches
the API log, because the browser talks to the store directly. Check the
browser's network tab for the `PUT` status.

**403 on the signed request, 200 on the presigned one.** The store is fine and
the credentials are fine; a proxy in the path is dropping the `Authorization`
header. Check what the proxy forwards, or point `S3_ENDPOINT` at the store
directly, bypassing it.

**`SignatureDoesNotMatch` with correct credentials.** The `Host` header is part
of the signature. A proxy that rewrites it (public host in, internal host out)
invalidates every signed request while leaving presigned URLs working, because
they are validated against the URL the client actually used. Fix the proxy's
host handling, or use the internal name for `S3_ENDPOINT`.

**`AccessDenied` with valid credentials.** The key is right but the policy does
not allow the operation. Verification needs `s3:GetObject` (the `HEAD`), and the
listing needs `s3:ListBucket`.

**`InvalidAccessKeyId`.** The store does not recognise the access key at all. If
the browser upload succeeds and the API is refused, the two variables are
pointing at **different stores**: the browser wrote to one, the API is reading
from another. This is easy to do by accident, because both hostnames look like
"the object storage" — check that `S3_ENDPOINT` and `S3_PUBLIC_ENDPOINT` resolve
to the same service and that the credentials belong to the one in
`S3_ENDPOINT`.

### When the refusals are intermittent

A 403 that comes and goes, on requests that are otherwise correct, points at
something in front of the object store rather than at the credentials. Measured
against a Cloudflare-fronted RustFS: the same existing object answered 200 to
fourteen HEADs and 403 to the fifteenth, then 60 out of 60 clean a few minutes
later. The 403 carried an S3-style XML body and an `x-amz-request-id`, so it came
from the store — but it was not reproducible on demand.

**The most common cause is routing the API's own S3 traffic through a CDN.** With
`S3_ENDPOINT` set to the public URL, every verification crosses Cloudflare, and
any transient refusal there fails an upload whose file is already in the bucket.
Check the Cloudflare security settings for that hostname — Bot Fight Mode and an
elevated Security Level block datacenter IPs, which is exactly what a VPS is,
while a residential connection passes.

The durable fix is the same one as [4b](#4b-the-api-and-its-dependencies-must-share-a-docker-network):
give `S3_ENDPOINT` an address that does not traverse the CDN, and leave
`S3_PUBLIC_ENDPOINT` as the only public one.

The API also defends itself: if the store refuses a verification `HEAD`, it
retries the check with a one-byte ranged `GET` before reporting a failure, and
logs that it did. That is a safety net, not a fix — the endpoint still needs
attention, and the log line names it.

---

## 5. Order of operations

Dokploy has no `depends_on` between separate services, so create them in
dependency order and wait for each to be healthy:

1. **`postgres`** → wait for *Running*. Copy its **Internal Connection URL**.
2. **`redis`** → wait for *Running*.
3. **`rustfs`** (if self-hosting) → wait for *Running*, then confirm
   `https://s3.example.com` answers.
4. **`api`** → paste the connection URL from step 1 into `DATABASE_URL`. Watch
   the deploy log for:
   ```
   migrations up to date
   permission catalogue synchronised
   api listening
   ```
   Then check `https://api.example.com/ready` → `{"status":"ready","checks":{"database":true,"redis":true}}`.
5. **`web`** → wait for *Running*, then open `https://app.example.com/login`.

---

## 6. Confirm the internal hostnames

The env blocks above say `<postgres-service-name>`, `<redis-service-name>` and
`<api-service-name>` because that is the one value Dokploy does not derive for
you. **The hostname is the service name as it appears in the project.**

Postgres and Redis print it for you — *Connection → Internal Host* and *Internal
Connection URL* — so copy from there rather than guessing.

For the `api` service, name the Application `api` and verify from inside the web
container:

```bash
# On the Dokploy host:
docker ps --format '{{.Names}}' | grep -i api
docker exec <web-container> node -e "fetch('http://api:3000/health').then(r=>console.log(r.status))"
```

If that hangs, Swarm's VIP load balancer is the usual cause (kernels without
IPVS support); Dokploy documents the workaround — use `tasks.api` instead of
`api` in the URL.

---

## 7. The first sign-in

**A fresh deployment has no users, and the first account created becomes the
administrator.** That account cannot be created with a password, because
creating users requires being an administrator already.

In production `AUTH_DEV_LOGIN` is refused outright, so the bootstrap path is
**Google sign-in**:

1. In Google Cloud Console → *APIs & Services* → *Credentials*, create an OAuth
   **Web application** client.
2. Authorised redirect URI: `https://api.example.com/api/auth/google/callback`.
3. Put the client ID and secret in the project variables, then redeploy the
   `api` service.
4. Open `https://app.example.com/login`, click **Continue with Google**, and sign
   in. That account is now the administrator and can invite everyone else.

If Google is not configured, there is no way in. `AUTH_DEV_LOGIN` is refused in
production, and `/api/auth/login` needs a password that no account has yet — so
the deployment is unreachable until an OAuth client exists.

---

## 8. Verification

```bash
curl -s https://api.example.com/health   # {"status":"ok",...}
curl -s https://api.example.com/ready    # {"status":"ready","checks":{"database":true,"redis":true}}
curl -sI https://app.example.com/login   # 200
```

Then, from the browser, on the profile page: **upload a photo**. That single
action exercises the whole chain — presigned URL, bucket CORS, and the browser's
reachability of `S3_PUBLIC_ENDPOINT` — and it is the one that fails silently when
storage is misconfigured.

---

## 9. When something is wrong

| Symptom | Cause |
| --- | --- |
| API container restarts in a loop | `DATABASE_URL` unreachable, or `JWT_*_SECRET` under 16 characters. The boot log names the variable. |
| API logs `could not reach object storage at boot` | `S3_ENDPOINT` wrong, or RustFS not up yet. The API keeps serving; uploads answer 503. |
| Upload fails in the browser, API log clean | `S3_PUBLIC_ENDPOINT` missing or not browser-reachable — the presigned URL points at an in-network hostname. |
| **"The object was not found in the bucket" although the console shows the file** | The API and the browser are looking at different places. The presigned PUT is signed against `S3_PUBLIC_ENDPOINT` and the verification HEAD runs against `S3_ENDPOINT`, so those two must reach the *same bucket*. Check the API log for `could not reach object storage at boot` — it names the endpoint and bucket the API is using — and compare with what the console shows. |
| `getaddrinfo ENOTFOUND <name>` in the API log | The API cannot resolve that hostname. Either it is the stack's `appName` rather than a service name, or the API is not on the same Docker network as the storage service — see [4b](#4b-the-api-and-its-dependencies-must-share-a-docker-network). |
| `storage_unauthorized` / HTTP 503 with `status: 403` | The store answered and refused the request. The file may still be in the bucket, because the browser uploads with a presigned URL and the API verifies with a signed header — see [4c](#4c-when-the-api-is-refused-by-the-object-store). |
| `storage_unauthorized` that comes and goes | Something in front of the store is refusing requests intermittently. Look at the CDN's security settings, and give `S3_ENDPOINT` an address that bypasses it — see [4c](#when-the-refusals-are-intermittent). |
| `InvalidAccessKeyId` | The store does not know that access key. `S3_ENDPOINT` and `S3_PUBLIC_ENDPOINT` are probably different stores — the browser uploaded to one, the API is reading the other. |
| Upload fails in the browser, nothing in the API log | The browser talks to the store directly, so its failures never reach the API. Check the network tab for the `PUT` status — 403 there means the presigned URL itself was refused. |
| Upload fails with a CORS error | The bucket's CORS policy does not include the web origin. The API applies it at boot from `WEB_ORIGIN`; check the log for `bucket CORS policy applied`. |
| Signed in, then logged out on refresh | `WEB_ORIGIN` does not exactly match the browser origin, or web and API are on unrelated domains and the `sameSite=lax` cookie is withheld. |
| `Docker Image` pull fails | PAT missing `read:packages`, or the tag does not exist. `ghcr.io` requires the token even for a package the repository owns. |
| Every request from the browser 401s | `NEXT_PUBLIC_API_URL` was baked at build time, but `API_PUBLIC_URL` is what matters at runtime — confirm the page source contains `window.__APP_CONFIG__` with the right origin. |
