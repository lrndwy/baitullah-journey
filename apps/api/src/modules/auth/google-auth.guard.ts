import { Injectable, ServiceUnavailableException, type ExecutionContext } from '@nestjs/common'
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport'
import { googleOAuthConfigured } from '@app/core'

/**
 * Passport's Google strategy only exists when credentials are present, so this
 * guard answers with a clear 503 instead of letting Passport fail with
 * "unknown strategy: google".
 */
@Injectable()
export class GoogleAuthGuard extends PassportAuthGuard('google') {
  override canActivate(context: ExecutionContext) {
    if (!googleOAuthConfigured()) {
      throw new ServiceUnavailableException({
        code: 'google_not_configured',
        message: 'Google sign-in is not configured on this deployment',
      })
    }
    return super.canActivate(context)
  }
}