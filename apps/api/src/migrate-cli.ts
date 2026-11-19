import './bootstrap-env'
import { Pool } from 'pg'
import { getEnv, isModuleEnabled, runMigrations, type MigrationSource } from '@app/core'
import { moduleDescriptors } from './modules/index'

/**
 * Applies core and module migrations without starting the API
 * (`pnpm --filter @app/api db:migrate`). The API also runs this on boot; this
 * entrypoint exists for CI and for migrating before a deploy rolls out.
 */
async function main(): Promise<void> {
  const pool = new Pool({ connectionString: getEnv().DATABASE_URL })

  try {
    const sources: MigrationSource[] = []
    for (const descriptor of moduleDescriptors) {
      if (!isModuleEnabled(descriptor.manifest.name, descriptor.manifest.core)) continue
      if (descriptor.migrationsDir) {
        sources.push({ name: descriptor.manifest.name, dir: descriptor.migrationsDir })
      }
    }

    const applied = await runMigrations(pool, sources)
    console.log(
      applied.length === 0 ? 'nothing to apply' : `applied ${applied.length} migration(s)`,
    )
  } finally {
    await pool.end()
  }
}

void main()