import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ForbiddenError, UnauthorizedError } from '@app/core'
import type { Request } from 'express'
import { REQUIRED_PERMISSIONS_KEY } from './decorators'

/**
 * Enforces the permissions declared with `@RequirePermissions(...)`. Modules
 * state what a route needs; this guard is the single place that decides.
 * Every listed permission must be held (AND semantics).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required || required.length === 0) return true

    const request = context.switchToHttp().getRequest<Request>()
    const principal = request.principal
    if (!principal) throw new UnauthorizedError('Authentication required')

    const missing = required.filter((permission) => !principal.permissions.includes(permission))
    if (missing.length > 0) {
      throw new ForbiddenError('Insufficient permissions', { missing })
    }

    return true
  }
}