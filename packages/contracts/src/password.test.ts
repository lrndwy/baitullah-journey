import { describe, expect, it } from 'vitest'
import {
  PASSWORD_MAX_LENGTH,
  checkPassword,
  isPasswordExpired,
  isPasswordAcceptable,
  passwordPolicyRules,
  resolvePasswordPolicy,
} from './password'

const STRONG = resolvePasswordPolicy({ level: 'STRONG' })
const MEDIUM = resolvePasswordPolicy({ level: 'MEDIUM' })
const LOW = resolvePasswordPolicy({ level: 'LOW' })

function codes(password: string, policy = STRONG, context?: { email?: string; name?: string }) {
  return checkPassword(password, policy, context).map((violation) => violation.code)
}

describe('resolvePasswordPolicy', () => {
  it('defaults to STRONG with a 12-character minimum', () => {
    expect(resolvePasswordPolicy()).toMatchObject({
      level: 'STRONG',
      minLength: 12,
      minCharacterClasses: 4,
      forbidCommonPasswords: true,
    })
  })

  it('lowers the requirements at MEDIUM and LOW', () => {
    expect(MEDIUM.minLength).toBe(8)
    expect(MEDIUM.minCharacterClasses).toBe(3)
    expect(MEDIUM.forbidCommonPasswords).toBe(false)
    expect(LOW.minCharacterClasses).toBe(1)
    expect(LOW.forbidSequences).toBe(false)
  })

  it('never lets configuration drop below the absolute floor', () => {
    expect(resolvePasswordPolicy({ level: 'STRONG', minLength: 4 }).minLength).toBe(12)
    expect(resolvePasswordPolicy({ level: 'LOW', minLength: 4 }).minLength).toBe(8)
  })

  it('accepts a configured minimum above the preset', () => {
    expect(resolvePasswordPolicy({ level: 'MEDIUM', minLength: 20 }).minLength).toBe(20)
  })

  it('falls back to STRONG for an unknown level', () => {
    expect(resolvePasswordPolicy({ level: 'PARANOID' as 'STRONG' }).level).toBe('STRONG')
  })
})

describe('checkPassword — the LOW/MEDIUM/STRONG ladder', () => {
  it('LOW accepts a long lowercase password', () => {
    expect(codes('abcdefgh', LOW)).toEqual([])
  })

  it('MEDIUM refuses the same password for composition', () => {
    expect(codes('abcdefgh', MEDIUM)).toContain('weak_composition')
  })

  it('MEDIUM accepts eight characters across three classes', () => {
    expect(codes('Abcdef1!', MEDIUM)).toEqual([])
  })

  it('STRONG refuses a password shorter than its minimum', () => {
    expect(codes('Abc1!')).toContain('too_short')
  })

  it('STRONG accepts a long, mixed, non-dictionary secret', () => {
    expect(codes('Tembok#Hijau27')).toEqual([])
  })
})

describe('checkPassword — what composition rules alone miss', () => {
  it('refuses a common password even with leetspeak and padding', () => {
    expect(codes('P@ssw0rd1234')).toContain('common_password')
  })

  it('refuses a keyboard run', () => {
    expect(codes('Qwerty#Hijau27')).toContain('predictable_sequence')
  })

  it('refuses an alphabetic run', () => {
    expect(codes('Abcdef#Hijau27')).toContain('predictable_sequence')
  })

  it('refuses a password built from a handful of distinct characters', () => {
    expect(codes('aaaaaaaa#aa1')).toContain('repeated_characters')
  })

  it('refuses the account email local part', () => {
    expect(codes('Johndoe#Hijau27', STRONG, { email: 'johndoe@example.com' })).toContain(
      'contains_identity',
    )
  })

  it('refuses part of the account name', () => {
    expect(codes('Baitullah#Hijau27', STRONG, { name: 'Baitullah Journey' })).toContain(
      'contains_identity',
    )
  })

  it('refuses a password above the absolute ceiling', () => {
    expect(codes('A1!' + 'x'.repeat(PASSWORD_MAX_LENGTH))).toContain('too_long')
  })

  it('reports every broken rule in one pass', () => {
    expect(codes('123')).toEqual(
      expect.arrayContaining(['too_short', 'weak_composition', 'repeated_characters']),
    )
  })
})

describe('isPasswordAcceptable', () => {
  it('is the boolean form of checkPassword', () => {
    expect(isPasswordAcceptable('Tembok#Hijau27', STRONG)).toBe(true)
    expect(isPasswordAcceptable('123', STRONG)).toBe(false)
  })
})

describe('passwordPolicyRules', () => {
  it('describes STRONG as five rules with stable codes', () => {
    expect(passwordPolicyRules(STRONG).map((rule) => rule.code)).toEqual([
      'length',
      'composition',
      'common',
      'sequence',
      'identity',
    ])
  })

  it('describes LOW as the length rule only', () => {
    expect(passwordPolicyRules(LOW)).toEqual([
      { code: 'length', label: 'At least 8 characters' },
    ])
  })
})

describe('isPasswordExpired', () => {
  const now = new Date('2026-11-08T00:00:00Z')

  it('never expires when rotation is disabled', () => {
    expect(isPasswordExpired(new Date('2020-01-01T00:00:00Z'), 0, now)).toBe(false)
  })

  it('never expires a password that was never set here', () => {
    expect(isPasswordExpired(null, 30, now)).toBe(false)
  })

  it('expires a password older than the maximum age', () => {
    expect(isPasswordExpired(new Date('2026-10-01T00:00:00Z'), 30, now)).toBe(true)
  })

  it('keeps a password inside the window', () => {
    expect(isPasswordExpired(new Date('2026-10-20T00:00:00Z'), 30, now)).toBe(false)
  })
})