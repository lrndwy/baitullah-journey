'use client'

import type { Package, PreferredContact } from '@app/contracts'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { brandBtn, brandField } from '@/components/landing/brand'
import { formatDateId, formatRupiah } from '@/lib/landing-content'
import {
  fetchPublicPackageBySlugClient,
  submitInquiry,
  type PublicDeparture,
  type PublicPackageDetail,
} from '@/lib/public-api'

const NONE = '__none__'

type Props = {
  packages: Package[]
  initialPackageId?: string
  initialDepartureId?: string
}

export function InquiryForm({ packages, initialPackageId, initialDepartureId }: Props) {
  const [packageId, setPackageId] = useState(initialPackageId || NONE)
  const [departureId, setDepartureId] = useState(initialDepartureId || NONE)
  const [detail, setDetail] = useState<PublicPackageDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [paxCount, setPaxCount] = useState(1)
  const [preferredContact, setPreferredContact] = useState<PreferredContact>('whatsapp')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const selectedPackage = useMemo(
    () => (packageId === NONE ? null : (packages.find((pkg) => pkg.id === packageId) ?? null)),
    [packages, packageId],
  )

  const openDepartures: PublicDeparture[] = useMemo(
    () => (detail?.departures ?? []).filter((item) => item.status === 'open'),
    [detail],
  )

  useEffect(() => {
    if (!selectedPackage) {
      setDetail(null)
      return
    }

    let cancelled = false
    setLoadingDetail(true)
    fetchPublicPackageBySlugClient(selectedPackage.slug)
      .then((pkg) => {
        if (cancelled) return
        setDetail(pkg)
        if (pkg) {
          const stillValid = pkg.departures.some(
            (item) => item.id === departureId && item.status === 'open',
          )
          if (!stillValid) {
            const firstOpen = pkg.departures.find((item) => item.status === 'open')
            setDepartureId(firstOpen?.id ?? NONE)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackage?.slug])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (packageId === NONE || departureId === NONE) {
      setError('Pilih paket dan jadwal keberangkatan.')
      return
    }

    startTransition(async () => {
      const result = await submitInquiry({
        packageId,
        departureId,
        customerName,
        email,
        phone,
        paxCount,
        notes: notes.trim() ? notes.trim() : null,
        preferredContact,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <Card className="rounded-2xl border-[var(--brand-gold-soft)]/70 bg-white shadow-none">
        <CardContent className="p-6 sm:p-8">
          <h2 className="font-display text-2xl text-[var(--brand-emerald)]">Terima kasih</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--brand-text)]">
            Permintaan pemesanan Anda sudah kami terima. Tim konsultan akan menghubungi melalui{' '}
            {preferredContact === 'whatsapp' ? 'WhatsApp' : 'email'} dalam waktu dekat.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className={brandBtn.primary}>
              <a href="/katalog">Kembali ke katalog</a>
            </Button>
            <Button asChild variant="outline" className={brandBtn.outline}>
              <a href="/">Beranda</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-[var(--brand-gold-soft)]/70 bg-white shadow-none">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 text-sm sm:col-span-2">
              <Label htmlFor="inq-name" className="font-medium text-[var(--brand-text)]">
                Nama lengkap
              </Label>
              <Input
                id="inq-name"
                required
                maxLength={120}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className={brandField}
              />
            </div>

            <div className="space-y-1.5 text-sm">
              <Label htmlFor="inq-email" className="font-medium text-[var(--brand-text)]">
                Email
              </Label>
              <Input
                id="inq-email"
                required
                type="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={brandField}
              />
            </div>

            <div className="space-y-1.5 text-sm">
              <Label htmlFor="inq-phone" className="font-medium text-[var(--brand-text)]">
                Telepon / WhatsApp
              </Label>
              <Input
                id="inq-phone"
                required
                minLength={6}
                maxLength={32}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={brandField}
              />
            </div>

            <div className="space-y-1.5 text-sm">
              <Label htmlFor="inq-pax" className="font-medium text-[var(--brand-text)]">
                Jumlah jamaah
              </Label>
              <Input
                id="inq-pax"
                required
                type="number"
                min={1}
                max={50}
                value={paxCount}
                onChange={(event) => setPaxCount(Number(event.target.value) || 1)}
                className={brandField}
              />
            </div>

            <div className="space-y-1.5 text-sm">
              <Label className="font-medium text-[var(--brand-text)]">Kontak yang diinginkan</Label>
              <Select
                value={preferredContact}
                onValueChange={(value) => setPreferredContact(value as PreferredContact)}
              >
                <SelectTrigger className={`w-full ${brandField}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 text-sm sm:col-span-2">
              <Label className="font-medium text-[var(--brand-text)]">Paket</Label>
              <Select
                value={packageId}
                onValueChange={(value) => {
                  setPackageId(value)
                  setDepartureId(NONE)
                }}
              >
                <SelectTrigger className={`w-full ${brandField}`}>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Pilih paket</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} — {formatRupiah(pkg.basePrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 text-sm sm:col-span-2">
              <Label className="font-medium text-[var(--brand-text)]">Jadwal keberangkatan</Label>
              <Select
                value={departureId}
                onValueChange={setDepartureId}
                disabled={packageId === NONE || loadingDetail}
              >
                <SelectTrigger className={`w-full ${brandField}`}>
                  <SelectValue placeholder={loadingDetail ? 'Memuat jadwal…' : 'Pilih jadwal'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    {loadingDetail ? 'Memuat jadwal…' : 'Pilih jadwal'}
                  </SelectItem>
                  {openDepartures.map((departure) => (
                    <SelectItem key={departure.id} value={departure.id}>
                      {formatDateId(departure.departureDate)} — {formatDateId(departure.returnDate)}
                      {departure.airline ? ` · ${departure.airline}` : ''} ·{' '}
                      {formatRupiah(departure.effectivePrice)} · sisa {departure.availableQuota}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {packageId !== NONE && !loadingDetail && openDepartures.length === 0 ? (
                <span className="mt-1 block text-xs text-[var(--brand-red)]">
                  Tidak ada jadwal terbuka untuk paket ini.
                </span>
              ) : null}
            </div>

            <div className="space-y-1.5 text-sm sm:col-span-2">
              <Label htmlFor="inq-notes" className="font-medium text-[var(--brand-text)]">
                Catatan (opsional)
              </Label>
              <Textarea
                id="inq-notes"
                rows={4}
                maxLength={5000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={brandField}
                placeholder="Contoh: ada lansia, preferensi kamar, pertanyaan skema pembayaran…"
              />
            </div>
          </div>

          {error ? (
            <p
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--brand-red)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={pending || packages.length === 0}
            className={`${brandBtn.primaryLg} mt-6 w-full sm:w-auto`}
          >
            {pending ? 'Mengirim…' : 'Kirim permintaan pemesanan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
