import type {
  Article,
  ArticleListResponse,
  Category,
  CreateInquiryInput,
  Departure,
  Gallery,
  GalleryListResponse,
  Inquiry,
  Itinerary,
  Package,
  PackageAccommodationLink,
  PackageDetail,
  PackageFacilityLink,
  PackageListResponse,
  SiteSettings,
  Testimonial,
  TestimonialListResponse,
} from '@app/contracts'
import { cache } from 'react'
import { apiPublicUrl, internalApiUrl } from './runtime-config'

export type PublicDeparture = Departure & { itineraries: Itinerary[] }

export type PublicPackageDetail = Omit<PackageDetail, 'departures'> & {
  departures: PublicDeparture[]
  facilities: PackageFacilityLink[]
  accommodations: PackageAccommodationLink[]
}

type FetchOpts = {
  /** Prefer the Docker-internal origin on the server. */
  server?: boolean
  searchParams?: Record<string, string | number | boolean | undefined | null>
  init?: RequestInit
}

function origin(server: boolean | undefined): string {
  return server === false ? apiPublicUrl() : internalApiUrl()
}

function buildUrl(path: string, opts?: FetchOpts): string {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${origin(opts?.server)}/`)
  if (opts?.searchParams) {
    for (const [key, value] of Object.entries(opts.searchParams)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function publicGet<T>(path: string, opts?: FetchOpts): Promise<T | null> {
  try {
    const response = await fetch(buildUrl(path, opts), {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      ...opts?.init,
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

/** Absolute URL for stored assets that may be relative to the API origin. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  const base = apiPublicUrl().replace(/\/$/, '')
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

export const loadSiteSettings = cache(async (): Promise<SiteSettings | null> => {
  const data = await publicGet<{ settings: SiteSettings }>('/api/settings', { server: true })
  return data?.settings ?? null
})

export async function fetchPublicCategories(): Promise<Category[]> {
  const data = await publicGet<{ items: Category[] }>('/api/public/categories', { server: true })
  return data?.items ?? []
}

export async function fetchPublicPackages(query?: {
  categorySlug?: string
  featured?: boolean
  q?: string
  limit?: number
  cursor?: string
}): Promise<PackageListResponse> {
  const data = await publicGet<PackageListResponse>('/api/public/packages', {
    server: true,
    searchParams: {
      categorySlug: query?.categorySlug,
      featured: query?.featured === undefined ? undefined : query.featured ? 'true' : 'false',
      q: query?.q,
      limit: query?.limit,
      cursor: query?.cursor,
    },
  })
  return data ?? { items: [], nextCursor: null, hasMore: false, total: 0 }
}

export async function fetchPublicPackageBySlug(slug: string): Promise<PublicPackageDetail | null> {
  const data = await publicGet<{ package: PublicPackageDetail }>(
    `/api/public/packages/${encodeURIComponent(slug)}`,
    { server: true },
  )
  return data?.package ?? null
}

export async function fetchPublicArticles(query?: {
  q?: string
  limit?: number
  cursor?: string
}): Promise<ArticleListResponse> {
  const data = await publicGet<ArticleListResponse>('/api/public/articles', {
    server: true,
    searchParams: { q: query?.q, limit: query?.limit, cursor: query?.cursor },
  })
  return data ?? { items: [], nextCursor: null, hasMore: false, total: 0 }
}

export async function fetchPublicArticleBySlug(slug: string): Promise<Article | null> {
  const data = await publicGet<{ article: Article }>(
    `/api/public/articles/${encodeURIComponent(slug)}`,
    { server: true },
  )
  return data?.article ?? null
}

export async function fetchPublicGalleries(query?: {
  limit?: number
  cursor?: string
}): Promise<GalleryListResponse> {
  const data = await publicGet<GalleryListResponse>('/api/public/galleries', {
    server: true,
    searchParams: { limit: query?.limit, cursor: query?.cursor },
  })
  return data ?? { items: [], nextCursor: null, hasMore: false, total: 0 }
}

export async function fetchPublicGalleryBySlug(slug: string): Promise<Gallery | null> {
  const data = await publicGet<{ gallery: Gallery }>(
    `/api/public/galleries/${encodeURIComponent(slug)}`,
    { server: true },
  )
  return data?.gallery ?? null
}

export async function fetchPublicTestimonials(query?: {
  limit?: number
}): Promise<Testimonial[]> {
  const data = await publicGet<TestimonialListResponse>('/api/public/testimonials', {
    server: true,
    searchParams: { limit: query?.limit ?? 6 },
  })
  return data?.items ?? []
}

/** Upcoming open departures for the home strip — derived from featured package details. */
export async function fetchUpcomingDepartures(limit = 6): Promise<
  Array<{
    package: Package
    departure: PublicDeparture
  }>
> {
  const featured = await fetchPublicPackages({ featured: true, limit: 4 })
  const pool = featured.items.length > 0 ? featured.items : (await fetchPublicPackages({ limit: 4 })).items
  const details = await Promise.all(pool.map((pkg) => fetchPublicPackageBySlug(pkg.slug)))

  const rows: Array<{ package: Package; departure: PublicDeparture }> = []
  for (const detail of details) {
    if (!detail) continue
    for (const departure of detail.departures) {
      if (departure.status !== 'open') continue
      rows.push({ package: detail, departure })
    }
  }

  rows.sort((a, b) => a.departure.departureDate.localeCompare(b.departure.departureDate))
  return rows.slice(0, limit)
}

export async function submitInquiry(input: CreateInquiryInput): Promise<
  { ok: true; inquiry: Inquiry } | { ok: false; message: string }
> {
  try {
    const response = await fetch(`${apiPublicUrl()}/api/public/inquiries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      return { ok: false, message: body?.error?.message ?? 'Gagal mengirim pemesanan. Coba lagi.' }
    }
    const data = (await response.json()) as { inquiry: Inquiry }
    return { ok: true, inquiry: data.inquiry }
  } catch {
    return { ok: false, message: 'Tidak dapat terhubung ke server. Coba lagi sebentar.' }
  }
}

/** Client-side package detail fetch (for departure selects on the form). */
export async function fetchPublicPackageBySlugClient(
  slug: string,
): Promise<PublicPackageDetail | null> {
  return publicGet<{ package: PublicPackageDetail }>(
    `/api/public/packages/${encodeURIComponent(slug)}`,
    { server: false },
  ).then((data) => data?.package ?? null)
}
