import { describe, expect, it } from 'vitest'
import { canTransition, quotaEffectForTransition } from './inquiry-transitions'

describe('canTransition', () => {
  it('allows the agreed happy path and reject edges', () => {
    expect(canTransition('baru', 'dihubungi')).toBe(true)
    expect(canTransition('baru', 'ditolak')).toBe(true)
    expect(canTransition('dihubungi', 'dikonfirmasi')).toBe(true)
    expect(canTransition('dikonfirmasi', 'selesai')).toBe(true)
    expect(canTransition('dikonfirmasi', 'ditolak')).toBe(true)
  })

  it('rejects skips and reopen', () => {
    expect(canTransition('baru', 'dikonfirmasi')).toBe(false)
    expect(canTransition('dikonfirmasi', 'dihubungi')).toBe(false)
    expect(canTransition('selesai', 'baru')).toBe(false)
    expect(canTransition('ditolak', 'dihubungi')).toBe(false)
  })
})

describe('quotaEffectForTransition', () => {
  it('decrements by pax when confirming', () => {
    expect(
      quotaEffectForTransition({
        from: 'dihubungi',
        to: 'dikonfirmasi',
        paxCount: 3,
        quotaApplied: false,
      }),
    ).toEqual({
      availableQuotaDelta: -3,
      quotaApplied: true,
      markFullIfZero: true,
      reopenIfSeats: false,
    })
  })

  it('restores pax when rejecting after confirm', () => {
    expect(
      quotaEffectForTransition({
        from: 'dikonfirmasi',
        to: 'ditolak',
        paxCount: 2,
        quotaApplied: true,
      }),
    ).toEqual({
      availableQuotaDelta: 2,
      quotaApplied: false,
      markFullIfZero: false,
      reopenIfSeats: true,
    })
  })

  it('does nothing for contact or complete without prior quota', () => {
    expect(
      quotaEffectForTransition({
        from: 'baru',
        to: 'dihubungi',
        paxCount: 2,
        quotaApplied: false,
      }),
    ).toBeNull()
    expect(
      quotaEffectForTransition({
        from: 'dikonfirmasi',
        to: 'selesai',
        paxCount: 2,
        quotaApplied: true,
      }),
    ).toBeNull()
  })
})
