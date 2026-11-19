export interface AppErrorOptions {
  status?: number
  code?: string
  details?: unknown
  cause?: unknown
}

/**
 * Every expected failure in the platform is an `AppError`. The global exception
 * filter turns one into a stable JSON envelope, so handlers never build error
 * responses by hand and the wire format never drifts between modules.
 */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = new.target.name
    this.status = options.status ?? 500
    this.code = options.code ?? 'internal_error'
    this.details = options.details
    Error.captureStackTrace?.(this, new.target)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, { status: 400, code: 'bad_request', details })
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, { status: 401, code: 'unauthorized', details })
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', details?: unknown) {
    super(message, { status: 403, code: 'forbidden', details })
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, { status: 404, code: 'not_found', details })
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: unknown) {
    super(message, { status: 409, code: 'conflict', details })
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(message, { status: 429, code: 'rate_limited', details })
  }
}

/**
 * A capability this deployment does not have — object storage without S3
 * credentials, for instance. Distinct from 500: nothing is broken, the feature
 * is simply not enabled here.
 */
export class ServiceUnavailableError extends AppError {
  constructor(options: { code: string; message: string; details?: unknown; cause?: unknown }) {
    super(options.message, {
      status: 503,
      code: options.code,
      details: options.details,
      cause: options.cause,
    })
  }
}
