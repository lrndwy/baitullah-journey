import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Inject, Injectable, type Logger } from '@nestjs/common'
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { PoolClient } from 'pg'
import {
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
  buildPage,
  decodeCursor,
  keysetCondition,
  normalizeLimit,
  type DatabaseHandle,
  type EventBus,
  type Page,
} from '@app/core'
import type {
  BackupSummary,
  BackupUploadRequest,
  BackupUploadSignature,
  CreateBackupInput,
  RestoreMode,
  RestoreReport,
  RestoreTableReport,
} from '@app/contracts'
import * as tar from 'tar'
import { DATABASE, EVENT_BUS, LOGGER } from '../../platform/tokens'
import { ModuleRegistry } from '../../platform/registry/module.registry'
import { ObjectStore } from '../../platform/storage/object-store.service'
import {
  BACKUPS_PREFIX,
  BACKUP_FORMAT_VERSION,
  FILES_PREFIX,
  VOLATILE_TABLES,
  type BackupManifestFile,
} from './backup.manifest'
import { backups } from './backup.schema'

/** Rows per INSERT statement: large enough to be fast, small enough to bind. */
const INSERT_BATCH = 500

/** Long enough for a large archive on a slow link. */
const UPLOAD_TTL_SECONDS = 3600

interface ResolvedTable {
  id: string
  module: string
  schema: string
  name: string
  columns: string[]
  primaryKey: string[]
}

type TableEntry = BackupManifestFile['tables'][number]

