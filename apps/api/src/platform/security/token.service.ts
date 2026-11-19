import { createHash, randomBytes } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UnauthorizedError, type Env } from '@app/core'
import { APP_ENV } from '../tokens'

export interface AccessTokenClaims {
  /** User id. */
  sub: string
  /** Session id — the record a refresh token is revoked against. */
  sid: string
  email: string
}

export interface IssuedAccessToken {
  token: string
  expiresAt: Date
}

/**
 * Access tokens are short-lived JWTs verified without touching the database.
 * Refresh tokens are opaque random strings whose SHA-256 hash is the only thing
 * persisted, so a database leak cannot be replayed as a session.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  async issueAccessToken(userId: string, email: string, sessionId: string): Promise<IssuedAccessToken> {
    const expiresAt = new Date(Date.now() + this.env.JWT_ACCESS_TTL_SECONDS * 1000)
    const token = await this.jwt.signAsync(
      { sub: userId, sid: sessionId, email } satisfies AccessTokenClaims,
      { secret: this.env.JWT_ACCESS_SECRET, expiresIn: this.env.JWT_ACCESS_TTL_SECONDS },
    )
    return { token, expiresAt }
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        secret: this.env.JWT_ACCESS_SECRET,
      })
      if (!claims.sub || !claims.sid) throw new Error('token is missing required claims')
      return claims
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired access token', { cause: String(error) })
    }
  }

  /** Opaque, 256 bits of entropy — never a JWT, so it carries no readable data. */
  generateRefreshToken(): string {
    return randomBytes(32).toString('base64url')
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  refreshExpiryFromNow(): Date {
    return new Date(Date.now() + this.env.JWT_REFRESH_TTL_SECONDS * 1000)
  }
}