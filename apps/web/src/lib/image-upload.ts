'use client'

import type { AssetUploadSignature } from '@app/contracts'
import { apiFetch, ApiError } from './api'

/**
 * The three-step image upload every surface uses: ask for a signature, PUT the
 * bytes straight to the bucket, then confirm so the server can verify what
 * actually landed.
 *
 * Shared rather than repeated because the failure modes are subtle — the PUT
 * must carry the same content type that was signed, and skipping the confirm
 * step leaves an object the server has never validated.
 */
export async function uploadImage(options: {
  /** Endpoint that returns a presigned PUT, e.g. `/api/profile/me/avatar/upload-url`. */
  signPath: string
  /** Endpoint that confirms the upload, e.g. `/api/profile/me/avatar/complete`. */
  completePath: string
  file: File
  /** Extra body for the sign request, when the endpoint needs more than the file. */
  signBody?: Record<string, unknown>
  /** Extra fields merged into the complete body alongside `key`. */
  completeBody?: Record<string, unknown>
}): Promise<unknown> {
  const { signPath, completePath, file, signBody, completeBody } = options

  const signature = await apiFetch<AssetUploadSignature>(signPath, {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      ...signBody,
    }),
  })

  const put = await fetch(signature.uploadUrl, {
    method: 'PUT',
    // Must match what was signed, or the bucket rejects the request.
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  })

  if (!put.ok) {
    throw new ApiError(put.status, 'upload_failed', `Storage rejected the upload (${put.status})`)
  }

  return apiFetch(completePath, {
    method: 'POST',
    body: JSON.stringify({ key: signature.key, ...completeBody }),
  })
}