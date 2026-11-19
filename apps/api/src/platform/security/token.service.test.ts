import { createHash } from 'node:crypto'
import { JwtService } from '@nestjs/jwt'
import { describe, expect, it } from 'vitest'
import { UnauthorizedError, type Env } from '@app/core'
import { TokenService } from './token.service'

const SECRET = 'access-secret-long-enough'
const OTHER_SECRET = 'a-completely-different-secret'

function service(overrides: Partial<Env> | undefined = undefined): TokenService {
  const env = {
    JWT_ACCESS_SECRET: SECRET,
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 60,
    ...overrides,
  } as Env
  return new TokenService(new JwtService({}), env)
}

describe('TokenService access tokens', () => {
  it('round-trips the claims it issued', async () => {
    const tokens = service()
    const { token, expiresAt } = await tokens.issueAccessToken('user-1', 'a@b.c', 'session-1')

    await expect(tokens.verifyAccessToken(token)).resolves.toMatchObject({
      sub: 'user-1',
      sid: 'session-1',
      email: 'a@b.c',
    })
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('rejects a token signed with a different secret', async () => {
    const forged = await service({ JWT_ACCESS_SECRET: OTHER_SECRET }).issueAccessToken(
      'user-1',
      'a@b.c',
      'session-1',
    )

    await expect(service().verifyAccessToken(forged.token)).rejects.toBeInstanceOf(
      UnauthorizedError,
    )
  })

  it('rejects a tampered payload', async () => {
    const tokens = service()
    const { token } = await tokens.issueAccessToken('user-1', 'a@b.c', 'session-1')
    const [header, payload, signature] = token.split('.')
    const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as Record<
      string,
      unknown
    >
    claims.sub = 'user-2'

    const forged = [
      header,
      Buffer.from(JSON.stringify(claims)).toString('base64url'),
      signature,
    ].join('.')

    await expect(tokens.verifyAccessToken(forged)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('rejects an expired token', async () => {
    const expired = await service({ JWT_ACCESS_TTL_SECONDS: -1 }).issueAccessToken(
      'user-1',
      'a@b.c',
      'session-1',
    )

    await expect(service().verifyAccessToken(expired.token)).rejects.toBeInstanceOf(
      UnauthorizedError,
    )
  })

  it('rejects a well-signed token that is missing the session claim', async () => {
    // A token without `sid` cannot be checked against a revoked session, so it
    // must not authenticate even though its signature is valid.
    const token = await new JwtService({}).signAsync(
      { sub: 'user-1', email: 'a@b.c' },
      { secret: SECRET, expiresIn: 900 },
    )

    await expect(service().verifyAccessToken(token)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('rejects nonsense input', async () => {
    await expect(service().verifyAccessToken('not-a-token')).rejects.toBeInstanceOf(
      UnauthorizedError,
    )
  })
})

describe('TokenService refresh tokens', () => {
  it('issues 256 bits of opaque randomness, different every time', () => {
    const tokens = service()
    const first = tokens.generateRefreshToken()
    const second = tokens.generateRefreshToken()

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).not.toBe(second)
  })

  it('stores only a hash, and the hash is not the token', () => {
    const tokens = service()
    const token = tokens.generateRefreshToken()
    const hash = tokens.hashRefreshToken(token)

    expect(hash).toBe(createHash('sha256').update(token).digest('hex'))
    expect(hash).not.toContain(token)
    expect(tokens.hashRefreshToken(token)).toBe(hash)
  })

  it('places the refresh expiry in the future', () => {
    const expiresAt = service({ JWT_REFRESH_TTL_SECONDS: 120 }).refreshExpiryFromNow()
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
  })
})
