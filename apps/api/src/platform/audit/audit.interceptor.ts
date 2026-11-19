import {
  Inject,
  Injectable,
  HttpException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppError, type AuditRecorder } from '@app/core'
import type { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import type { Request } from 'express'
import { AUDIT_ACTION_KEY } from '../security/decorators'
import { AUDIT_RECORDER } from '../tokens'
import { ModuleRegistry } from '../registry/module.registry'

/** Methods that change state and therefore belong in the trail. */
const STATE_CHANGING_METHODS: Record<string, true> = {
  POST: true,
  PUT: true,
  PATCH: true,
  DELETE: true,
}

/**
 * Automatically records every state-changing request. Modules declare a
 * business name with `@AuditAction('rbac.role.create')`; without one the record
 * still lands, named `<module>.<method>`, so nothing slips through unnoticed.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: ModuleRegistry,
    @Inject(AUDIT_RECORDER) private readonly recorder: AuditRecorder,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>()
    if (!STATE_CHANGING_METHODS[request.method]) return next.handle()

    const declared = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const module = this.registry.moduleForPath(request.originalUrl)
    const action = declared ?? `${module}.${request.method.toLowerCase()}`

    const write = (status: 'success' | 'failure', error?: unknown) =>
      void this.recorder.record({
        action,
        module,
        actorId: request.principal?.userId ?? null,
        actorType: request.principal ? 'user' : 'system',
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        requestId: request.requestId,
        status,
        metadata: {
          method: request.method,
          path: request.originalUrl,
          // A failure with no reason is a dead end for whoever investigates it.
          ...(error === undefined ? {} : { error: describeFailure(error) }),
        },
      })

    return next.handle().pipe(
      tap({
        next: () => write('success'),
        error: (error: unknown) => write('failure', error),
      }),
    )
  }
}

/**
 * Extracts the machine code and the human message from whatever was thrown, so
 * the audit detail view can say *why* a request failed rather than only that it
 * did. Falls back to the error's name for anything unrecognised.
 */
function describeFailure(error: unknown): { name: string; code?: string; message: string; status?: number } {
  if (error instanceof AppError) {
    return { name: error.name, code: error.code, message: error.message, status: error.status }
  }

  if (error instanceof HttpException) {
    const status = error.getStatus()
    const body = error.getResponse()
    const message =
      typeof body === 'string'
        ? body
        : typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : error.message

    return { name: error.name, code: `http_${status}`, message, status }
  }

  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }

  return { name: 'UnknownError', message: String(error) }
}