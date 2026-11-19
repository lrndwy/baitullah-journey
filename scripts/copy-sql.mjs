import { existsSync } from 'node:fs'
import { cp, mkdir, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

/**
 * Copies every `.sql` file under `<package>/src` to the same relative path
 * under `<package>/dist`.
 *
 * `tsc` only emits JavaScript, so a module's migrations would otherwise be
 * missing from the build — and a container that cannot apply its own module
 * migrations is a container that fails at 3am on the next deploy.
 */
const packageDir = process.argv[2] ?? '.'
const sourceRoot = resolve(packageDir, 'src')
const outputRoot = resolve(packageDir, 'dist')

async function copySql(dir) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await copySql(full)
    } else if (entry.name.endsWith('.sql')) {
      const target = join(outputRoot, relative(sourceRoot, full))
      await mkdir(dirname(target), { recursive: true })
      await cp(full, target)
      console.log(`copied ${relative(process.cwd(), target)}`)
    }
  }
}

if (!existsSync(sourceRoot)) {
  console.error(`no source directory at ${sourceRoot}`)
  process.exit(1)
}

await copySql(sourceRoot)
