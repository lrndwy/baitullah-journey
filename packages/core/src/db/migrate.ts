import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Pool } from 'pg'
import { rootLogger } from '../logger/index'

/** Absolute path to the SQL shipped with `@app/core`, resolved at runtime. */
export const CORE_MIGRATIONS_DIR = resolve(__dirname, '../../migrations')

/** Drizzle emits this marker between statements in a generated `.sql` file. */
const STATEMENT_BREAKPOINT = '--> statement-breakpoint'

export interface MigrationSource {
  /** Namespace shown in `_migrations`, normally the module name. */
  name: string
  dir: string
}

/**
 * Applies every `.sql` file it has not seen before, in filename order, one
 * transaction per file. Each module brings its own folder, so adding or
 * removing a module changes only its own migrations.
 */
export async function runMigrations(pool: Pool, sources: MigrationSource[]): Promise<string[]> {
  const log = rootLogger().child({ scope: 'migrate' })

  await pool.query(
    `CREATE TABLE IF NOT EXISTS public._migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  )

  const existing = await pool.query<{ name: string }>('SELECT name FROM public._migrations')
  const applied = new Set(existing.rows.map((row) => row.name))
  const executed: string[] = []

  for (const source of sources) {
    const entries = await readdir(source.dir).catch(() => [] as string[])
    const files = entries.filter((entry) => entry.endsWith('.sql')).sort()

    for (const file of files) {
      const key = `${source.name}/${file}`
      if (applied.has(key)) continue

      const contents = await readFile(resolve(source.dir, file), 'utf8')
      const statements = contents
        .split(STATEMENT_BREAKPOINT)
        .map((statement) => statement.trim())
        .filter(Boolean)

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const statement of statements) await client.query(statement)
        await client.query('INSERT INTO public._migrations (name) VALUES ($1)', [key])
        await client.query('COMMIT')
        executed.push(key)
        log.info({ migration: key }, 'migration applied')
      } catch (error) {
        await client.query('ROLLBACK')
        log.error({ err: error, migration: key }, 'migration failed')
        throw error
      } finally {
        client.release()
      }
    }
  }

  return executed
}