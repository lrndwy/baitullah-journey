import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common'
import type { AuthPrincipal } from '@app/core'
import type { Request } from 'express'

export const IS_PUBLIC_KEY = 'platform:isPublic'
export const REQUIRED_PERMISSIONS_KEY = 'platform:requiredPermissions'
export const AUDIT_ACTION_KEY = 'platform:auditAction'

/** Route is reachable without a session. Anonymous requests still get a principal if a valid token is present. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true)

/**
 * Declares the permissions a route needs. The kernel enforces them; the module
 * only states its requirement.
 */
export const RequirePermissions = (...permissions: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions)

/** Overrides the action name written to the audit trail. Defaults to `METHOD /route`. */
export const AuditAction = (action: string): MethodDecorator => SetMetadata(AUDIT_ACTION_KEY, action)

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal | undefined =>
    context.switchToHttp().getRequest<Request>().principal,
)