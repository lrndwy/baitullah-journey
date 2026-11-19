/**
 * The browser-facing API origin.
 *
 * `NEXT_PUBLIC_*` is inlined into the client bundle when the image is built,
 * which would freeze the API URL at build time — no good for an image that is
 * supposed to be configured with `docker run -e`. So the *server* reads the
 * runtime value and hands it to the browser through an inline script (see
 * `app/layout.tsx`), and `NEXT_PUBLIC_API_URL` survives only as the build-time
 * default for a container started with no configuration at all.
 *
 * Read this through `apiPublicUrl()` rather than capturing it in a module
 * constant: a constant is evaluated once, at whatever moment the module first
 * loads, which is exactly the build-time coupling this exists to remove.
 */
const BUILD_TIME_DEFAULT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

declare global {
  interface Window {
    __APP_CONFIG__?: { apiPublicUrl?: string }
  }
}

/**
 * Where the *server* reaches the API. Inside Docker that is the service name,
 * which the browser cannot resolve — so this is deliberately separate from the
 * browser-facing origin below.
 */
export function internalApiUrl(): string {
  return process.env.API_INTERNAL_URL ?? apiPublicUrl()
}

/** The origin the browser talks to: presigned URLs, OAuth start, client fetches. */
export function apiPublicUrl(): string {
  // In a client bundle `process.env.API_PUBLIC_URL` is inlined as undefined —
  // non-`NEXT_PUBLIC_` variables never reach the browser — so the injected
  // global has to be checked first.
  if (typeof window !== 'undefined') {
    return window.__APP_CONFIG__?.apiPublicUrl ?? BUILD_TIME_DEFAULT
  }

  return process.env.API_PUBLIC_URL ?? BUILD_TIME_DEFAULT
}
