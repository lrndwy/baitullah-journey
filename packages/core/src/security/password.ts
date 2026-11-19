import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64

/**
 * Returned when the stored value cannot be a hash this system wrote. Named so
 * every rejection path reads the same and the reason is stated once.
 */
const MISMATCH = false

/**
 * Password hashing is a kernel primitive, not a module's business: the auth
 * module verifies passwords and the users module sets them, and neither is
 * allowed to import the other.
 *
 * scrypt ships with Node, so there is no native build step to break on deploy.
 * ponytail: single scrypt pass with Node defaults. Move to argon2id when you
 * need memory-hard tuning or a per-hash cost upgrade path.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltPart, hashPart] = stored.split(':')
  if (scheme !== 'scrypt' || !saltPart || !hashPart) return MISMATCH

  const expected = Buffer.from(hashPart, 'base64')

  // The length is checked before deriving, and the derivation always asks for
  // KEY_LENGTH. scrypt's output is prefix-stable — PBKDF2 with one iteration
  // computes T1 identically whatever `dkLen` is — so deriving to
  // `expected.length` would let a *truncated* stored hash verify successfully.
  // A column truncation or a bad import would then silently weaken every
  // password check instead of failing it.
  if (expected.length !== KEY_LENGTH) return MISMATCH

  const derived = await scryptAsync(password, Buffer.from(saltPart, 'base64'), KEY_LENGTH)
  return timingSafeEqual(expected, derived)
}
