import type { InquiryStatus } from '@app/contracts'
import { INQUIRY_TRANSITIONS } from '@app/contracts'

export function canTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  return INQUIRY_TRANSITIONS[from].includes(to)
}

export interface QuotaDelta {
  /** Change to apply to available_quota (negative = decrement). */
  availableQuotaDelta: number
  /** Next quotaApplied flag on the inquiry. */
  quotaApplied: boolean
  /** When true and available becomes 0 after apply, set departure to full. */
  markFullIfZero: boolean
  /** When true and available > 0 after apply, set departure open if it was full. */
  reopenIfSeats: boolean
}

/**
 * Pure quota side-effects for a status change. Callers apply this inside a
 * transaction against the departure row.
 */
export function quotaEffectForTransition(input: {
  from: InquiryStatus
  to: InquiryStatus
  paxCount: number
  quotaApplied: boolean
}): QuotaDelta | null {
  const { from, to, paxCount, quotaApplied } = input

  if (to === 'dikonfirmasi' && from !== 'dikonfirmasi' && !quotaApplied) {
    return {
      availableQuotaDelta: -paxCount,
      quotaApplied: true,
      markFullIfZero: true,
      reopenIfSeats: false,
    }
  }

  if (from === 'dikonfirmasi' && to === 'ditolak' && quotaApplied) {
    return {
      availableQuotaDelta: paxCount,
      quotaApplied: false,
      markFullIfZero: false,
      reopenIfSeats: true,
    }
  }

  return null
}
