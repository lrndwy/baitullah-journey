import { Redis } from 'ioredis'
import { getEnv } from '../config/index'

export { Redis }
export type RedisClient = Redis

/**
 * A single shared client per process. `enableOfflineQueue: false` makes
 * requests fail fast when Redis is unreachable instead of silently buffering
 * them, which is what you want for rate limiting and caching.
 */
export function createRedisClient(url: string = getEnv().REDIS_URL): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    lazyConnect: false,
  })
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
}

/**
 * Fixed-window counter evaluated inside Redis so the increment, the initial
 * expiry and the TTL read are one atomic step — a `MULTI` here would still
 * race on the `TTL` read.
 */
const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return { current, ttl }
`

export async function consumeRateLimit(
  client: Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const [current, ttl] = (await client.eval(
    RATE_LIMIT_SCRIPT,
    1,
    `ratelimit:${key}`,
    String(windowSeconds),
  )) as [number, number]

  const secondsLeft = ttl > 0 ? ttl : windowSeconds

  return {
    allowed: current <= limit,
    limit,
    remaining: Math.max(0, limit - current),
    resetAt: new Date(Date.now() + secondsLeft * 1000),
  }
}