#!/usr/bin/env node
/**
 * Enforces the module boundary rules that make this template's central promise
 * true: a module can be added or deleted without touching any other module.
 *
 *   1. A module must not import another module's internals.
 *      Use `@app/core`, or publish a domain event.
 *   2. The kernel must not know what is installed.
 *      `modules/index.ts` is the single deliberate exception — the composition
 *      root, the one file a new module is registered in.
 *
 * Written as a dependency-free scan instead of using a graph tool because the
 * rule is purely lexical (which file imports which directory) and this runs on
 * any TypeScript version. A gate that silently cruises zero files is worse than
 * no gate at all.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const apiRoot = resolve(fileURLToPath(new URL('..', import.meta.url)), 'apps/api/src')
const modulesRoot = join(apiRoot, 'modules')
const platformRoot = join(apiRoot, 'platform')
const compositionRoot = join(modulesRoot, 'index.ts')

const SPECIFIER = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(full)))
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) files.push(full)
  }

  return files
}

/** Resolves a relative specifier the way Node/tsc would, without needing TS. */
async function resolveSpecifier(specifier, fromFile) {
  if (!specifier.startsWith('.')) return undefined

  const base = resolve(dirname(fromFile), specifier)
  for (const candidate of [`${base}.ts`, join(base, 'index.ts'), base]) {
    try {
      const info = await stat(candidate)
      if (info.isFile()) return candidate
    } catch {
      // try the next shape
    }
  }

  return undefined
}

async function fileExists(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function moduleDirs() {
  const entries = await readdir(modulesRoot, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

/** The module a path belongs to, or undefined when it is outside every module. */
function owningModule(path, modules) {
  for (const name of modules) {
    if (path.startsWith(join(modulesRoot, name) + sep)) return name
  }
  return undefined
}

async function main() {
  const modules = await moduleDirs()
  const violations = []
  let scanned = 0

  for (const module of modules) {
    for (const file of await listFiles(join(modulesRoot, module))) {
      scanned += 1
      const contents = await readFile(file, 'utf8')

      for (const match of contents.matchAll(SPECIFIER)) {
        const target = await resolveSpecifier(match[1], file)
        if (!target) continue

        const owner = owningModule(target, modules)
        if (owner && owner !== module && target !== compositionRoot) {
          violations.push({
            rule: 'no-cross-module-imports',
            file,
            target,
            message: `module "${module}" imports module "${owner}". Depend on @app/core or publish an event instead.`,
          })
        }
      }
    }
  }

  for (const file of await listFiles(platformRoot)) {
    scanned += 1
    const contents = await readFile(file, 'utf8')

    for (const match of contents.matchAll(SPECIFIER)) {
      const target = await resolveSpecifier(match[1], file)
      if (!target) continue

      if (target !== compositionRoot && owningModule(target, modules)) {
        violations.push({
          rule: 'kernel-does-not-know-modules',
          file,
          target,
          message: 'the kernel must not import a module. Register it in modules/index.ts instead.',
        })
      }

      // The specifier may also point at the modules folder without naming a
      // module (e.g. `../modules/index`), which the resolution above misses.
      if (match[1].endsWith('modules/index') && !(await fileExists(target))) {
        violations.push({
          rule: 'kernel-does-not-know-modules',
          file,
          target: match[1],
          message: 'unresolvable module import from the kernel.',
        })
      }
    }
  }

  if (violations.length > 0) {
    console.error(`\n${violations.length} module boundary violation(s):\n`)
    for (const violation of violations) {
      console.error(`  [${violation.rule}] ${relative(process.cwd(), violation.file)}`)
      console.error(`      → ${relative(process.cwd(), violation.target)}`)
      console.error(`      ${violation.message}\n`)
    }
    process.exit(1)
  }

  console.log(`module boundaries ok (${scanned} files scanned, ${modules.length} modules)`)
}

await main()