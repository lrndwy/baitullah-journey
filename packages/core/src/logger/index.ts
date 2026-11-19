import pino, { type Logger } from 'pino'
import { getEnv } from '../config/index'

export type { Logger }

/** Paths scrubbed from every log line before it leaves the process. */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.refreshToken',
  '*.accessToken',
  '*.token',
  '*.secret',
]

export function createLogger(name?: string): Logger {
  const env = getEnv()
  // pino-pretty is a devDependency — only ever referenced outside production.
  const usePretty = env.NODE_ENV === 'development' && process.stdout.isTTY === true

  return pino({
    name,
    level: env.LOG_LEVEL,
    base: undefined,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    ...(usePretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
          },
        }
      : {}),
  })
}

/**
 * The process-wide logger. Deliberately lazy: importing a library must not
 * require a fully populated environment, or every unit test that touches a
 * shared type pays for configuration it never uses.
 */
let root: Logger | undefined

export function rootLogger(): Logger {
  root ??= createLogger('app')
  return root
}