@Injectable()
export class BackupService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    @Inject(LOGGER) private readonly logger: Logger,
    private readonly objects: ObjectStore,
    private readonly registry: ModuleRegistry,
  ) {}

  /**
   * Writes a `.tar.gz` holding NDJSON per table, the stored object bytes, and a
   * self-describing manifest — so restoring needs nothing about the schema
   * version that produced it beyond what the archive itself states.
   */
  async create(input: CreateBackupInput, createdBy: string): Promise<BackupSummary> {
    this.requireStorage()

    const id = randomUUID()
    const workDir = await mkdtemp(join(tmpdir(), 'backup-'))
    const startedAt = Date.now()

    try {
      const manifest: BackupManifestFile = {
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        appModules: this.registry.manifests().map((entry) => entry.name),
        tables: [],
        objects: [],
      }

      await mkdir(join(workDir, 'data'), { recursive: true })

      for (const table of this.resolvedTables()) {
        const result = await this.database.pool.query<Record<string, unknown>>(
          `SELECT * FROM ${qualified(table.schema, table.name)}`,
        )
        const dataFile = `data/${table.id.replace('.', '__')}.ndjson`
        await writeFile(
          join(workDir, dataFile),
          result.rows.map((row) => JSON.stringify(row)).join('\n'),
          'utf8',
        )

        manifest.tables.push({
          id: table.id,
          module: table.module,
          columns: table.columns,
          primaryKey: table.primaryKey,
          dataFile,
          rows: result.rows.length,
        })
      }

      if (input.includeFiles) manifest.objects = await this.captureObjects(workDir)

      await writeFile(join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

      const archivePath = join(workDir, 'archive.tar.gz')
      await tar.create({ gzip: true, file: archivePath, cwd: workDir }, ['.'])
      const archive = await readFile(archivePath)

      const key = `${BACKUPS_PREFIX}${id}.tar.gz`
      await this.objects.put(key, archive, 'application/gzip')

      const rows = manifest.tables.reduce((sum, entry) => sum + entry.rows, 0)

      await this.database.db.insert(backups).values({
        id,
        label: input.label ?? null,
        key,
        size: archive.byteLength,
        trigger: 'created',
        status: 'ready',
        createdBy,
        tables: manifest.tables.length,
        rows,
        files: manifest.objects.length,
        manifest,
      })

      await this.events.emit('backup.created', { backupId: id, size: archive.byteLength })

      return {
        id,
        label: input.label ?? null,
        createdAt: manifest.createdAt,
        size: archive.byteLength,
        source: 'created',
        status: 'ready',
        mode: 'merge',
        createdBy,
        tables: manifest.tables.length,
        rows,
        files: manifest.objects.length,
      }
    } finally {
      this.logger.debug({ id, durationMs: Date.now() - startedAt }, 'backup archive built')
      await rm(workDir, { recursive: true, force: true })
    }
  }

  async list(cursor: string | undefined, limit: number | undefined): Promise<Page<BackupSummary>> {
    const pageSize = normalizeLimit(limit)
    const position = cursor ? decodeCursor(cursor) : undefined

    // A pending upload is not a backup yet, so it must not be offered for restore.
    const ready = eq(backups.status, 'ready')
    const pageFilter = position
      ? and(keysetCondition(backups.createdAt, backups.id, position), ready)
      : ready

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(backups)
        .where(ready),
      this.database.db
        .select()
        .from(backups)
        .where(pageFilter)
        .orderBy(desc(backups.createdAt), desc(backups.id))
        .limit(pageSize + 1),
    ])

    const total = countRows[0]?.total ?? 0
    const page = buildPage(rows, pageSize, total)
    return {
      ...page,
      items: page.items.map((row) => ({
        id: row.id,
        label: row.label,
        createdAt: row.createdAt.toISOString(),
        size: row.size,
        source: row.trigger === 'uploaded' ? ('uploaded' as const) : ('created' as const),
        status: 'ready' as const,
        mode: 'merge' as RestoreMode,
        createdBy: row.createdBy,
        tables: row.tables,
        rows: row.rows,
        files: row.files,
      })),
    }
  }

  async downloadUrl(backupId: string): Promise<{ url: string; filename: string }> {
    this.requireStorage()
    const backup = await this.findBackup(backupId)
    return {
      url: await this.objects.presignGet(backup.key, 900),
      filename: `backup-${backup.createdAt.toISOString().slice(0, 10)}-${backup.id.slice(0, 8)}.tar.gz`,
    }
  }

  /**
   * The dangerous operation, so the semantics are stated plainly:
   *
   * - `replace` empties every declared table — plus the credential tables,
   *   which are never archived — before inserting. The database ends up equal
   *   to the archive. Undeclared tables, the audit trail included, are untouched.
   *   Every session ends, by design: the archive contains no live credentials.
   * - `merge` never deletes. Rows are matched on primary key: existing rows are
   *   overwritten with the archive's values, missing rows are inserted.
   */
  async restore(backupId: string, mode: RestoreMode): Promise<RestoreReport> {
    this.requireStorage()

    const startedAt = Date.now()
    const backup = await this.findBackup(backupId)

    if (backup.status !== 'ready') {
      throw new BadRequestError('This backup has not finished uploading')
    }

    const extracted = await this.extractArchive(await this.objects.get(backup.key))
    const workDir = extracted.workDir
    const manifest = extracted.manifest

    try {
      const reports = await this.runInTransaction(async (client) => {
        const deleted = mode === 'replace' ? await this.truncateAll(client) : new Map<string, number>()

        const results: RestoreTableReport[] = []
        for (const entry of manifest.tables) {
          const rows = await readRows(workDir, entry.dataFile)
          results.push(
            mode === 'replace'
              ? await this.insertAll(client, entry, rows, deleted.get(entry.id) ?? 0)
              : await this.upsertAll(client, entry, rows),
          )
        }
        return results
      })

      const files = await this.restoreObjects(workDir, manifest, mode)

      await this.events.emit('backup.restored', { backupId, mode })

      return { mode, backupId, tables: reports, files, durationMs: Date.now() - startedAt }
    } finally {
      await rm(workDir, { recursive: true, force: true })
    }
  }

  /**
   * Step one of uploading an archive from elsewhere: register a pending row and
   * hand back a presigned PUT. The row only becomes restorable once the bytes
   * have been read back and found to be a real archive.
   */
  async signUpload(input: BackupUploadRequest, createdBy: string): Promise<BackupUploadSignature> {
    this.requireStorage()

    const id = randomUUID()
    const key = `${BACKUPS_PREFIX}${id}.tar.gz`

    await this.database.db.insert(backups).values({
      id,
      // The filename is the best label an upload has; the manifest may name it better.
      label: input.filename,
      key,
      size: 0,
      trigger: 'uploaded',
      status: 'pending',
      createdBy,
    })

    return {
      backupId: id,
      key,
      uploadUrl: await this.objects.presignPut(key, 'application/gzip', UPLOAD_TTL_SECONDS),
      expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
    }
  }

  /**
   * Step two: read the archive back and prove it is one before it can appear in
   * the list. Anything unreadable is discarded here rather than discovered at
   * 3am during a restore.
   */
  async completeUpload(backupId: string): Promise<BackupSummary> {
    this.requireStorage()

    const backup = await this.findBackup(backupId)

    if (backup.status === 'ready') return this.toSummary(backup)

    try {
      const archive = await this.objects.get(backup.key)
      const extracted = await this.extractArchive(archive)

      try {
        const rows = extracted.manifest.tables.reduce((sum, entry) => sum + entry.rows, 0)

        const [updated] = await this.database.db
          .update(backups)
          .set({
            status: 'ready',
            size: archive.byteLength,
            tables: extracted.manifest.tables.length,
            rows,
            files: extracted.manifest.objects.length,
            manifest: extracted.manifest,
          })
          .where(eq(backups.id, backupId))
          .returning()

        if (!updated) throw new NotFoundError('Backup not found')

        await this.events.emit('backup.created', { backupId, size: archive.byteLength })
        return this.toSummary(updated)
      } finally {
        await rm(extracted.workDir, { recursive: true, force: true })
      }
    } catch (error) {
      // Not an archive, or truncated. Leave nothing behind that looks restorable.
      await this.objects.remove(backup.key).catch(() => undefined)
      await this.database.db.delete(backups).where(eq(backups.id, backupId))
      throw error instanceof BadRequestError
        ? error
        : new BadRequestError('That file is not a readable backup archive')
    }
  }

  /** Shared by restore and upload validation; the caller removes the directory. */
  private async extractArchive(
    archive: Buffer,
  ): Promise<{ workDir: string; manifest: BackupManifestFile }> {
    const workDir = await mkdtemp(join(tmpdir(), 'backup-read-'))
    const archivePath = join(workDir, 'archive.tar.gz')
    await writeFile(archivePath, archive)
    await tar.extract({ file: archivePath, cwd: workDir })

    let manifest: BackupManifestFile
    try {
      manifest = JSON.parse(await readFile(join(workDir, 'manifest.json'), 'utf8')) as BackupManifestFile
    } catch {
      await rm(workDir, { recursive: true, force: true })
      throw new BadRequestError('That archive has no readable manifest')
    }

    if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
      await rm(workDir, { recursive: true, force: true })
      throw new BadRequestError(
        `Archive format ${manifest.formatVersion} is not supported (expected ${BACKUP_FORMAT_VERSION})`,
      )
    }

    return { workDir, manifest }
  }

  private toSummary(row: typeof backups.$inferSelect): BackupSummary {
    return {
      id: row.id,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
      size: row.size,
      source: row.trigger === 'uploaded' ? 'uploaded' : 'created',
      status: row.status === 'ready' ? 'ready' : 'pending',
      mode: 'merge',
      createdBy: row.createdBy,
      tables: row.tables,
      rows: row.rows,
      files: row.files,
    }
  }

  async remove(backupId: string): Promise<void> {
    this.requireStorage()
    const backup = await this.findBackup(backupId)
    await this.objects.remove(backup.key)
    await this.database.db.delete(backups).where(eq(backups.id, backupId))
  }

  // ── export helpers ────────────────────────────────────────────────────────

  private async captureObjects(workDir: string): Promise<{ key: string; size: number }[]> {
    const captured: { key: string; size: number }[] = []

    for (const object of await this.objects.listPrefix(FILES_PREFIX)) {
      const body = await this.objects.get(object.key)
      const target = join(workDir, 'objects', object.key)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, body)
      captured.push({ key: object.key, size: body.byteLength })
    }

    return captured
  }

  private resolvedTables(): ResolvedTable[] {
    return this.registry.declaredTables().map(({ module, table }) => {
      const config = getTableConfig(table as PgTable)
      const declaredPk = config.primaryKeys[0]?.columns.map((column) => column.name) ?? []
      return {
        id: `${config.schema ?? 'public'}.${config.name}`,
        module,
        schema: config.schema ?? 'public',
        name: config.name,
        columns: config.columns.map((column) => column.name),
        primaryKey:
          declaredPk.length > 0
            ? declaredPk
            : config.columns.filter((column) => column.primary).map((column) => column.name),
      }
    })
  }

  private async findBackup(backupId: string) {
    const [row] = await this.database.db
      .select()
      .from(backups)
      .where(eq(backups.id, backupId))
      .limit(1)
    if (!row) throw new NotFoundError('Backup not found')
    return row
  }

  // ── import helpers ────────────────────────────────────────────────────────

  /**
   * One transaction around the whole data import, driven by a raw `pg` client.
   * The rows come from an archive as plain JSON, so hand-writing the SQL is
   * simpler and more honest than bending an ORM into a bulk-load path.
   */
  private async runInTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.database.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await work(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }

  /** Returns how many rows each declared table held before it was emptied. */
  private async truncateAll(client: PoolClient): Promise<Map<string, number>> {
    const tables = this.resolvedTables()
    const removed = new Map<string, number>()

    for (const table of tables) {
      const count = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${qualified(table.schema, table.name)}`,
      )
      removed.set(table.id, Number(count.rows[0]?.count ?? 0))
    }

    // CASCADE pulls in anything referencing these tables, which is exactly why
    // the credential tables are listed explicitly rather than left to be
    // cascaded into silently.
    const targets = [
      ...tables.map((table) => qualified(table.schema, table.name)),
      ...VOLATILE_TABLES.map((table) => qualified(table.schema, table.name)),
    ]
    await client.query(`TRUNCATE TABLE ${targets.join(', ')} CASCADE`)

    return removed
  }

  private async insertAll(
    client: PoolClient,
    entry: TableEntry,
    rows: Record<string, unknown>[],
    deleted: number,
  ): Promise<RestoreTableReport> {
    for (const batch of chunk(rows, INSERT_BATCH)) {
      const statement = buildInsert(entry, batch)
      await client.query(statement.text, statement.values)
    }
    return { name: entry.id, deleted, inserted: rows.length, updated: 0, skipped: 0 }
  }

  /**
   * `xmax = 0` is true only for rows this statement actually inserted, which is
   * how one upsert reports inserted-versus-updated without a second query.
   */
  private async upsertAll(
    client: PoolClient,
    entry: TableEntry,
    rows: Record<string, unknown>[],
  ): Promise<RestoreTableReport> {
    if (entry.primaryKey.length === 0) {
      return this.insertAll(client, entry, rows, 0)
    }

    const updatable = entry.columns.filter((column) => !entry.primaryKey.includes(column))

    // A join table whose primary key spans every column has nothing to update:
    // the row either already exists or it does not. `DO UPDATE SET` with an
    // empty assignment list is a syntax error, so this is a real fork, not a
    // defensive branch.
    if (updatable.length === 0) {
      let inserted = 0
      let skipped = 0

      for (const batch of chunk(rows, INSERT_BATCH)) {
        const statement = buildInsert(entry, batch, { conflict: entry.primaryKey, mode: 'nothing' })
        const result = await client.query(statement.text, statement.values)
        const written = result.rowCount ?? 0
        inserted += written
        skipped += batch.length - written
      }

      return { name: entry.id, deleted: 0, inserted, updated: 0, skipped }
    }

    let inserted = 0
    let updated = 0

    for (const batch of chunk(rows, INSERT_BATCH)) {
      const statement = buildInsert(entry, batch, { conflict: entry.primaryKey, mode: 'update' })
      const result = await client.query<{ inserted: boolean }>(statement.text, statement.values)
      for (const row of result.rows) {
        if (row.inserted) inserted += 1
        else updated += 1
      }
    }

    return { name: entry.id, deleted: 0, inserted, updated, skipped: 0 }
  }

  private async restoreObjects(
    workDir: string,
    manifest: BackupManifestFile,
    mode: RestoreMode,
  ): Promise<{ deleted: number; written: number; skipped: number }> {
    // A replace restore makes the bucket match the archive, so anything that
    // arrived after the archive was taken is removed.
    const deleted = mode === 'replace' ? await this.objects.removePrefix(FILES_PREFIX) : 0

    let written = 0
    let skipped = 0

    for (const object of manifest.objects) {
      if (mode === 'merge' && (await this.objects.head(object.key))) {
        skipped += 1
        continue
      }
      await this.objects.put(
        object.key,
        await readFile(join(workDir, 'objects', object.key)),
        'application/octet-stream',
      )
      written += 1
    }

    return { deleted, written, skipped }
  }

  private requireStorage(): void {
    if (!this.objects.configured) {
      throw new ServiceUnavailableError({
        code: 'storage_not_configured',
        message: 'Object storage is not configured, so backups cannot be created or restored',
      })
    }
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let offset = 0; offset < items.length; offset += size) {
    batches.push(items.slice(offset, offset + size))
  }
  return batches
}

async function readRows(workDir: string, dataFile: string): Promise<Record<string, unknown>[]> {
  const contents = await readFile(join(workDir, dataFile), 'utf8')
  return contents
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

/**
 * Postgres infers each parameter's type from its target column, so archive
 * values need no explicit casting: a timestamp arrives as a string, a boolean
 * as a boolean, jsonb as a JS object.
 *
 * `mode: 'update'` overwrites the existing row and reports which rows were
 * inserted (via `xmax`) so one statement can report both counts. `mode:
 * 'nothing'` is for rows whose primary key is the whole row — a join table
 * record either exists or it does not.
 */
function buildInsert(
  entry: TableEntry,
  rows: Record<string, unknown>[],
  options: { conflict?: string[]; mode?: 'update' | 'nothing' } = {},
): { text: string; values: unknown[] } {
  const values: unknown[] = []
  const tuples = rows.map((row) => {
    const placeholders = entry.columns.map((column) => {
      values.push(row[column] ?? null)
      return `$${values.length}`
    })
    return `(${placeholders.join(', ')})`
  })

  const columnList = entry.columns.map(quote).join(', ')
  const conflict = options.conflict ?? []

  let suffix = ''
  if (conflict.length > 0) {
    const target = `(${conflict.map(quote).join(', ')})`

    if (options.mode === 'nothing') {
      suffix = ` ON CONFLICT ${target} DO NOTHING`
    } else {
      const assignments = entry.columns
        .filter((column) => !conflict.includes(column))
        .map((column) => `${quote(column)} = EXCLUDED.${quote(column)}`)
        .join(', ')
      suffix = ` ON CONFLICT ${target} DO UPDATE SET ${assignments} RETURNING (xmax = 0) AS inserted`
    }
  }

  return {
    text: `INSERT INTO ${quoteIdentifier(entry.id)} (${columnList}) VALUES ${tuples.join(', ')}${suffix}`,
    values,
  }
}

/** `<schema>.<table>` with each part quoted, so a reserved word cannot break it. */
function quoteIdentifier(id: string): string {
  const [schema, ...rest] = id.split('.')
  return qualified(schema ?? 'public', rest.join('.'))
}

function qualified(schema: string, name: string): string {
  return `${quote(schema)}.${quote(name)}`
}

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}