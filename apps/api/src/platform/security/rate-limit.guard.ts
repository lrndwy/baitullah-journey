import { Inject, Injectable, type Logger } from '@nestjs/common'
import { consumeRateLimit, RateLimitError, type Env, type RedisClient } from '@app/core'
import type { Request } from 'express'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { APP_ENV, LOGGER, REDIS } from '../tokens'

/**
 * Fixed-window limiter backed by Redis, so one budget is shared across every
 * replica. Runs before authentication and keys on the client IP, which means
 * login and registration endpoints are protected too.
 *
 * ponytail: fails open when Redis is unreachable — losing the limiter beats
 * taking the whole API down. Switch to fail-closed if abuse protection
 * outranks availability in your threat model.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS) private readonly redis: RedisClient,
    @Inject(APP_ENV) private readonly env: Env,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp()
    const request = http.getRequest<Request>()
    const identity = request.principal?.userId ?? request.ip ?? 'unknown'
    const route = `${request.method}:${request.route?.path ?? request.path}`

    try {
      const result = await consumeRateLimit(
        this.redis,
        `${route}:${identity}`,
        this.env.RATE_LIMIT_MAX,
        this.env.RATE_LIMIT_WINDOW_SECONDS,
      )

      const response = http.getResponse()
      response?.setHeader?.('x-ratelimit-limit', String(result.limit))
      response?.setHeader?.('x-ratelimit-remaining', String(result.remaining))
      response?.setHeader?.('x-ratelimit-reset', result.resetAt.toISOString())

      if (!result.allowed) {
        throw new RateLimitError('Too many requests', { retryAfter: result.resetAt.toISOString() })
      }
      return true
    } catch (error) {
      if (error instanceof RateLimitError) throw error
      this.logger.warn({ err: error }, 'rate limiter unavailable, allowing request')
      return true
    }
  }
}