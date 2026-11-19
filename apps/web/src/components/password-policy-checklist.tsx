'use client'

import { CheckIcon, MinusIcon, XIcon } from 'lucide-react'
import {
  checkPassword,
  resolvePasswordPolicy,
  type PasswordViolationCode,
} from '@app/contracts'
import { cn } from '@/lib/utils'
import type { PasswordPolicySummary } from '@/lib/password-policy'

/**
 * A violation says *what* is wrong; a rule says *which line of the checklist*
 * that clears. Keeping the mapping here (rather than in the rules) means a
 * violation can map to more than one rule without the server needing to repeat
 * itself.
 */
const RULE_OF_VIOLATION: Record<PasswordViolationCode, string> = {
  too_short: 'length',
  too_long: 'length',
  weak_composition: 'composition',
  common_password: 'common',
  predictable_sequence: 'sequence',
  repeated_characters: 'sequence',
  contains_identity: 'identity',
}

/**
 * The rule list under a password field, evaluated live with the same function
 * the API uses. A field that only reveals the rules after a failed submit is
 * exactly how people end up choosing `Password1!` out of fatigue.
 */
export function PasswordPolicyChecklist({
  password,
  policy,
  email,
  name,
  className,
}: {
  password: string
  policy: PasswordPolicySummary
  email?: string | null
  name?: string | null
  className?: string
}): React.ReactNode {
  const resolved = resolvePasswordPolicy({ level: policy.level, minLength: policy.minLength })
  const violated = new Set(
    (password ? checkPassword(password, resolved, { email, name }) : []).map(
      (violation) => RULE_OF_VIOLATION[violation.code],
    ),
  )

  return (
    <ul className={cn('flex flex-col gap-1 text-xs text-muted-foreground', className)} aria-live="polite">
      {policy.rules.map((rule) => {
        const satisfied = password.length > 0 && !violated.has(rule.code)
        const Icon = password.length === 0 ? MinusIcon : satisfied ? CheckIcon : XIcon

        return (
          <li
            key={rule.code}
            className={cn(
              'flex items-start gap-1.5',
              satisfied && 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{rule.label}</span>
          </li>
        )
      })}
    </ul>
  )
}