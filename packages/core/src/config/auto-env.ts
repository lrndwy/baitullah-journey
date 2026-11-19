import { loadEnvFileFromAncestors } from './env-file'

/**
 * Side-effecting module. Import it as the *first* import of an entrypoint that
 * needs a local `.env`, before anything that calls `getEnv()`.
 *
 * ESM/CJS imports are evaluated in source order, so a module that creates
 * state at import time (the root logger does) must be imported after this one.
 * That is why this is a module rather than a statement: moving the call into
 * the entrypoint would run it too late.
 */
loadEnvFileFromAncestors()

export {}