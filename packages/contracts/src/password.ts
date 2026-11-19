/**
 * Password policy — the shared rulebook for every password this application
 * writes: self-service reset, an authenticated change, an administrator
 * creating an account, and the bootstrap admin.
 *
 * It lives in `@app/contracts` rather than in the API because the browser has
 * to explain the rules *before* the form is submitted, and a client that only
 * learned the rules from a 400 response would be a worse UI. The API remains
 * the only place that enforces them: everything here is pure and side-effect
 * free, so it is safe to ship to a browser.
 *
 * The three levels mirror MySQL's `validate_password.policy` (LOW / MEDIUM /
 * STRONG) so a reader coming from the DBA side recognises the ladder, but the
 * checks are applied in the application, where they run before a hash is ever
 * computed.
 */

export const PASSWORD_POLICY_LEVELS = ['LOW', 'MEDIUM', 'STRONG'] as const
export type PasswordPolicyLevel = (typeof PASSWORD_POLICY_LEVELS)[number]

/**
 * An absolute ceiling. It is not a security rule — it bounds the work a single
 * request can ask scrypt to do, so an unauthenticated caller cannot buy CPU by
 * posting a one-megabyte password.
 */
export const PASSWORD_MAX_LENGTH = 200

/** The floor below which no policy level may be configured. */
export const PASSWORD_MIN_LENGTH_FLOOR = 8

export interface PasswordPolicy {
  level: PasswordPolicyLevel
  /** Characters required, counted in code points. */
  minLength: number
  /**
   * How many of {lowercase, uppercase, digit, symbol} must be present.
   * 1 = length only, 3 = mixed, 4 = full complexity.
   */
  minCharacterClasses: number
  /** Reject anything in the built-in dictionary of leaked/obvious passwords. */
  forbidCommonPasswords: boolean
  /** Reject a password that contains the account's own email local part or name. */
  forbidIdentitySubstrings: boolean
  /** Reject `12345678`, `abcdefgh` and keyboard runs like `qwerty`. */
  forbidSequences: boolean
}

type PasswordPolicyPreset = Omit<PasswordPolicy, 'level' | 'minLength'> & { minLength: number }

/**
 * LOW is the MySQL equivalent of "length only". MEDIUM adds the mixed-character
 * requirement. STRONG adds the checks that defeat the attacks a composition
 * rule alone does not stop: dictionary, credential stuffing and the user's own
 * name.
 */
export const PASSWORD_POLICY_PRESETS: Record<PasswordPolicyLevel, PasswordPolicyPreset> = {
  LOW: {
    minLength: 8,
    minCharacterClasses: 1,
    forbidCommonPasswords: false,
    forbidIdentitySubstrings: false,
    forbidSequences: false,
  },
  MEDIUM: {
    minLength: 8,
    minCharacterClasses: 3,
    forbidCommonPasswords: false,
    forbidIdentitySubstrings: false,
    forbidSequences: false,
  },
  STRONG: {
    minLength: 12,
    minCharacterClasses: 4,
    forbidCommonPasswords: true,
    forbidIdentitySubstrings: true,
    forbidSequences: true,
  },
}

/**
 * Merge a level with the deployment's own minimum length. The length is raised,
 * never lowered below the preset's floor: `PASSWORD_MIN_LENGTH=4` must not be
 * able to undo what the level promised.
 */
export function resolvePasswordPolicy(
  input: { level?: PasswordPolicyLevel; minLength?: number } = {},
): PasswordPolicy {
  const level = PASSWORD_POLICY_LEVELS.includes(input.level ?? 'STRONG')
    ? (input.level ?? 'STRONG')
    : 'STRONG'
  const preset = PASSWORD_POLICY_PRESETS[level]

  return {
    level,
    ...preset,
    minLength: Math.max(PASSWORD_MIN_LENGTH_FLOOR, preset.minLength, input.minLength ?? 0),
  }
}

export const PASSWORD_VIOLATION_CODES = [
  'too_short',
  'too_long',
  'weak_composition',
  'common_password',
  'contains_identity',
  'predictable_sequence',
  'repeated_characters',
] as const

export type PasswordViolationCode = (typeof PASSWORD_VIOLATION_CODES)[number]

