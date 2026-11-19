import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { getEnv } from '../config/index'
import { schema } from './schema'

export type Database = NodePgDatabase<typeof schema>

export interface DatabaseHandle {
  db: Database
  pool: Pool
  close(): Promise<void>
}

/**
 * One pool per process. Modules receive the handle through dependency
 * injection and never construct their own connections, which is what keeps the
 * connection count predictable when the API is scaled horizontally.
 */
export function createDatabase(
  connectionString: string = getEnv().DATABASE_URL,
  max: number = getEnv().DATABASE_POOL_MAX,
): DatabaseHandle {
  const pool = new Pool({ connectionString, max })
  const db = drizzle(pool, { schema })

  return {
    db,
    pool,
    close: async () => {
      await pool.end()
    },
  }
}