#!/usr/bin/env node
/**
 * Object-storage diagnostic. Run it inside the API container:
 *
 *   node apps/api/scripts/diagnose-storage.mjs
 *
 * It exists because one failure is ambiguous in the logs: the API verifies an
 * upload with a *signed header* request, while the browser uploaded with a
 * *presigned URL* whose signature travels in the query string. Some reverse
 * proxies and WAFs strip or rewrite the `Authorization` header and leave the
 * query string alone — so the upload succeeds and the verification is refused.
 *
 * This runs both kinds of request against the same bucket and prints what each
 * one gets, which is what separates "the credentials are wrong" from "the proxy
 * eats the Authorization header".
 *
 * Read-only: it lists and HEADs, and only PUTs when you pass --write.
 */
import { lookup } from 'node:dns/promises'
import { HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const write = process.argv.includes('--write')

const {
  S3_ENDPOINT,
  S3_PUBLIC_ENDPOINT,
  S3_REGION = 'us-east-1',
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_BUCKET = 'app',
  S3_FORCE_PATH_STYLE = 'true',
} = process.env

const pathStyle = S3_FORCE_PATH_STYLE === 'true' || S3_FORCE_PATH_STYLE === '1'

console.log('── configuration as the API sees it')
console.log('  S3_ENDPOINT        :', S3_ENDPOINT ?? '(unset)')
console.log('  S3_PUBLIC_ENDPOINT :', S3_PUBLIC_ENDPOINT ?? '(unset — signing against S3_ENDPOINT)')
console.log('  S3_BUCKET          :', S3_BUCKET)
console.log('  S3_REGION          :', S3_REGION)
console.log('  S3_FORCE_PATH_STYLE:', pathStyle)
console.log('  access key id      :', S3_ACCESS_KEY_ID ? `${S3_ACCESS_KEY_ID.slice(0, 4)}… (${S3_ACCESS_KEY_ID.length} chars)` : '(unset)')
console.log('  secret access key  :', S3_SECRET_ACCESS_KEY ? `set (${S3_SECRET_ACCESS_KEY.length} chars)` : '(unset)')

if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error('\nObject storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.')
  process.exit(1)
}

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  forcePathStyle: pathStyle,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
})

const signer = S3_PUBLIC_ENDPOINT
  ? new S3Client({
      endpoint: S3_PUBLIC_ENDPOINT,
      region: S3_REGION,
      forcePathStyle: pathStyle,
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
    })
  : client

/** Everything the SDK exposes about a failure, including who answered it. */
function describe(error) {
  const headers = error?.$response?.headers ?? {}
  return {
    name: error?.name,
    message: error?.message,
    status: error?.$metadata?.httpStatusCode,
    requestId: error?.$metadata?.requestId,
    // `text/html` means a proxy answered, not the object store.
    contentType: headers['content-type'],
    server: headers.server,
  }
}

console.log('\n── 1. can this container resolve the endpoint?')
for (const [label, url] of [['S3_ENDPOINT', S3_ENDPOINT], ['S3_PUBLIC_ENDPOINT', S3_PUBLIC_ENDPOINT]]) {
  if (!url) continue
  const { hostname, protocol } = new URL(url)
  try {
    const { address } = await lookup(hostname)
    console.log(`  ${label.padEnd(18)} ${hostname} -> ${address} (${protocol})`)
  } catch (error) {
    console.log(`  ${label.padEnd(18)} ${hostname} -> ${error.code}`)
  }
}

console.log('\n── 2. who answers at the endpoint? (no credentials sent)')
try {
  const response = await fetch(S3_ENDPOINT, { method: 'GET', redirect: 'manual' })
  const body = await response.text()
  console.log('  status      :', response.status)
  console.log('  content-type:', response.headers.get('content-type'))
  console.log('  server      :', response.headers.get('server'))
  console.log('  body        :', JSON.stringify(body.slice(0, 200)))
} catch (error) {
  console.log('  unreachable :', error.cause?.code ?? error.message)
}

console.log('\n── 3. signed HEAD with the API credentials (what verification does)')
try {
  const result = await client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: 'diagnose-probe-does-not-exist' }))
  console.log('  unexpected success:', result.ContentLength)
} catch (error) {
  const info = describe(error)
  console.log(' ', JSON.stringify(info))
  if (info.status === 404 || info.name === 'NotFound') {
    console.log('  => credentials accepted; the key simply does not exist (this is the healthy answer)')
  } else if (info.status === 403) {
    console.log('  => the object store REFUSED these credentials. Check that S3_ACCESS_KEY_ID /')
    console.log('     S3_SECRET_ACCESS_KEY match the store, and that the store is the same one')
    console.log('     S3_PUBLIC_ENDPOINT points at.')
  }
}

console.log('\n── 4. signed LIST with the API credentials (proves auth without a key)')
try {
  const result = await client.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, MaxKeys: 3 }))
  console.log('  ok — bucket readable,', result.KeyCount ?? 0, 'key(s) sampled')
  for (const item of result.Contents ?? []) console.log('   ', item.Key)
} catch (error) {
  const info = describe(error)
  console.log(' ', JSON.stringify(info))
  console.log('  => a signed GET/LIST was refused. If the HEAD above was also 403, the')
  console.log('     credentials or the endpoint are wrong; if only this fails, the policy')
  console.log('     allows HeadObject but not ListBucket.')
}

console.log('\n── 5. presigned PUT (what the browser uses — signature in the query string)')
const key = `diagnostics/${Date.now()}-probe.txt`
try {
  const url = await getSignedUrl(signer, new PutObjectCommand({ Bucket: S3_BUCKET, Key: key }), {
    expiresIn: 300,
  })
  const { hostname } = new URL(url)
  console.log('  signed for  :', hostname)

  if (!write) {
    console.log('  (pass --write to actually send it)')
  } else {
    const response = await fetch(url, { method: 'PUT', body: 'probe' })
    const body = await response.text()
    console.log('  PUT status  :', response.status)
    console.log('  PUT server  :', response.headers.get('server'))
    if (body) console.log('  PUT body    :', JSON.stringify(body.slice(0, 300)))
    if (response.ok) {
      console.log('  => the presigned path WORKS. If step 3 was 403, the difference is the')
      console.log('     Authorization header: something between this container and the store')
      console.log('     is stripping or rewriting it, while leaving the query string alone.')
    } else {
      console.log('  => the presigned path is ALSO refused, so this is not a header-stripping')
      console.log('     proxy: the credentials or the endpoint are wrong for both paths.')
    }
  }
} catch (error) {
  console.log('  could not even sign:', error.message)
}

console.log('\nDone.')