export interface PasswordViolation {
  code: PasswordViolationCode
  /** Ready to render: the API returns this verbatim so the UI never paraphrases a rule. */
  message: string
}

export interface PasswordContext {
  email?: string | null
  name?: string | null
}

/**
 * Passwords that appear at the top of every leaked-credential corpus. Kept
 * small and literal on purpose: it is a *policy* denial list, not a wordlist
 * engine, and it ships to the browser.
 */
export const COMMON_PASSWORDS: readonly string[] = [
  '000000',
  '111111',
  '121212',
  '123123',
  '123321',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '12345qwert',
  '1q2w3e4r',
  '1qaz2wsx',
  '654321',
  '666666',
  '696969',
  '987654321',
  'aa123456',
  'abc123',
  'abcdef',
  'abcdefg',
  'abcdefgh',
  'access',
  'admin',
  'admin123',
  'administrator',
  'asdfgh',
  'asdfghjkl',
  'azerty',
  'baseball',
  'batman',
  'changeme',
  'computer',
  'contraseña',
  'dragon',
  'football',
  'freedom',
  'guest',
  'hunter2',
  'iloveyou',
  'jennifer',
  'jordan23',
  'letmein',
  'login',
  'lovely',
  'master',
  'michael',
  'monkey',
  'mustang',
  'ninja',
  'passw0rd',
  'password',
  'password1',
  'password123',
  'password1234',
  'pokemon',
  'princess',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'root',
  'secret',
  'shadow',
  'soccer',
  'starwars',
  'sunshine',
  'superman',
  'test1234',
  'tester',
  'toor',
  'trustno1',
  'wachtwoord',
  'welcome',
  'welcome1',
  'whatever',
  'zaq12wsx',
  'zxcvbnm',
]

/**
 * Leetspeak folding: `P@ssw0rd!` is the same secret as `password` to anyone who
 * has read a leaked hash list, so the dictionary has to see it that way too.
 */
const LEET_FOLDING: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
  '+': 't',
}

const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const REVERSED_SEQUENCES = SEQUENCES.map((sequence) => sequence.split('').toReversed().join(''))

/**
 * Both sides of the dictionary comparison go through this, so `P@ssw0rd` and
 * `password` land on the same string. Canonicalising the list once at load
 * keeps the check a single set lookup per attempt.
 */
function dictionaryForm(password: string): string {
  return password
    .toLowerCase()
    .replace(/[^a-z0-9@$!+]/g, '')
    .replace(/[0-9@$!+]/g, (character) => LEET_FOLDING[character] ?? character)
}

const COMMON_PASSWORD_FORMS = new Set(COMMON_PASSWORDS.map(dictionaryForm))

