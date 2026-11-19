import { ArgumentsHost, Catch, HttpException, Inject, type ExceptionFilter, type Logger } from '@nestjs/common'
import { AppError } from '@app/core'
import type { Request, Response } from 'express'
import { LOGGER } from '../tokens'

interface ErrorEnvelope {
  error: {
    code: string
    message: string
    details?: unknown
    requestId: string
  }
}

/**
 * The only place an HTTP error body is constructed, so the wire format cannot
 * drift between modules. Expected failures arrive as `AppError`; anything else
 * is logged with its stack and reported as a generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()

    let status = 500
    let code = 'internal_error'
    let message = 'Internal server error'
    let details: unknown

    if (exception instanceof AppError) {
      status = exception.status
      code = exception.code
      message = exception.message
      details = exception.details
    } else if (exception instanceof HttpException) {
      status = exception.getStatus()
      code = `http_${status}`
      const body = exception.getResponse()
      message = typeof body === 'string' ? body : exception.message
      details = typeof body === 'object' ? body : undefined
    }

    if (status >= 500) {
      this.logger.error(
        { err: exception, requestId: request.requestId, path: request.originalUrl },
        'unhandled error',
      )
    } else {
      this.logger.warn(
        { code, requestId: request.requestId, path: request.originalUrl },
        'request rejected',
      )
    }

    const envelope: ErrorEnvelope = {
      error: {
        code,
        message: status >= 500 ? 'Internal server error' : message,
        ...(status >= 500 || details === undefined ? {} : { details }),
        requestId: request.requestId ?? 'unknown',
      },
    }

    response.status(status).json(envelope)
  }
}