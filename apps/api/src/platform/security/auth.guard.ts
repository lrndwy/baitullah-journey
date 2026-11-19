import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UnauthorizedError, type AuthPrincipal } from '@app/core'
import type { Request } from 'express'
import { IS_PUBLIC_KEY } from './decorators'
import { TokenService } from './token.service'
import { PermissionResolver } from './permission-resolver.service'

/**
 * Verifies the bearer token, confirms the session has not been revoked, and
 * attaches the caller's roles and permissions to the request.
 *
 * Routes marked `@Public()` still get a principal when a valid token happens to
 * be present, so a public endpoint can personalise its response without
 * duplicating the verification logic.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly permissions: PermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false

    const header = request.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined

    if (!token) {
      if (isPublic) return true
      throw new UnauthorizedError('Missing bearer token')
    }

    const claims = await this.tokens.verifyAccessToken(token)
    const access = await this.permissions.resolveForSession(claims.sub, claims.sid)

    if (!access) {
      if (isPublic) return true
      throw new UnauthorizedError('Session is no longer active')
    }

    const principal: AuthPrincipal = {
      userId: claims.sub,
      email: claims.email,
      sessionId: claims.sid,
      roles: access.roles,
      permissions: access.permissions,
    }
    request.principal = principal

    return true
  }
}