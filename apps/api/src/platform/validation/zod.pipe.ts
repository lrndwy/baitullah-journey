import { Injectable, type PipeTransform } from '@nestjs/common'
import { BadRequestError } from '@app/core'
import type { ZodType } from 'zod'

/**
 * Validates and *narrows* a request payload with a Zod schema shared with the
 * frontend. `transform` returns the parsed value, so the controller's parameter
 * type is the schema's output type rather than `any`.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestError('Request validation failed', {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }
    return result.data
  }
}