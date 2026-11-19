import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Profile, Strategy, type VerifyCallback } from 'passport-google-oauth20'
import { getEnv } from '@app/core'
import type { OAuthProfile } from './auth.service'

/**
 * Only instantiated when Google credentials are configured (see `auth.module`),
 * because the strategy constructor validates them eagerly.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const env = getEnv()
    super({
      clientID: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    })
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value
    if (!email) {
      done(new Error('Google account did not return an email address'))
      return
    }

    const normalized: OAuthProfile = {
      provider: 'google',
      providerAccountId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    }

    done(null, normalized)
  }
}