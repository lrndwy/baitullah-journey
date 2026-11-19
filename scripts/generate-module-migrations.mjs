#!/usr/bin/env node
/**
 * Generates one migrations folder per module: `modules/<name>/migrations`.
 *
 * Drizzle Kit emits to a single `out` directory per invocation, so a module that
 * owns tables is generated with its own schema glob and its own output folder.
 * Keeping migrations with the module is what makes deleting a module mean
 * deleting a folder — rather than leaving orphaned SQL behind in a shared pile.
 *
 * Usage: node scripts/generate-module-migrations.mjs [appDir]
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const appDir = resolve(process.argv[2] ?? 'apps/api')
const modulesDir = join(appDir, 'src', 'modules')

const modules = readdirSync(modulesDir).filter((entry) =>
  statSync(join(modulesDir, entry)).isDirectory(),
)

const withSchema = modules.filter((name) =>
  readdirSync(join(modulesDir, name)).some((file) => file.endsWith('.schema.ts')),
)

if (withSchema.length === 0) {
  console.log('no module declares a schema — nothing to generate')
  process.exit(0)
}

let failed = 0

for (const name of withSchema) {
  const out = join('src', 'modules', name, 'migrations')
  const schema = join('src', 'modules', name, '*.schema.ts')

  const result = spawnSync(
    'pnpm',
    ['exec', 'drizzle-kit', 'generate', '--dialect', 'postgresql', `--schema=${schema}`, `--out=${out}`],
    { cwd: appDir, stdio: 'inherit' },
  )

  if (result.status !== 0) {
    console.error(`failed to generate migrations for module "${name}"`)
    failed += 1
  }
}

process.exit(failed === 0 ? 0 : 1)

export { existsSync }