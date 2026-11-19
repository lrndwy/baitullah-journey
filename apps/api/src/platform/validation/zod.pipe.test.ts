import { describe, expect, it } from 'vitest'
import { BadRequestError } from '@app/core'
import { z } from 'zod'
import { ZodValidationPipe } from './zod.pipe'

/**
 * Every request body, query string and route parameter goes through this pipe,
 * so it is the boundary that decides what shape an attacker can hand the
 * services behind it. The interesting cases are the ones where a naive
 * implementation passes the raw value through.
 */
const pipe = <T>(schema: z.ZodType<T>) => new ZodValidationPipe(schema)

/** Reads a property without asserting a shape the compiler never checked. */
function field(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object' || !(key in value)) return undefined
  return (value as Record<string, unknown>)[key]
}

describe('ZodValidationPipe', () => {
  it('returns only the declared keys, so an extra field is dropped rather than stored', () => {
    const result = pipe(z.object({ name: z.string() })).transform({ name: 'ok', isAdmin: true })

    expect(result).toEqual({ name: 'ok' })
    expect(Object.keys(result)).toEqual(['name'])
  })

  it('applies the schema defaults and coercions the handler relies on', () => {
    const schema = z.object({ limit: z.coerce.number().int().min(1).default(25) })
    expect(pipe(schema).transform({ limit: '50' })).toEqual({ limit: 50 })
    expect(pipe(schema).transform({})).toEqual({ limit: 25 })
  })

  it('rejects a value that fails the schema instead of passing it through', () => {
    const schema = z.object({ email: z.string().email() })
    expect(() => pipe(schema).transform({ email: 'not-an-email' })).toThrowError(BadRequestError)
    expect(() => pipe(schema).transform({})).toThrowError(BadRequestError)
    expect(() => pipe(schema).transform(null)).toThrowError(BadRequestError)
  })

  it('reports each issue with its path, so a form can highlight the field', () => {
    const schema = z.object({
      email: z.string().email(),
      profile: z.object({ phone: z.string().min(5) }),
    })

    try {
      pipe(schema).transform({ email: 'nope', profile: { phone: '1' } })
      throw new Error('expected validation to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError)
      const issues = field((error as BadRequestError).details, 'issues')
      expect(Array.isArray(issues)).toBe(true)
      const paths = (issues as { path: string }[]).map((issue) => issue.path).sort()
      expect(paths).toEqual(['email', 'profile.phone'])
    }
  })

  it('describes the problem without leaking the schema or a stack trace', () => {
    const schema = z.object({ token: z.string().min(32) })
    try {
      pipe(schema).transform({ token: 'short' })
      throw new Error('expected validation to fail')
    } catch (error) {
      const details = JSON.stringify((error as BadRequestError).details)
      expect(details).not.toMatch(/at .*zod/i)
      expect(details).not.toContain('ZodError')
      // The offending field is named, which is what a form needs; nothing
      // structural about the schema escapes.
      expect(details).toContain('token')
    }
  })

  it('rejects a prototype-polluting payload rather than merging it', () => {
    const schema = z.object({ name: z.string() })
    const hostile = JSON.parse('{"name":"ok","__proto__":{"polluted":true}}') as unknown

    const result = pipe(schema).transform(hostile)
    expect(result).toEqual({ name: 'ok' })
    expect(field(result, 'polluted')).toBeUndefined()
    // The real risk is the shared prototype, not the returned object.
    expect(field(Object.prototype, 'polluted')).toBeUndefined()
  })

  it('refuses a payload that is an array where an object is required', () => {
    const schema = z.object({ id: z.string() })
    expect(() => pipe(schema).transform(['id'])).toThrowError(BadRequestError)
  })
})
