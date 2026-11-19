import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

/**
 * Password hashing is the primitive that stands between a database leak and
 * every account. The two properties worth pinning are that a stored hash never
 * contains the password, and that a stored value which is malformed fails
 * closed rather than throwing its way into a 500.
 */
describe('hashPassword', () => {
  it('stores a scheme tag, a salt and a derived key — never the password', async () => {
    const stored = await hashPassword('correct horse battery staple')

    expect(stored).toMatch(/^scrypt:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/)
    expect(stored).not.toContain('correct horse battery staple')
    expect(stored).not.toContain('horse')
  })

  it('derives the same password differently every time, because the salt is random', async () => {
    const [first, second] = await Promise.all([hashPassword('same'), hashPassword('same')])

    expect(first).not.toBe(second)
    const salt = (stored: string) => stored.split(':')[1]
    expect(salt(first)).not.toBe(salt(second))
  })

  it('handles an empty password without producing an empty hash', async () => {
    const stored = await hashPassword('')
    expect(stored).toMatch(/^scrypt:[^:]+:[^:]+$/)
    await expect(verifyPassword('', stored)).resolves.toBe(true)
  })

  it('handles unicode and long input', async () => {
    const password = `${'pässwörd🔐'.repeat(3)}${'x'.repeat(500)}`
    const stored = await hashPassword(password)

    await expect(verifyPassword(password, stored)).resolves.toBe(true)
    await expect(verifyPassword(`${password}y`, stored)).resolves.toBe(false)
  })
})

describe('verifyPassword', () => {
  it('accepts the right password and rejects everything else', async () => {
    const stored = await hashPassword('s3cret-passphrase')

    await expect(verifyPassword('s3cret-passphrase', stored)).resolves.toBe(true)
    await expect(verifyPassword('s3cret-passphras', stored)).resolves.toBe(false)
    await expect(verifyPassword('S3cret-passphrase', stored)).resolves.toBe(false)
    await expect(verifyPassword('', stored)).resolves.toBe(false)
  })

  it('fails closed on a malformed stored value instead of throwing', async () => {
    // Every one of these is reachable from a hand-edited row, a truncated
    // column or an import from a system with a different hashing scheme.
    for (const stored of [
      '',
      'scrypt',
      'scrypt:',
      'scrypt:salt',
      'bcrypt:salt:hash',
      '::',
      'null',
    ]) {
      await expect(verifyPassword('anything', stored)).resolves.toBe(false)
    }
  })

  it('rejects a hash written under a different scheme, even with a matching key', async () => {
    const stored = await hashPassword('legacy')
    const [, salt, hash] = stored.split(':')

    await expect(verifyPassword('legacy', `bcrypt:${salt}:${hash}`)).resolves.toBe(false)
  })

  it('does not accept a truncated derived key', async () => {
    const stored = await hashPassword('truncate-me')
    const [scheme, salt, hash] = stored.split(':')
    const truncated = `${scheme}:${salt}:${hash?.slice(0, 8)}`

    await expect(verifyPassword('truncate-me', truncated)).resolves.toBe(false)
  })
})
