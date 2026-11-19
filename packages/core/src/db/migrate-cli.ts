import '../config/auto-env'
import { Pool } from 'pg'
import { getEnv } from '../config/index'
import { CORE_MIGRATIONS_DIR, runMigrations } from './migrate'

/**
 * Standalone migration entrypoint (`pnpm --filter @app/core db:migrate`).
 * The API also runs migrations on boot; this exists for CI and for applying
 * schema changes before any application process starts.
 */
async function main(): Promise<void> {
  const pool = new Pool({ connectionString: getEnv().DATABASE_URL })
  try {
    const applied = await runMigrations(pool, [{ name: 'core', dir: CORE_MIGRATIONS_DIR }])
    console.log(
      applied.length === 0 ? 'nothing to apply' : `applied ${applied.length} migration(s)`,
    )
  } finally {
    await pool.end()
  }
}

void main()
