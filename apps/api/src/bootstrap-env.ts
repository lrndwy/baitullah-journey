import { loadEnvFileFromAncestors } from '@app/core/config'

/**
 * Imported first, for its side effects, before any module reads configuration.
 *
 * Deliberately imported through the `@app/core/config` subpath rather than the
 * package barrel: the barrel pulls in the root logger, which reads the
 * environment at import time and would therefore run before this line.
 *
 * In a container the real environment is already populated and nothing is
 * found; locally the nearest `.env` at or above the working directory is read.
 */
loadEnvFileFromAncestors()

export {}