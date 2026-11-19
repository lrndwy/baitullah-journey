'use client'

import { useState } from 'react'
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type {
  CreateTestimonialInput,
  Testimonial,
  UpdateTestimonialInput,
} from '@app/contracts'
import { ContentImageField } from '@/components/admin/content-image-field'
import { DataPagination } from '@/components/admin/data-pagination'
import { IconAction, Tip } from '@/components/admin/icon-action'
import { PageHeader } from '@/components/admin/page-header'
import { uploadImage } from '@/lib/image-upload'
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

export default function TestimonialsPage() {
  const { can } = useSession()
  const canWrite = can('content.write')
  const [published, setPublished] = useState(ALL_PUBLISHED)
  const [editing, setEditing] = useState<Testimonial | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Testimonial | null>(null)

  const list = usePaginated<Testimonial>({
    path: '/api/content/testimonials',
    params: {
      published: published === ALL_PUBLISHED ? undefined : published,
    },
  })

  return (
    <>
      <PageHeader title="Testimoni" description="Ulasan jamaah untuk ditampilkan di situs.">
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
            <Tip content="Tambah testimoni">
              <Button onClick={() => setEditing('new')}>
                <PlusIcon data-icon="inline-start" />
                Tambah testimoni
              </Button>
            </Tip>
          )}
        </div>
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Isi</TableHead>
              <TableHead className="w-[80px]">Rating</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {list.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.customerName}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {item.content}
                </TableCell>
                <TableCell>{item.rating}/5</TableCell>
                <TableCell>
                  <Badge variant={item.isPublished ? 'secondary' : 'outline'}>
                    {item.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canWrite && (
                    <>
                      <IconAction
                        label="Edit testimoni"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(item)}
                      />
                      <IconAction
                        label="Hapus testimoni"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(item)}
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada testimoni.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="testimoni" />

      {editing !== null && (
        <TestimonialFormDialog
          testimonial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            list.reload()
          }}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus testimoni {deleting?.customerName}?</AlertDialogTitle>
            <AlertDialogDescription>Testimoni akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/content/testimonials/${deleting.id}`, { method: 'DELETE' })
                  toast.success('Testimoni dihapus')
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

function TestimonialFormDialog({
  testimonial,
  onClose,
  onSaved,
}: {
  testimonial: Testimonial | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [customerName, setCustomerName] = useState(testimonial?.customerName ?? '')
  const [content, setContent] = useState(testimonial?.content ?? '')
  const [rating, setRating] = useState(String(testimonial?.rating ?? 5))
  const [photoUrl, setPhotoUrl] = useState(testimonial?.photoUrl ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [clearPhoto, setClearPhoto] = useState(false)
  const [isPublished, setIsPublished] = useState(testimonial?.isPublished ?? false)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const payload: CreateTestimonialInput | UpdateTestimonialInput = {
                customerName: customerName.trim(),
                content: content.trim(),
                rating: Number.parseInt(rating, 10),
                isPublished,
              }
              const saved = testimonial
                ? (
                    await apiFetch<{ testimonial: Testimonial }>(
                      `/api/content/testimonials/${testimonial.id}`,
                      { method: 'PATCH', body: JSON.stringify(payload) },
                    )
                  ).testimonial
                : (
                    await apiFetch<{ testimonial: Testimonial }>('/api/content/testimonials', {
                      method: 'POST',
                      body: JSON.stringify(payload),
                    })
                  ).testimonial

              if (clearPhoto && !photoFile) {
                await apiFetch(`/api/content/testimonials/${saved.id}/photo`, {
                  method: 'DELETE',
                })
              }
              if (photoFile) {
                await uploadImage({
                  signPath: `/api/content/testimonials/${saved.id}/photo/upload-url`,
                  completePath: `/api/content/testimonials/${saved.id}/photo/complete`,
                  file: photoFile,
                })
              }

              toast.success(testimonial ? 'Testimoni diperbarui' : 'Testimoni dibuat')
              onSaved()
            } catch (cause) {
              toast.error(cause instanceof ApiError ? cause.message : 'Gagal menyimpan')
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{testimonial ? 'Edit testimoni' : 'Tambah testimoni'}</DialogTitle>
            <DialogDescription>Rating 1–5 bintang.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tm-name">Nama pelanggan</Label>
              <Input
                id="tm-name"
                required
                maxLength={120}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tm-content">Isi testimoni</Label>
              <Textarea
                id="tm-content"
                required
                rows={4}
                maxLength={5000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rating</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ContentImageField
              id="tm-photo"
              label="Foto"
              previewUrl={clearPhoto ? null : photoUrl}
              file={photoFile}
              disabled={busy}
              onFileChange={(next) => {
                setPhotoFile(next)
                if (next) setClearPhoto(false)
              }}
              onClearPreview={() => {
                setPhotoUrl(null)
                setClearPhoto(true)
              }}
            />
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
