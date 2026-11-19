import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

/**
 * Development runner for the API: one process to watch-and-compile with `tsc`,
 * one to watch-and-restart the compiled server.
 *
 * `nest start --watch` is not used because the Nest CLI requires the
 * programmatic TypeScript compiler API, which TypeScript 7 no longer ships.
 * Compiling with `tsc` directly is both simpler and decoupled from the
 * framework's release cadence.
 */
const packageDir = resolve(process.argv[2] ?? '.')
const tscBin = resolve(packageDir, '../../node_modules/typescript/bin/tsc')

const children = []

function run(label, command, args) {
  const child = spawn(command, args, { cwd: packageDir, stdio: 'inherit' })
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[dev] ${label} exited with code ${code}`)
      shutdown(code)
    }
  })
  children.push(child)
  return child
}

function shutdown(code) {
  for (const child of children) child.kill('SIGTERM')
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('[dev] compiling once before starting the server…')
run('tsc', process.execPath, [tscBin, '-p', 'tsconfig.json'])
  .on('exit', (code) => {
    if (code !== 0) return

    run('tsc --watch', process.execPath, [
      tscBin,
      '-p',
      'tsconfig.json',
      '--watch',
      '--preserveWatchOutput',
    ])
    run('node --watch', process.execPath, ['--watch', '--enable-source-maps', 'dist/main.js'])
  })
