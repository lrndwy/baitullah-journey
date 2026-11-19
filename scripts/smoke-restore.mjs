// End-to-end backup/restore verification against the running stack.
const API = process.env.API ?? 'http://127.0.0.1:3000'

const post = async (path, body, token) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

const get = async (path, token) => {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
  return { status: res.status, body: await res.json() }
}

const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@baitullahjourney.id'
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'ChangeMeNow1!'
const admin = (await post('/api/auth/login', { email: adminEmail, password: adminPassword })).body.accessToken
console.log('admin signed in')

const list = async () => (await get('/api/users?limit=50', admin)).body.items.map((u) => u.email)
const auditCount = async (token) => {
  // Page through, since the trail is longer than one page.
  let cursor
  let total = 0
  do {
    const q = `/api/audit/logs?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const page = (await get(q, token)).body
    if (!page?.items) return total
    total += page.items.length
    cursor = page.nextCursor
  } while (cursor)
  return total
}

const backups = (await get('/api/backup/backups?limit=1', admin)).body.items
const backupId = backups[0].id

const before = await list()
const auditBefore = await auditCount(admin)
console.log(`before replace: ${before.length} users, ${auditBefore} audit rows`)
console.log(`  post-backup user present: ${before.includes('after-backup@example.com')}`)

// Add one more user after the archive point, to prove replace removes it.
await post(
  '/api/users',
  { email: 'added-later@example.com', name: 'Added Later', roleKeys: ['member'] },
  admin,
)
console.log(`  added 'added-later@example.com'; users now ${(await list()).length}`)

const restore = await post(`/api/backup/backups/${backupId}/restore`, { mode: 'replace' }, admin)
console.log(`\nREPLACE -> HTTP ${restore.status}`)

if (restore.status !== 201 && restore.status !== 200) {
  console.log('response:', JSON.stringify(restore.body).slice(0, 400))
  process.exit(1)
}

const report = restore.body.report
console.log(`mode=${report.mode} duration=${report.durationMs}ms`)
for (const table of report.tables) {
  console.log(
    `  ${table.name.padEnd(26)} del=${table.deleted} ins=${table.inserted} upd=${table.updated}`,
  )
}
console.log(`  files: ${JSON.stringify(report.files)}`)

// The session used for the restore was cleared by the truncate, so a fresh
// sign-in is required — that is the intended behaviour, not a failure.
const relogin = await post('/api/auth/login', { email: adminEmail, password: adminPassword })
console.log(`\nre-sign-in after replace: HTTP ${relogin.status}`)
const admin2 = relogin.body.accessToken

const after = (await get('/api/users?limit=50', admin2)).body.items.map((u) => u.email)
const auditAfter = await auditCount(admin2)

console.log(`\nafter replace: ${after.length} users, ${auditAfter} audit rows`)
console.log(`  'added-later@example.com' removed: ${!after.includes('added-later@example.com')}`)
console.log(`  'after-backup@example.com' removed: ${!after.includes('after-backup@example.com')}`)
console.log(`  audit trail survived (undeclared table): ${auditAfter >= auditBefore}`)

const files = (await get('/api/storage/files?limit=10', admin2)).body.items
console.log(`  files after replace: ${files.length} -> ${files.map((f) => f.filename).join(', ')}`)