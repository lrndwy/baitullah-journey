import type { NavigationItem } from '@app/contracts'

export interface Crumb {
  label: string
  href?: string
}

/** Turns a path segment into a readable label: `user-preferences` → `User preferences`. */
function humanize(segment: string): string {
  const words = segment.replace(/[-_]/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const FIXED_LABELS: Record<string, string> = {
  profile: 'Profil Anda',
  users: 'Pengguna',
  roles: 'Peran',
  audit: 'Audit',
  files: 'File',
  backups: 'Backup',
  settings: 'Pengaturan',
  categories: 'Kategori',
  packages: 'Paket',
  departures: 'Keberangkatan',
  facilities: 'Fasilitas',
  accommodations: 'Akomodasi',
  articles: 'Artikel',
  galleries: 'Galeri',
  testimonials: 'Testimoni',
  inquiries: 'Pemesanan',
}

/**
 * Breadcrumbs are derived from the path, not looked up in the navigation.
 *
 * Only the module-provided entries are in `/api/_meta/navigation`, so a lookup
 * alone reports "Not found" for every self-service or detail page. Reading the
 * path instead means a new page never has to be registered twice.
 */
export function breadcrumbs(
  pathname: string,
  navigation: NavigationItem[],
  detailLabels: Record<string, string> = {},
): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = []

  // `/admin/*` crumbs start at Overview; a page outside that prefix (the
  // self-service `/profile`) simply starts with itself.
  let accumulated = ''
  for (const [index, segment] of segments.entries()) {
    accumulated += `/${segment}`
    if (segment === 'admin') {
      crumbs.push({ label: 'Overview', href: '/admin' })
      continue
    }

    const isLast = index === segments.length - 1
    const fromNavigation = navigation.find((item) => item.path === accumulated)?.label
    const label =
      detailLabels[segment] ?? fromNavigation ?? FIXED_LABELS[segment] ?? humanize(segment)

    crumbs.push({ label, href: isLast ? undefined : accumulated })
  }

  return crumbs
}
