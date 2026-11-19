import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { rootLogger } from '@app/core'
import type { NextFunction, Request, Response } from 'express'

/**
 * Assigns a correlation id to every request and emits one access log line when
 * the response finishes. Deliberately a plain Express middleware registered in
 * `main.ts` rather than a Nest middleware, so it runs before routing and is
 * unaffected by route-pattern syntax.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id']
  req.requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID()
  req.startedAt = performance.now()
  res.setHeader('x-request-id', req.requestId)

  res.on('finish', () => {
    const durationMs = Math.round((performance.now() - req.startedAt) * 100) / 100
    rootLogger().info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        userId: req.principal?.userId,
      },
      'request completed',
    )
  })

  next()
}
