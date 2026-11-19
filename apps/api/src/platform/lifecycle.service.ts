import { Injectable, type OnApplicationShutdown, Inject } from '@nestjs/common'
import type { DatabaseHandle, RedisClient } from '@app/core'
import { DATABASE, REDIS } from './tokens'

/**
 * Closes the shared connections on shutdown so a rolling deploy does not leak
 * Postgres backends or leave Redis sockets half-open.
 */
@Injectable()
export class LifecycleService implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.database.close(), this.redis.quit()])
  }
}