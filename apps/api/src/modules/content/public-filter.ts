import type { ArticleStatus } from '@app/contracts'

/** Public panduan only surfaces articles whose status is `published`. */
export function isPublicArticleStatus(status: ArticleStatus | string): boolean {
  return status === 'published'
}

export function filterPublishedArticles<T extends { status: string }>(items: T[]): T[] {
  return items.filter((item) => isPublicArticleStatus(item.status))
}

/** Galleries and testimonials use a boolean publish flag. */
export function filterPublishedFlag<T extends { isPublished: boolean }>(items: T[]): T[] {
  return items.filter((item) => item.isPublished)
}

/**
 * When an article is (or becomes) published and `publishedAt` is still null,
 * stamp it with now so the public site has a stable publication time.
 */
export function resolveArticlePublishedAt(input: {
  status: ArticleStatus
  /** Explicit request value; `undefined` means "leave existing / default". */
  publishedAt?: string | null
  existing: Date | null
}): Date | null {
  const explicit =
    input.publishedAt === undefined
      ? undefined
      : input.publishedAt === null
        ? null
        : new Date(input.publishedAt)

  if (input.status !== 'published') {
    return explicit === undefined ? input.existing : explicit
  }

  const candidate = explicit === undefined ? input.existing : explicit
  return candidate ?? new Date()
}
