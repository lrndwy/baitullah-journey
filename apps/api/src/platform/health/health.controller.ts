import { Controller, Get, Inject } from '@nestjs/common'
import type { DatabaseHandle, RedisClient } from '@app/core'
import { Public } from '../security/decorators'
import { DATABASE, REDIS } from '../tokens'

/**
 * Liveness and readiness for orchestrators. `/health` must stay dependency-free
 * so a failing database never causes the platform to kill an otherwise
 * functioning container; `/ready` is where dependencies are actually probed.
 */
@Controller()
export class HealthController {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  @Public()
  @Get('health')
  health(): { status: string; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) }
  }

  @Public()
  @Get('ready')
  async ready(): Promise<{
    status: string
    checks: { database: boolean; redis: boolean }
  }> {
    const [database, redis] = await Promise.all([
      this.database.pool
        .query('select 1')
        .then(() => true)
        .catch(() => false),
      this.redis
        .ping()
        .then((reply) => reply === 'PONG')
        .catch(() => false),
    ])

    return {
      status: database && redis ? 'ready' : 'degraded',
      checks: { database, redis },
    }
  }
}