function characterClasses(password: string): {
  lower: boolean
  upper: boolean
  digit: boolean
  symbol: boolean
} {
  return {
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
}

function hasPredictableSequence(password: string): boolean {
  const lower = password.toLowerCase()
  for (let index = 0; index + 4 <= lower.length; index += 1) {
    const window = lower.slice(index, index + 4)
    if (
      SEQUENCES.some((sequence) => sequence.includes(window)) ||
      REVERSED_SEQUENCES.some((sequence) => sequence.includes(window))
    ) {
      return true
    }
  }
  return false
}

function identityTokens(context: PasswordContext | undefined): string[] {
  if (!context) return []

  const tokens = new Set<string>()
  const emailLocalPart = context.email?.split('@')[0]?.trim().toLowerCase()
  if (emailLocalPart && emailLocalPart.length >= 4) tokens.add(emailLocalPart)

  for (const part of context.name?.split(/\s+/) ?? []) {
    const token = part.trim().toLowerCase()
    if (token.length >= 4) tokens.add(token)
  }

  return [...tokens]
}

/**
 * Every rule the policy states, in one pure pass. Returning *all* violations
 * rather than the first one is deliberate: a user who fixes one rule only to be
 * told about the next one has to submit twice, which is how people end up
 * choosing `Password1!` out of fatigue.
 */
export function checkPassword(
  password: string,
  policy: PasswordPolicy,
  context?: PasswordContext,
): PasswordViolation[] {
  const violations: PasswordViolation[] = []

  if (password.length > PASSWORD_MAX_LENGTH) {
    violations.push({
      code: 'too_long',
      message: `The password must be at most ${PASSWORD_MAX_LENGTH} characters`,
    })
  }

  if (password.length < policy.minLength) {
    violations.push({
      code: 'too_short',
      message: `The password must be at least ${policy.minLength} characters`,
    })
  }

  const classes = characterClasses(password)
  const present = [classes.lower, classes.upper, classes.digit, classes.symbol].filter(Boolean).length
  if (present < policy.minCharacterClasses) {
    const missing = [
      !classes.lower && 'a lowercase letter',
      !classes.upper && 'an uppercase letter',
      !classes.digit && 'a digit',
      !classes.symbol && 'a symbol',
    ].filter(Boolean) as string[]

    violations.push({
      code: 'weak_composition',
      message: `The password must combine at least ${policy.minCharacterClasses} character types: add ${missing.join(', ')}`,
    })
  }

  if (policy.forbidCommonPasswords && COMMON_PASSWORD_FORMS.has(dictionaryForm(password))) {
    violations.push({
      code: 'common_password',
      message: 'That password appears in leaked-password dictionaries — choose something you invented',
    })
  }

  if (policy.forbidSequences && hasPredictableSequence(password)) {
    violations.push({
      code: 'predictable_sequence',
      message: 'Avoid runs like 1234, abcd or qwerty — they are the first thing a brute-force tool tries',
    })
  }

  if (policy.forbidSequences && new Set(password).size < 4) {
    violations.push({
      code: 'repeated_characters',
      message: 'The password repeats too few distinct characters',
    })
  }

  if (policy.forbidIdentitySubstrings) {
    const lower = password.toLowerCase()
    const leaked = identityTokens(context).filter((token) => lower.includes(token))
    if (leaked.length > 0) {
      violations.push({
        code: 'contains_identity',
        message: 'The password must not contain your name or email address',
      })
    }
  }

  return violations
}

export function isPasswordAcceptable(
  password: string,
  policy: PasswordPolicy,
  context?: PasswordContext,
): boolean {
  return checkPassword(password, policy, context).length === 0
}

/** The rules as short sentences, for the checklist under a password field. */
export const PASSWORD_RULE_CODES = ['length', 'composition', 'common', 'sequence', 'identity'] as const
export type PasswordRuleCode = (typeof PASSWORD_RULE_CODES)[number]

export interface PasswordRule {
  /** Which violation clears this rule — the UI ticks a row by matching this. */
  code: PasswordRuleCode
  label: string
}

/**
 * The active rules, with a stable code beside each label. The code is what lets
 * a form tick the rule that a `PasswordViolation` clears without parsing prose.
 */
export function passwordPolicyRules(policy: PasswordPolicy): PasswordRule[] {
  const rules: PasswordRule[] = [
    { code: 'length', label: `At least ${policy.minLength} characters` },
  ]

  if (policy.minCharacterClasses >= 3) {
    rules.push({
      code: 'composition',
      label: 'Mix uppercase and lowercase letters with digits and symbols',
    })
  } else if (policy.minCharacterClasses === 2) {
    rules.push({ code: 'composition', label: 'Combine letters with digits or symbols' })
  }

  if (policy.forbidCommonPasswords) {
    rules.push({ code: 'common', label: 'Not a common or previously leaked password' })
  }
  if (policy.forbidSequences) {
    rules.push({ code: 'sequence', label: 'No runs such as 1234, abcd or qwerty' })
  }
  if (policy.forbidIdentitySubstrings) {
    rules.push({ code: 'identity', label: 'Not your name or email address' })
  }

  return rules
}

export function describePasswordPolicy(policy: PasswordPolicy): string[] {
  return passwordPolicyRules(policy).map((rule) => rule.label)
}

/**
 * Rotation. `0` disables expiry, which is the template default: forced rotation
 * annoys more people than it protects, and the deployments that require it by
 * policy can turn it on. `passwordChangedAt === null` means "never set through
 * this system" — an OAuth-only account, which has no password to expire.
 */
export function isPasswordExpired(
  passwordChangedAt: Date | null,
  maxAgeDays: number,
  now: Date = new Date(),
): boolean {
  if (maxAgeDays <= 0 || !passwordChangedAt) return false
  return now.getTime() - passwordChangedAt.getTime() > maxAgeDays * 24 * 60 * 60 * 1000
}