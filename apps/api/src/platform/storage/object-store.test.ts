import { describe, expect, it } from 'vitest'
import { isMissingObject } from './object-store.service'

/**
 * The decision this pins is the one that used to be erased: a bare `catch`
 * around `HeadObject` reported every failure as "the object was not found in the
 * bucket", so a broken `S3_ENDPOINT` sent the operator to inspect the bucket
 * while the real problem was the network.
 *
 * Only a genuine absence may be read as an empty bucket. Everything else has to
 * surface, because the alternative is a silent lie.
 */

/** The SDK throws a value whose shape is not in its public types. */
function sdkError(options: { status?: number; name?: string }): unknown {
  return { name: options.name ?? 'Error', $metadata: { httpStatusCode: options.status } }
}

describe('isMissingObject', () => {
  it('treats a 404 as absence', () => {
    expect(isMissingObject(sdkError({ status: 404 }))).toBe(true)
    expect(isMissingObject(sdkError({ status: 404, name: 'NotFound' }))).toBe(true)
  })

  it('treats the SDK error names for a missing key as absence', () => {
    expect(isMissingObject(sdkError({ name: 'NotFound' }))).toBe(true)
    expect(isMissingObject(sdkError({ name: 'NoSuchKey' }))).toBe(true)
  })

  it('does NOT treat a 403 as absence', () => {
    // Some gateways answer 403 for a missing key when the caller lacks
    // `s3:ListBucket`. Reporting that as "not uploaded" hides an authorisation
    // fault behind an empty-bucket message, which is the bug being fixed.
    expect(isMissingObject(sdkError({ status: 403, name: 'AccessDenied' }))).toBe(false)
  })

  it('does not treat an unreachable endpoint as absence', () => {
    // A refused connection has no HTTP status at all — the shape a real
    // `S3_ENDPOINT` typo produces.
    expect(isMissingObject(new Error('connect ECONNREFUSED 127.0.0.1:9000'))).toBe(false)
    expect(isMissingObject(sdkError({}))).toBe(false)
  })

  it('does not treat a server error as absence', () => {
    expect(isMissingObject(sdkError({ status: 500 }))).toBe(false)
    expect(isMissingObject(sdkError({ status: 503, name: 'SlowDown' }))).toBe(false)
  })

  it('does not treat a credentials error as absence', () => {
    expect(isMissingObject(sdkError({ status: 400, name: 'InvalidAccessKeyId' }))).toBe(false)
    expect(isMissingObject(sdkError({ status: 400, name: 'SignatureDoesNotMatch' }))).toBe(false)
  })

  it('survives whatever a transport throws', () => {
    for (const thrown of [undefined, null, 'a string', 42, [], { $metadata: null }, { $metadata: 'x' }]) {
      expect(() => isMissingObject(thrown)).not.toThrow()
      expect(isMissingObject(thrown)).toBe(false)
    }
  })
})
