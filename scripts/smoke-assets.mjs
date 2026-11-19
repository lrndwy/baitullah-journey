// End-to-end check for the asset uploads: site settings, avatar, backup upload.
const API = process.env.API ?? 'http://127.0.0.1:3000'

const call = async (path, { method = 'GET', body, token, raw } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body || raw ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
    redirect: 'manual',
  })
  const text = await res.text()
  let parsed = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text.slice(0, 120)
  }
  return { status: res.status, body: parsed, location: res.headers.get('location') }
}

/** A 1×1 PNG — small, real, and valid. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const uploadImage = async (signPath, completePath, token, bytes = PNG, type = 'image/png') => {
  const signature = await call(signPath, {
    method: 'POST',
    token,
    body: { filename: 'test.png', contentType: type, size: bytes.length },
  })
  if (signature.status >= 400) return { step: 'sign', ...signature }

  const put = await fetch(signature.body.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': type },
    body: bytes,
  })
  if (!put.ok) return { step: 'put', status: put.status }

  const done = await call(completePath, { method: 'POST', token, body: { key: signature.body.key } })
  return { step: 'complete', ...done }
}

const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@baitullahjourney.id'
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'ChangeMeNow1!'
const admin = (
  await call('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  })
).body
const token = admin.accessToken
console.log(`signed in as ${admin.user.email}\n`)

// ── 1. settings readable without a session ───────────────────────────────────
const anonSettings = await call('/api/settings')
console.log(`1. GET /api/settings without a token -> ${anonSettings.status}, siteName="${anonSettings.body?.settings?.siteName}"`)

// ── 2. rename the site ───────────────────────────────────────────────────────
const renamed = await call('/api/settings', {
  method: 'PATCH',
  token,
  body: { siteName: 'Acme Operations' },
})
console.log(`2. PATCH siteName -> ${renamed.status}, now "${renamed.body?.settings?.siteName}"`)

// ── 3. logo upload ───────────────────────────────────────────────────────────
const logo = await uploadImage('/api/settings/assets/logo/upload-url', '/api/settings/assets/logo/complete', token)
console.log(`3. logo upload -> ${logo.status}, logoUrl=${logo.body?.settings?.logoUrl ?? logo.body?.error?.message}`)

const redirect = await call('/api/settings/assets/logo')
console.log(`   GET /api/settings/assets/logo -> ${redirect.status}, redirects to ${String(redirect.location).slice(0, 42)}…`)

// ── 4. avatar upload ─────────────────────────────────────────────────────────
const avatar = await uploadImage('/api/profile/me/avatar/upload-url', '/api/profile/me/avatar/complete', token)
const avatarUrl = avatar.body?.profile?.avatarUrl ?? ''
console.log(`4. avatar upload -> ${avatar.status}, avatarUrl host=${avatarUrl ? new URL(avatarUrl).host : '—'}, presigned=${avatarUrl.includes('X-Amz-Signature')}`)

// ── 5. reject a non-image ────────────────────────────────────────────────────
const badImage = await uploadImage(
  '/api/settings/assets/favicon/upload-url',
  '/api/settings/assets/favicon/complete',
  token,
  Buffer.from('not an image at all'),
  'image/png',
)
console.log(`5. non-image content type guard -> complete ${badImage.status}: ${badImage.body?.error?.code ?? 'accepted?'}`)

// ── 6. backup upload: make one, download it, upload it back ──────────────────
const created = await call('/api/backup/backups', { method: 'POST', token, body: { label: 'round-trip', includeFiles: false } })
const archiveUrl = (await call(`/api/backup/backups/${created.body.backup.id}/download`, { token })).body.url
const archive = Buffer.from(await (await fetch(archiveUrl)).arrayBuffer())
console.log(`\n6. made a backup (${archive.length} bytes), now uploading it back`)

const signBackup = await call('/api/backup/backups/upload-url', {
  method: 'POST',
  token,
  body: { filename: 'round-trip.tar.gz', size: archive.length },
})
const putBackup = await fetch(signBackup.body.uploadUrl, {
  method: 'PUT',
  headers: { 'content-type': 'application/gzip' },
  body: archive,
})
const completed = await call(`/api/backup/backups/${signBackup.body.backupId}/complete`, { method: 'POST', token })
console.log(`   PUT -> ${putBackup.status}; complete -> ${completed.status}`)
console.log(`   stored: source=${completed.body?.backup?.source} status=${completed.body?.backup?.status} tables=${completed.body?.backup?.tables} rows=${completed.body?.backup?.rows}`)

// ── 7. reject a corrupt archive, and leave nothing behind ────────────────────
const junkSign = await call('/api/backup/backups/upload-url', {
  method: 'POST',
  token,
  body: { filename: 'not-a-backup.tar.gz' },
})
await fetch(junkSign.body.uploadUrl, {
  method: 'PUT',
  headers: { 'content-type': 'application/gzip' },
  body: Buffer.from('this is definitely not a gzipped tar archive'),
})
const junkComplete = await call(`/api/backup/backups/${junkSign.body.backupId}/complete`, { method: 'POST', token })
console.log(`\n7. corrupt archive -> complete ${junkComplete.status}: ${junkComplete.body?.error?.message ?? 'ACCEPTED (bad)'}`)

const list = await call('/api/backup/backups?limit=50', { token })
const stillThere = list.body.items.some((item) => item.id === junkSign.body.backupId)
console.log(`   rejected upload removed from the list: ${!stillThere}`)
console.log(`   backups listed: ${list.body.total} (sources: ${[...new Set(list.body.items.map((i) => i.source))].join(', ')})`)