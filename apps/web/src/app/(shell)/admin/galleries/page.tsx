'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagesIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { CreateGalleryInput, Gallery, GalleryImage, UpdateGalleryInput } from '@app/contracts'
import { uploadImage } from '@/lib/image-upload'
import { mediaUrl } from '@/lib/public-api'
import { DataPagination } from '@/components/admin/data-pagination'
import { IconAction, Tip } from '@/components/admin/icon-action'
import { PageHeader } from '@/components/admin/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, ApiError } from '@/lib/api'
import { usePaginated } from '@/lib/pagination'
import { useSession } from '@/lib/session'

const ALL_PUBLISHED = 'all'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function GalleriesPage() {
  const { can } = useSession()
  const canWrite = can('content.write')
  const [published, setPublished] = useState(ALL_PUBLISHED)
  const [editing, setEditing] = useState<Gallery | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Gallery | null>(null)
  const [imagesFor, setImagesFor] = useState<Gallery | null>(null)

  const list = usePaginated<Gallery>({
    path: '/api/content/galleries',
    params: {
      published: published === ALL_PUBLISHED ? undefined : published,
    },
  })

  return (
    <>
      <PageHeader title="Galeri" description="Album foto kegiatan dan dokumentasi perjalanan.">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={published} onValueChange={setPublished}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PUBLISHED}>Semua</SelectItem>
              <SelectItem value="true">Dipublikasikan</SelectItem>
              <SelectItem value="false">Draft</SelectItem>
            </SelectContent>
          </Select>
          {canWrite && (
            <Tip content="Buat galeri baru">
              <Button onClick={() => setEditing('new')}>
                <PlusIcon data-icon="inline-start" />
                Tambah galeri
              </Button>
            </Tip>
          )}
        </div>
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Tanggal acara</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[140px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {list.items.map((gallery) => (
              <TableRow key={gallery.id}>
                <TableCell>
                  <div className="font-medium">{gallery.title}</div>
                  <code className="text-xs text-muted-foreground">{gallery.slug}</code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {gallery.eventDate ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={gallery.isPublished ? 'secondary' : 'outline'}>
                    {gallery.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <IconAction
                    label="Kelola gambar"
                    icon={<ImagesIcon />}
                    onClick={() => setImagesFor(gallery)}
                  />
                  {canWrite && (
                    <>
                      <IconAction
                        label="Edit galeri"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(gallery)}
                      />
                      <IconAction
                        label="Hapus galeri"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(gallery)}
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Belum ada galeri.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="galeri" />

      {editing !== null && (
        <GalleryFormDialog
          gallery={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            list.reload()
          }}
        />
      )}

      {imagesFor && (
        <GalleryImagesDialog
          gallery={imagesFor}
          canWrite={canWrite}
          onClose={() => setImagesFor(null)}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleting?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua gambar di dalam galeri juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/content/galleries/${deleting.id}`, { method: 'DELETE' })
                  toast.success('Galeri dihapus')
                  setDeleting(null)
                  list.reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal menghapus')
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function emptyToNull(value: string) {
  return value.trim() === '' ? null : value.trim()
}

function GalleryFormDialog({
  gallery,
  onClose,
  onSaved,
}: {
  gallery: Gallery | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(gallery?.title ?? '')
  const [slug, setSlug] = useState(gallery?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(gallery))
  const [description, setDescription] = useState(gallery?.description ?? '')
  const [eventDate, setEventDate] = useState(gallery?.eventDate ?? '')
  const [isPublished, setIsPublished] = useState(gallery?.isPublished ?? false)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const payload: CreateGalleryInput | UpdateGalleryInput = {
                title: title.trim(),
                slug: slug.trim(),
                description: emptyToNull(description),
                eventDate: emptyToNull(eventDate),
                isPublished,
              }
              if (gallery) {
                await apiFetch(`/api/content/galleries/${gallery.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                })
                toast.success('Galeri diperbarui')
              } else {
                await apiFetch('/api/content/galleries', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                })
                toast.success('Galeri dibuat')
              }
              onSaved()
            } catch (cause) {
              toast.error(cause instanceof ApiError ? cause.message : 'Gagal menyimpan')
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{gallery ? 'Edit galeri' : 'Tambah galeri'}</DialogTitle>
            <DialogDescription>Kelola gambar setelah galeri dibuat.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="gal-title">Judul</Label>
              <Input
                id="gal-title"
                required
                maxLength={200}
                value={title}
                onChange={(event) => {
                  const next = event.target.value
                  setTitle(next)
                  if (!slugTouched) setSlug(slugify(next))
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gal-slug">Slug</Label>
              <Input
                id="gal-slug"
                required
                maxLength={200}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setSlug(event.target.value)
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gal-date">Tanggal acara</Label>
              <Input
                id="gal-date"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gal-desc">Deskripsi</Label>
              <Textarea
                id="gal-desc"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isPublished}
                onCheckedChange={(checked) => setIsPublished(checked === true)}
              />
              Publikasikan
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GalleryImagesDialog({
  gallery,
  canWrite,
  onClose,
}: {
  gallery: Gallery
  canWrite: boolean
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [sortOrder, setSortOrder] = useState('0')

  async function reload() {
    setLoading(true)
    try {
      const result = await apiFetch<{ images: GalleryImage[] }>(
        `/api/content/galleries/${gallery.id}/images`,
      )
      setImages(result.images)
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Gagal memuat gambar')
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery.id])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gambar · {gallery.title}</DialogTitle>
          <DialogDescription>
            Unggah gambar langsung (PNG, JPEG, WebP, atau GIF, maks. 2 MB).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : images.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada gambar.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {images.map((image) => {
                const src = mediaUrl(image.imageUrl)
                return (
                  <div
                    key={image.id}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-md border bg-muted/30">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <ImagesIcon className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {image.caption ? (
                        <p className="truncate text-sm">{image.caption}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Tanpa caption</p>
                      )}
                      <p className="text-xs text-muted-foreground">Urutan: {image.sortOrder}</p>
                    </div>
                    {canWrite && (
                      <IconAction
                        label="Hapus gambar"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={async () => {
                          try {
                            await apiFetch(
                              `/api/content/galleries/${gallery.id}/images/${image.id}`,
                              { method: 'DELETE' },
                            )
                            toast.success('Gambar dihapus')
                            void reload()
                          } catch (cause) {
                            toast.error(
                              cause instanceof ApiError ? cause.message : 'Gagal menghapus',
                            )
                          }
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {canWrite && (
            <form
              className="flex flex-col gap-3 rounded-md border p-3"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!file) {
                  toast.error('Pilih file gambar terlebih dahulu')
                  return
                }
                setBusy(true)
                try {
                  await uploadImage({
                    signPath: `/api/content/galleries/${gallery.id}/images/upload-url`,
                    completePath: `/api/content/galleries/${gallery.id}/images/complete`,
                    file,
                    completeBody: {
                      caption: caption.trim() === '' ? null : caption.trim(),
                      sortOrder: Number.parseInt(sortOrder, 10) || 0,
                    },
                  })
                  toast.success('Gambar diunggah')
                  setFile(null)
                  setCaption('')
                  setSortOrder(String(images.length + 1))
                  if (fileRef.current) fileRef.current.value = ''
                  void reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal mengunggah gambar')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="img-file">File gambar</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    id="img-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    <UploadIcon />
                    {file ? 'Ganti file' : 'Pilih file'}
                  </Button>
                  <span className="truncate text-sm text-muted-foreground">
                    {file ? file.name : 'Belum ada file dipilih'}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="img-caption">Caption</Label>
                  <Input
                    id="img-caption"
                    maxLength={500}
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="img-sort">Urutan</Label>
                  <Input
                    id="img-sort"
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={busy || !file}>
                  {busy ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                  Unggah gambar
                </Button>
              </div>
            </form>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
