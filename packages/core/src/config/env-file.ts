import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { loadEnvFile } from 'node:process'

/**
 * Loads the first `.env` found at or above `startDir`.
 *
 * In a container the environment is already populated by the orchestrator, so
 * nothing is found and nothing is loaded. Locally this replaces a `dotenv`
 * dependency with Node's built-in reader.
 */
export function loadEnvFileFromAncestors(startDir: string = process.cwd()): string | undefined {
  let dir = resolve(startDir)

  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = resolve(dir, '.env')
    if (existsSync(candidate)) {
      loadEnvFile(candidate)
      return candidate
    }

    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return undefined
}