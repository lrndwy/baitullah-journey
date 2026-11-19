import { passwordPolicyRules, resolvePasswordPolicy, type PasswordRule } from '@app/contracts'
import { apiFetch } from './api'

/**
 * The password rules this deployment enforces.
 *
 * They live on the API (`GET /api/_meta/password-policy`) rather than in the
 * bundle because `PASSWORD_POLICY` and `PASSWORD_MIN_LENGTH` are runtime
 * settings: an image built once has to be able to tighten its policy with an
 * environment variable. The fallback below only covers the moment before the
 * answer arrives, and it matches the template's default preset, so a form never
 * advertises rules weaker than the server will apply.
 */
export interface PasswordPolicySummary {
  level: 'LOW' | 'MEDIUM' | 'STRONG'
  minLength: number
  rules: PasswordRule[]
}

function defaultPolicy(): PasswordPolicySummary {
  const policy = resolvePasswordPolicy({ level: 'STRONG' })
  return {
    level: policy.level,
    minLength: policy.minLength,
    rules: passwordPolicyRules(policy),
  }
}

let inFlight: Promise<PasswordPolicySummary> | null = null

/**
 * Cached for the lifetime of the tab: the policy changes with a deployment, and
 * a form does not need to poll for it. A failure falls back to the default
 * preset instead of blocking the form — the server still rejects a weak
 * password, the client has simply lost the ability to predict why.
 */
export function fetchPasswordPolicy(): Promise<PasswordPolicySummary> {
  inFlight ??= apiFetch<PasswordPolicySummary>('/api/_meta/password-policy').catch(() =>
    defaultPolicy(),
  )
  return inFlight
}