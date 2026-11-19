import type { DepartureStatus, PackageStatus } from '@app/contracts'

/** Public catalogue surfaces only packages marked published. */
export function isPublicPackage(status: PackageStatus | string): boolean {
  return status === 'published'
}

/** Public detail shows departures that still accept or have filled bookings. */
export function isPublicDeparture(status: DepartureStatus | string): boolean {
  return status === 'open' || status === 'full'
}

export function filterPublicPackages<T extends { status: string }>(items: T[]): T[] {
  return items.filter((item) => isPublicPackage(item.status))
}

export function filterPublicDepartures<T extends { status: string }>(items: T[]): T[] {
  return items.filter((item) => isPublicDeparture(item.status))
}

export function effectivePrice(basePrice: number, priceOverride: number | null | undefined): number {
  return priceOverride ?? basePrice
}
