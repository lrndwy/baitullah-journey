import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common'
import {
  BadRequestError,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  type AuthPrincipal,
} from '@app/core'
import { RefreshRequestSchema, type RefreshRequest, type TokenResponse } from '@app/contracts'
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type ForgotPasswordResponse,
  type ResetPasswordInput,
} from '@app/contracts'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { AuditAction, CurrentPrincipal, Public, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { AuthService, type IssuedSession, type SessionMeta } from './auth.service'

const UuidSchema = z.string().uuid()

const PasswordLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(200),
})

function readRefreshCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, string> | undefined
  return cookies?.[REFRESH_COOKIE_NAME]
}

function sessionMeta(request: Request): SessionMeta {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    requestId: request.requestId,
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Email + password sign-in, for accounts that have a password set. */
  @Public()
  @AuditAction('auth.login')
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(PasswordLoginSchema)) body: { email: string; password: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokenResponse> {
    return this.respondWithSession(
      response,
      await this.auth.loginWithPassword(body.email, body.password, sessionMeta(request)),
    )
  }

  @Public()
  @AuditAction('auth.refresh')
  @Post('refresh')
  async refresh(
    @Body(new ZodValidationPipe(RefreshRequestSchema)) body: RefreshRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokenResponse> {
    const presented = body.refreshToken ?? readRefreshCookie(request)
    if (!presented) throw new BadRequestError('No refresh token supplied')

    return this.respondWithSession(response, await this.auth.refresh(presented, sessionMeta(request)))
  }

  @AuditAction('auth.logout')
  @Post('logout')
  async logout(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    await this.auth.logout(principal.sessionId, sessionMeta(request))
    response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions())
    return { ok: true }
  }

  @Get('me')
  async me(@CurrentPrincipal() principal: AuthPrincipal) {
    return { user: await this.auth.sessionUser(principal.userId) }
  }

  /**
   * Step one of "forgot password". The response is identical for unknown
   * addresses, so this endpoint cannot be used to enumerate accounts.
   */
  @Public()
  @AuditAction('auth.password.forgot')
  @Post('password/forgot')
  async forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<ForgotPasswordResponse> {
    const { devCode } = await this.auth.requestPasswordReset(body.email)

    return {
      ok: true,
      message: 'If that address belongs to an account, a reset code is on its way.',
      ...(devCode ? { devCode } : {}),
    }
  }

  /** Step two: exchange the emailed code for a new password. */
  @Public()
  @AuditAction('auth.password.reset')
  @Post('password/reset')
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<{ ok: true }> {
    await this.auth.resetPassword(body.email, body.code, body.newPassword)
    return { ok: true }
  }

  /** An administrator triggers a reset for another account. */
  @RequirePermissions('auth.password.reset_request')
  @AuditAction('auth.password.reset_requested_by_admin')
  @Post('password/reset-for/:id')
  async resetFor(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
  ): Promise<ForgotPasswordResponse> {
    const { devCode } = await this.auth.sendPasswordResetFor(id, principal.userId)

    return {
      ok: true,
      message: 'A reset code has been emailed to that account.',
      ...(devCode ? { devCode } : {}),
    }
  }

  /** Signed-in users changing their own password (they know the current one). */
  @AuditAction('auth.password.change')
  @Post('password/change')
  async changePassword(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(ChangePasswordSchema)) body: ChangePasswordInput,
  ): Promise<{ ok: true }> {
    await this.auth.changePassword(principal.userId, body.currentPassword, body.newPassword)
    return { ok: true }
  }

  @Get('sessions')
  async sessions(@CurrentPrincipal() principal: AuthPrincipal) {
    return { sessions: await this.auth.listSessions(principal.userId) }
  }

  private respondWithSession(response: Response, session: IssuedSession): TokenResponse {
    response.cookie(REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions())
    return {
      accessToken: session.accessToken,
      expiresAt: session.expiresAt.toISOString(),
      user: session.user,
    }
  }
}