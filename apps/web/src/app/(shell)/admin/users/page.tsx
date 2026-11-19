'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  EyeIcon,
  KeyRoundIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  UserRoundPlusIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  BulkDeleteResponse,
  CreateUserInput,
  Role,
  RoleListResponse,
  UpdateUserInput,
  User,
  UserListResponse,
  UserStatus,
} from '@app/contracts'
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
import { apiFetch, ApiError } from '@/lib/api'
import { usePaginated } from '@/lib/pagination'
import { useSession } from '@/lib/session'

const STATUS_VARIANT: Record<UserStatus, 'secondary' | 'destructive'> = {
  active: 'secondary',
  suspended: 'destructive',
}

const ALL_STATUSES = 'all'
const DELETED_ACTIVE = 'exclude'
const DELETED_ONLY = 'only'
const DELETED_ALL = 'include'

export default function UsersPage() {
  const { can } = useSession()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL_STATUSES)
  const [deletedFilter, setDeletedFilter] = useState(DELETED_ACTIVE)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | 'bulk' | null>(null)
  const [purging, setPurging] = useState<User | null>(null)
  const [roles, setRoles] = useState<Role[]>([])

  const users = usePaginated<User>({
    path: '/api/users',
    params: {
      search: search || undefined,
      status: status === ALL_STATUSES ? undefined : status,
      deleted: deletedFilter,
    },
  })

  useEffect(() => {
    // Role names are only needed for the edit form; a caller without
    // `rbac.role.read` simply gets an editor without role assignment.
    void apiFetch<RoleListResponse>('/api/rbac/roles?limit=100')
      .then((page) => setRoles(page.items))
      .catch(() => setRoles([]))
  }, [])

  // A selection from a previous page must not survive into the next one.
  useEffect(() => {
    setSelected([])
  }, [users.pageIndex, users.limit, search, status, deletedFilter])

  const allSelected = users.items.length > 0 && selected.length === users.items.length

  async function bulkDelete() {
    try {
      const result = await apiFetch<BulkDeleteResponse>('/api/users/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selected }),
      })
      toast.success(`Deleted ${result.deleted} user(s)`)
      setDeleting(null)
      // The rows are gone; a selection pointing at them would show a stale count.
      setSelected([])
      users.reload()
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Bulk delete failed')
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Kelola akun admin. Soft delete bisa dilihat lagi; hapus permanen menghilangkan data akun."
      >
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
            }}
          >
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-52 pl-8"
                placeholder="Cari email atau nama"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>Semua status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deletedFilter} onValueChange={setDeletedFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DELETED_ACTIVE}>Akun aktif</SelectItem>
                <SelectItem value={DELETED_ONLY}>Terhapus (soft)</SelectItem>
                <SelectItem value={DELETED_ALL}>Semua akun</SelectItem>
              </SelectContent>
            </Select>
          </form>

          {can('users.create') && (
            <CreateUserDialog roles={roles} onCreated={() => users.reload()} />
          )}
        </div>
      </PageHeader>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Clear
          </Button>
          {can('users.delete') && (
            <Button variant="destructive" size="sm" onClick={() => setDeleting('bulk')}>
              <Trash2Icon />
              Delete selected
            </Button>
          )}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {can('users.delete') && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      setSelected(checked === true ? users.items.map((user) => user.id) : [])
                    }
                  />
                </TableHead>
              )}
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[180px]">Roles</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.loading && users.items.length === 0 &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {users.items.map((user) => (
              <TableRow key={user.id} data-state={selected.includes(user.id) ? 'selected' : undefined}>
                {can('users.delete') && (
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${user.email}`}
                      checked={selected.includes(user.id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked === true
                            ? [...current, user.id]
                            : current.filter((id) => id !== user.id),
                        )
                      }
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <Link href={`/admin/users/${user.id}`} className="hover:underline">
                    {user.email}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.name ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={STATUS_VARIANT[user.status]}>{user.status}</Badge>
                    {user.deletedAt && <Badge variant="destructive">terhapus</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  {user.roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <IconAction
                    label="Lihat detail"
                    icon={<EyeIcon />}
                    href={`/admin/users/${user.id}`}
                  />
                  {!user.deletedAt && can('users.update') && (
                    <IconAction
                      label="Edit user"
                      icon={<PencilIcon />}
                      onClick={() => setEditing(user)}
                    />
                  )}
                  {!user.deletedAt && can('auth.password.reset_request') && (
                    <IconAction
                      label="Kirim reset password"
                      icon={<KeyRoundIcon />}
                      onClick={async () => {
                        try {
                          const result = await apiFetch<{ message: string; devCode?: string }>(
                            `/api/auth/password/reset-for/${user.id}`,
                            { method: 'POST' },
                          )
                          toast.success(
                            result.devCode
                              ? `Kode reset ${user.email}: ${result.devCode}`
                              : `Email reset dikirim ke ${user.email}`,
                          )
                        } catch (cause) {
                          toast.error(
                            cause instanceof ApiError ? cause.message : 'Gagal mengirim reset',
                          )
                        }
                      }}
                    />
                  )}
                  {user.deletedAt && can('users.update') && (
                    <IconAction
                      label="Pulihkan akun"
                      icon={<RotateCcwIcon />}
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/users/${user.id}/restore`, { method: 'POST' })
                          toast.success(`${user.email} dipulihkan`)
                          users.reload()
                        } catch (cause) {
                          toast.error(cause instanceof ApiError ? cause.message : 'Gagal memulihkan')
                        }
                      }}
                    />
                  )}
                  {!user.deletedAt && can('users.delete') && (
                    <IconAction
                      label="Hapus (soft delete)"
                      icon={<Trash2Icon />}
                      destructive
                      onClick={() => setDeleting(user)}
                    />
                  )}
                  {user.deletedAt && can('users.delete') && (
                    <IconAction
                      label="Hapus permanen"
                      icon={<Trash2Icon />}
                      destructive
                      onClick={() => setPurging(user)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!users.loading && users.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {users.error && <p className="text-sm text-destructive">{users.error}</p>}

      <DataPagination state={users} noun="users" />

      {editing && (
        <EditUserDialog
          user={editing}
          roles={roles}
          canAssignRoles={can('rbac.assignment.write')}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            users.reload()
          }}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleting === 'bulk'
                ? `Soft delete ${selected.length} akun?`
                : `Soft delete ${deleting?.email}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Akun akan ditangguhkan dan disembunyikan dari daftar aktif, tetapi masih bisa
              dilihat lewat filter “Terhapus (soft)” dan bisa dipulihkan atau dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting === 'bulk') return bulkDelete()
                if (!deleting) return
                try {
                  await apiFetch(`/api/users/${deleting.id}`, { method: 'DELETE' })
                  toast.success(`${deleting.email} di-soft-delete`)
                  setDeleting(null)
                  setSelected((current) => current.filter((id) => id !== deleting.id))
                  users.reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal menghapus')
                }
              }}
            >
              Soft delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={purging !== null} onOpenChange={(open) => !open && setPurging(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus permanen {purging?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak bisa dibatalkan. Data akun dihapus dari database; email bisa
              dipakai lagi untuk akun baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!purging) return
                try {
                  await apiFetch(`/api/users/${purging.id}/permanent`, { method: 'DELETE' })
                  toast.success(`${purging.email} dihapus permanen`)
                  setPurging(null)
                  users.reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal menghapus permanen')
                }
              }}
            >
              Hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RolePicker({
  roles,
  selected,
  onChange,
  disabled,
}: {
  roles: Role[]
  selected: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  if (roles.length === 0) {
    return <p className="text-xs text-muted-foreground">No roles available to assign.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {roles.map((role) => (
        <label
          key={role.id}
          className="flex items-start gap-2 rounded-md border p-2 text-sm has-disabled:opacity-60"
        >
          <Checkbox
            className="mt-0.5"
            disabled={disabled}
            checked={selected.includes(role.key)}
            onCheckedChange={(checked) =>
              onChange(
                checked === true
                  ? [...selected, role.key]
                  : selected.filter((key) => key !== role.key),
              )
            }
          />
          <span className="flex flex-col">
            <span className="font-medium">
              {role.name}
              <code className="ml-2 text-xs text-muted-foreground">{role.key}</code>
            </span>
            <span className="text-xs text-muted-foreground">
              {role.permissions.length} permissions
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}

function CreateUserDialog({ roles, onCreated }: { roles: Role[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<CreateUserInput>({
    email: '',
    name: undefined,
    password: undefined,
    roleKeys: ['member'],
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tip content="Create an account with an optional password and roles">
        <Button onClick={() => setOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Add user
        </Button>
      </Tip>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) })
              toast.success(`Created ${form.email}`)
              setOpen(false)
              setForm({ email: '', roleKeys: ['member'] })
              onCreated()
            } catch (cause) {
              toast.error(cause instanceof ApiError ? cause.message : 'Failed to create user')
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Setting a password lets them sign in with email immediately; leaving it blank means
              they sign in with Google or a reset code.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                required
                placeholder="person@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                placeholder="Optional"
                value={form.name ?? ''}
                onChange={(event) => setForm({ ...form, name: event.target.value || undefined })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                placeholder="Optional, at least 12 characters"
                value={form.password ?? ''}
                onChange={(event) => setForm({ ...form, password: event.target.value || undefined })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Roles</Label>
              <RolePicker
                roles={roles}
                selected={form.roleKeys}
                onChange={(roleKeys) => setForm({ ...form, roleKeys })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2Icon className="animate-spin" /> : <UserRoundPlusIcon />}
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  user,
  roles,
  canAssignRoles,
  onClose,
  onSaved,
}: {
  user: User
  roles: Role[]
  canAssignRoles: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(user.name ?? '')
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [roleKeys, setRoleKeys] = useState<string[]>(user.roles)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const payload: UpdateUserInput = {
                name: name.trim() === '' ? null : name.trim(),
                status,
                ...(canAssignRoles ? { roleKeys } : {}),
              }
              await apiFetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
              })
              toast.success(`Updated ${user.email}`)
              onSaved()
            } catch (cause) {
              toast.error(cause instanceof ApiError ? cause.message : 'Update failed')
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit {user.email}</DialogTitle>
            <DialogDescription>
              Role changes take effect on the user&apos;s next request.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as UserStatus)}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Suspending blocks sign-in immediately; existing sessions keep working until they
                expire or are revoked.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Roles</Label>
              <RolePicker
                roles={roles}
                selected={roleKeys}
                onChange={setRoleKeys}
                disabled={!canAssignRoles}
              />
              {!canAssignRoles && (
                <p className="text-xs text-muted-foreground">
                  You need <code>rbac.assignment.write</code> to change role assignments.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}