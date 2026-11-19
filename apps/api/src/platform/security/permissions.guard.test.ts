import { Reflector } from '@nestjs/core'
import { describe, expect, it } from 'vitest'
import { ForbiddenError, UnauthorizedError, type AuthPrincipal } from '@app/core'
import type { ExecutionContext } from '@nestjs/common'
import { PermissionsGuard } from './permissions.guard'
import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY } from './decorators'

/**
 * The permission guard is the single place that decides authorisation, so its
 * two failure modes matter more than its success path:
 *
 *   1. it must deny when the caller is anonymous, not throw something the
 *      exception filter turns into a 500;
 *   2. it must deny when *any* required permission is missing — a guard that
 *      checks `some()` instead of `every()` looks correct in every happy-path
 *      test and hands out access nobody granted.
 */

function context(principal?: AuthPrincipal): ExecutionContext {
  const request = { principal }
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext
}

function guard(required: string[] | undefined): PermissionsGuard {
  const reflector = {
    getAllAndOverride: (key: string) => (key === REQUIRED_PERMISSIONS_KEY ? required : undefined),
  } as unknown as Reflector

  return new PermissionsGuard(reflector)
}

const alice: AuthPrincipal = {
  userId: 'user-1',
  email: 'alice@example.com',
  sessionId: 'session-1',
  roles: ['editor'],
  permissions: ['users.read', 'storage.file.read'],
}

describe('PermissionsGuard', () => {
  it('allows a route that declares no permissions', () => {
    expect(guard(undefined).canActivate(context(undefined))).toBe(true)
    expect(guard([]).canActivate(context(undefined))).toBe(true)
  })

  it('allows a caller who holds every required permission', () => {
    expect(guard(['users.read']).canActivate(context(alice))).toBe(true)
    expect(guard(['users.read', 'storage.file.read']).canActivate(context(alice))).toBe(true)
  })

  it('denies a caller missing one of several required permissions', () => {
    // `every`, not `some`: holding `users.read` must not satisfy a route that
    // also demands `users.delete`.
    expect(() => guard(['users.read', 'users.delete']).canActivate(context(alice))).toThrowError(
      ForbiddenError,
    )
  })

  it('denies a caller who holds none of the required permissions', () => {
    expect(() => guard(['rbac.role.write']).canActivate(context(alice))).toThrowError(
      ForbiddenError,
    )
  })

  it('reports the missing permissions so the client can explain itself', () => {
    try {
      guard(['users.read', 'users.delete']).canActivate(context(alice))
      throw new Error('expected the guard to deny')
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError)
      expect((error as ForbiddenError).details).toEqual({ missing: ['users.delete'] })
    }
  })

  it('answers 401 rather than 500 when no principal was attached', () => {
    // Reachable only if the auth guard was removed from the chain — which is
    // exactly the misconfiguration worth failing loudly on.
    expect(() => guard(['users.read']).canActivate(context(undefined))).toThrowError(
      UnauthorizedError,
    )
  })

  it('does not treat a wildcard-looking permission as a match', () => {
    const wildcard: AuthPrincipal = { ...alice, permissions: ['users.*'] }
    expect(() => guard(['users.read']).canActivate(context(wildcard))).toThrowError(ForbiddenError)
  })

  it('is case sensitive', () => {
    const shouty: AuthPrincipal = { ...alice, permissions: ['USERS.READ'] }
    expect(() => guard(['users.read']).canActivate(context(shouty))).toThrowError(ForbiddenError)
  })
})

describe('route metadata keys', () => {
  it('uses namespaced keys, so a decorator cannot collide with a library one', () => {
    expect(IS_PUBLIC_KEY).toBe('platform:isPublic')
    expect(REQUIRED_PERMISSIONS_KEY).toBe('platform:requiredPermissions')
  })
})
