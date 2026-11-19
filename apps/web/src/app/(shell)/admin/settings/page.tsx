'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon, Loader2Icon, SaveIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { AssetSlot, SiteSettings, UpdateSettingsInput } from '@app/contracts'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, ApiError } from '@/lib/api'
import { apiPublicUrl } from '@/lib/runtime-config'
import { uploadImage } from '@/lib/image-upload'
import { useSession } from '@/lib/session'

function emptyToNull(value: string) {
  return value.trim() === '' ? null : value.trim()
}

export default function SettingsPage() {
  const router = useRouter()
  const { can } = useSession()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [siteName, setSiteName] = useState('')
  const [tagline, setTagline] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [license, setLicense] = useState('')
  const [aboutHtml, setAboutHtml] = useState('')
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [savingContact, setSavingContact] = useState(false)

  const canWrite = can('settings.write')

  function apply(next: SiteSettings) {
    setSettings(next)
    setSiteName(next.siteName)
    setTagline(next.tagline ?? '')
    setWhatsapp(next.whatsapp ?? '')
    setPhone(next.phone ?? '')
    setEmail(next.email ?? '')
    setAddress(next.address ?? '')
    setLicense(next.license ?? '')
    setAboutHtml(next.aboutHtml ?? '')
    // The tab title, favicon and sidebar brand are rendered on the server, so a
    // refresh is what makes a change visible outside this page.
    router.refresh()
  }

  useEffect(() => {
    void apiFetch<{ settings: SiteSettings }>('/api/settings')
      .then((result) => apply(result.settings))
      .catch(() => toast.error('Could not load the settings'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Stable paths would be cached by the browser; the version defeats that. */
  const previewUrl = (slot: AssetSlot): string | null => {
    const path = slot === 'logo' ? settings?.logoUrl : settings?.faviconUrl
    if (!path) return null
    return `${apiPublicUrl()}${path}?v=${encodeURIComponent(settings?.updatedAt ?? '0')}`
  }

  async function savePatch(payload: UpdateSettingsInput, setSaving: (value: boolean) => void) {
    setSaving(true)
    try {
      const result = await apiFetch<{ settings: SiteSettings }>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      apply(result.settings)
      toast.success('Pengaturan disimpan')
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Branding and contact details for this installation. Public before sign-in."
      />

      {settings === null ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            <Card>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void savePatch(
                    {
                      siteName,
                      tagline: emptyToNull(tagline),
                      aboutHtml: emptyToNull(aboutHtml),
                    },
                    setSavingIdentity,
                  )
                }}
              >
                <CardHeader>
                  <CardTitle>Site identity</CardTitle>
                  <CardDescription>
                    Shown in the browser tab, the sidebar, and the public site.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pb-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="siteName">Site name</Label>
                    <Input
                      id="siteName"
                      required
                      maxLength={80}
                      disabled={!canWrite}
                      value={siteName}
                      onChange={(event) => setSiteName(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      maxLength={240}
                      disabled={!canWrite}
                      value={tagline}
                      onChange={(event) => setTagline(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="aboutHtml">Tentang kami (HTML)</Label>
                    <Textarea
                      id="aboutHtml"
                      rows={6}
                      disabled={!canWrite}
                      value={aboutHtml}
                      onChange={(event) => setAboutHtml(event.target.value)}
                    />
                  </div>
                </CardContent>
                {canWrite && (
                  <CardFooter className="border-t">
                    <Button type="submit" disabled={savingIdentity}>
                      {savingIdentity ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                      Simpan identitas
                    </Button>
                  </CardFooter>
                )}
              </form>
            </Card>

            <Card>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void savePatch(
                    {
                      whatsapp: emptyToNull(whatsapp),
                      phone: emptyToNull(phone),
                      email: emptyToNull(email),
                      address: emptyToNull(address),
                      license: emptyToNull(license),
                    },
                    setSavingContact,
                  )
                }}
              >
                <CardHeader>
                  <CardTitle>Kontak & legal</CardTitle>
                  <CardDescription>
                    Ditampilkan di footer / halaman kontak situs publik.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pb-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        maxLength={32}
                        disabled={!canWrite}
                        placeholder="62812…"
                        value={whatsapp}
                        onChange={(event) => setWhatsapp(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="phone">Telepon</Label>
                      <Input
                        id="phone"
                        maxLength={64}
                        disabled={!canWrite}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      maxLength={254}
                      disabled={!canWrite}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="address">Alamat</Label>
                    <Textarea
                      id="address"
                      rows={2}
                      maxLength={500}
                      disabled={!canWrite}
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="license">Izin / SK</Label>
                    <Textarea
                      id="license"
                      rows={2}
                      maxLength={500}
                      disabled={!canWrite}
                      value={license}
                      onChange={(event) => setLicense(event.target.value)}
                    />
                  </div>
                </CardContent>
                {canWrite && (
                  <CardFooter className="border-t">
                    <Button type="submit" disabled={savingContact}>
                      {savingContact ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                      Simpan kontak
                    </Button>
                  </CardFooter>
                )}
              </form>
            </Card>

            <AssetCard
              slot="logo"
              title="Logo"
              description="PNG, JPEG, WebP, GIF or ICO up to 2 MB. Shown at 32px in the sidebar, so a wide image will look small."
              previewUrl={previewUrl('logo')}
              previewClassName="h-12 w-auto max-w-[200px] object-contain"
              canWrite={canWrite}
              onChanged={apply}
            />

            <AssetCard
              slot="favicon"
              title="Favicon"
              description="Square images work best — 32×32 or 64×64. Also up to 2 MB."
              previewUrl={previewUrl('favicon')}
              previewClassName="size-8 object-contain"
              canWrite={canWrite}
              onChanged={apply}
            />
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How the branding appears around the app.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                {previewUrl('favicon') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl('favicon') as string} alt="" className="size-4" />
                ) : (
                  <div className="size-4 rounded-sm border" />
                )}
                <span className="truncate text-xs">{settings.siteName}</span>
              </div>

              <div className="flex items-center gap-2 rounded-lg border p-3">
                {previewUrl('logo') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl('logo') as string}
                    alt=""
                    className="h-8 w-auto max-w-[120px] object-contain"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <ImageIcon className="size-4" />
                  </div>
                )}
                <div className="flex flex-col leading-none">
                  <span className="truncate text-sm font-medium">{settings.siteName}</span>
                  <span className="text-xs text-muted-foreground">
                    {settings.tagline || 'Admin'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {settings.updatedAt
                  ? `Last changed ${new Date(settings.updatedAt).toLocaleString()}`
                  : 'Never changed — showing the built-in defaults.'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

function AssetCard({
  slot,
  title,
  description,
  previewUrl,
  previewClassName,
  canWrite,
  onChanged,
}: {
  slot: AssetSlot
  title: string
  description: string
  previewUrl: string | null
  previewClassName: string
  canWrite: boolean
  onChanged: (settings: SiteSettings) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    try {
      const result = await uploadImage({
        signPath: `/api/settings/assets/${slot}/upload-url`,
        completePath: `/api/settings/assets/${slot}/complete`,
        file,
      })
      onChanged((result as { settings: SiteSettings }).settings)
      toast.success(`${title} updated`)
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : `Could not upload the ${slot}`)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border bg-muted/30 p-2">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`Current ${slot}`} className={previewClassName} />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" />
          )}
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file)
              }}
            />
            <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
              {previewUrl ? 'Replace' : 'Upload'}
            </Button>

            {previewUrl && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const result = await apiFetch<{ settings: SiteSettings }>(
                      `/api/settings/assets/${slot}`,
                      { method: 'DELETE' },
                    )
                    onChanged(result.settings)
                    toast.success(`${title} removed`)
                  } catch (cause) {
                    toast.error(cause instanceof ApiError ? cause.message : 'Could not remove')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                <Trash2Icon />
                Remove
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
