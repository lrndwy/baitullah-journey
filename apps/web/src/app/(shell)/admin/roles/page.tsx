'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2Icon, PencilIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type {
  CreateRoleInput,
  PermissionsResponse,
  Role,
  RoleListResponse,
  UpdateRoleInput,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, ApiError } from '@/lib/api'
import { usePaginated } from '@/lib/pagination'
import { useSession } from '@/lib/session'

export default function RolesPage() {
  const { can } = useSession()
  const [permissions, setPermissions] = useState<PermissionsResponse['permissions']>([])
  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)

  const roleList = usePaginated<Role>({ path: '/api/rbac/roles', initialLimit: 10 })
  const roles = roleList.items
  const reload = roleList.reload

  useEffect(() => {
    void apiFetch<PermissionsResponse>('/api/_meta/permissions')
      .then((result) => setPermissions(result.permissions))
      .catch(() => setPermissions([]))
  }, [])

  const grouped = useMemo(() => {
    const byModule = new Map<string, PermissionsResponse['permissions']>()
    for (const permission of permissions) {
      const list = byModule.get(permission.module) ?? []
      list.push(permission)
      byModule.set(permission.module, list)
    }
    return [...byModule.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [permissions])

  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a named set of permissions. Modules contribute the permissions; the kernel enforces them."
      >
        {can('rbac.role.write') && (
          <Tip content="Name a role and pick the permissions it grants">
            <Button onClick={() => setEditing('new')}>
              <PlusIcon data-icon="inline-start" />
              New role
            </Button>
          </Tip>
        )}
      </PageHeader>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="matrix">Permission matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6 flex flex-col gap-4">
          {roleList.loading && roles.length === 0 &&
            Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}

          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{role.name}</CardTitle>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {role.key}
                  </code>
                  {role.isSystem && <Badge variant="secondary">system</Badge>}
                  <Badge variant="outline">
                    {role.memberCount} {role.memberCount === 1 ? 'member' : 'members'}
                  </Badge>

                  <div className="ml-auto flex gap-2">
                    {can('rbac.role.write') && (
                      <IconAction
                        label="Edit role"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(role)}
                      />
                    )}
                    {can('rbac.role.delete') && role.key !== 'admin' && (
                      <IconAction
                        label="Hapus role"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(role)}
                      />
                    )}
                  </div>
                </div>
                <CardDescription>{role.description ?? 'No description'}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-wrap gap-1.5">
                {role.permissions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No permissions — this role can only see what every signed-in user sees.
                  </span>
                ) : (
                  role.permissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="font-mono">
                      {permission}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
          ))}

          {!roleList.loading && roles.length === 0 && (
            <Card>
              <CardHeader className="items-center text-center">
                <ShieldCheckIcon className="mx-auto size-5 text-muted-foreground" />
                <CardTitle>No roles</CardTitle>
                <CardDescription>
                  Built-in roles are created on first boot from the installed modules.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <DataPagination state={roleList} noun="roles" />
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <PermissionMatrix roles={roles} permissions={permissions} />
        </TabsContent>
      </Tabs>

      {editing && (
        <RoleDialog
          role={editing === 'new' ? null : editing}
          grouped={grouped}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus role “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.memberCount ?? 0} pengguna yang memegang role ini akan kehilangan
              permission-nya. Penugasan role ikut dihapus. Role admin tidak bisa dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/rbac/roles/${deleting.id}`, { method: 'DELETE' })
                  toast.success(`Role ${deleting.key} dihapus`)
                  setDeleting(null)
                  void reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal menghapus role')
                }
              }}
            >
              Hapus role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RoleDialog({
  role,
  grouped,
  onClose,
  onSaved,
}: {
  role: Role | null
  grouped: [string, PermissionsResponse['permissions']][]
  onClose: () => void
  onSaved: () => void
}) {
  const [key, setKey] = useState(role?.key ?? '')
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? [])
  const [busy, setBusy] = useState(false)

  const isAdminRole = role?.key === 'admin'

  function toggle(permission: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, permission] : current.filter((entry) => entry !== permission),
    )
  }

  function toggleModule(modulePermissions: string[], checked: boolean) {
    setSelected((current) =>
      checked
        ? [...new Set([...current, ...modulePermissions])]
        : current.filter((entry) => !modulePermissions.includes(entry)),
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              if (role) {
                const payload: UpdateRoleInput = {
                  name,
                  description: description.trim() === '' ? null : description,
                  ...(isAdminRole ? {} : { permissions: selected }),
                }
                await apiFetch(`/api/rbac/roles/${role.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                })
                toast.success(`Updated ${role.key}`)
              } else {
                const payload: CreateRoleInput = {
                  key,
                  name,
                  description: description.trim() === '' ? undefined : description,
                  permissions: selected,
                }
                await apiFetch('/api/rbac/roles', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                })
                toast.success(`Created ${key}`)
              }
              onSaved()
            } catch (cause) {
              toast.error(cause instanceof ApiError ? cause.message : 'Could not save the role')
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{role ? `Edit ${role.name}` : 'New role'}</DialogTitle>
            <DialogDescription>
              {isAdminRole
                ? 'The admin role always holds every permission, so its permission set cannot be edited.'
                : 'Pick the permissions this role grants. They are grouped by the module that contributes them.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="roleKey">Key</Label>
                <Input
                  id="roleKey"
                  required
                  disabled={role !== null}
                  placeholder="support"
                  pattern="[a-z][a-z0-9_.-]*"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase. Referenced from code, so it cannot change later.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="roleName">Display name</Label>
                <Input
                  id="roleName"
                  required
                  placeholder="Support agent"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Permissions</Label>
                <span className="text-xs text-muted-foreground">{selected.length} selected</span>
              </div>

              <ScrollArea className="h-64 rounded-lg border p-3">
                <div className="flex flex-col gap-5">
                  {grouped.map(([module, modulePermissions]) => {
                    const keys = modulePermissions.map((permission) => permission.key)
                    const allSelected = keys.every((permissionKey) =>
                      selected.includes(permissionKey),
                    )

                    return (
                      <fieldset key={module} disabled={isAdminRole} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`module-${module}`}
                            checked={allSelected}
                            onCheckedChange={(checked) => toggleModule(keys, checked === true)}
                          />
                          <Label htmlFor={`module-${module}`} className="text-xs font-medium">
                            {module}
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            {keys.filter((permissionKey) => selected.includes(permissionKey)).length}/
                            {keys.length}
                          </span>
                        </div>

                        <div className="ml-6 flex flex-col gap-1.5">
                          {modulePermissions.map((permission) => (
                            <div key={permission.key} className="flex items-start gap-2">
                              <Checkbox
                                id={permission.key}
                                checked={selected.includes(permission.key)}
                                onCheckedChange={(checked) => toggle(permission.key, checked === true)}
                                className="mt-0.5"
                              />
                              <div className="flex flex-col">
                                <Label htmlFor={permission.key} className="font-mono text-xs">
                                  {permission.key}
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  {permission.description}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </fieldset>
                    )
                  })}

                  {grouped.length === 0 && (
                    <p className="text-xs text-muted-foreground">No permissions available.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              {role ? 'Save changes' : 'Create role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Rows are roles, columns are modules — the shape of the whole authorization model. */
function PermissionMatrix({
  roles,
  permissions,
}: {
  roles: Role[]
  permissions: PermissionsResponse['permissions']
}) {
  const modules = [...new Set(permissions.map((permission) => permission.module))].sort()

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Role</th>
              {modules.map((module) => (
                <th key={module} className="px-4 py-3">
                  {module}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <code className="text-xs">{role.key}</code>
                </td>
                {modules.map((module) => {
                  const inModule = permissions.filter(
                    (permission) => permission.module === module,
                  )
                  const held = inModule.filter((permission) =>
                    role.permissions.includes(permission.key),
                  ).length

                  return (
                    <td key={module} className="px-4 py-3">
                      {held === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : held === inModule.length ? (
                        <Badge variant="secondary">all</Badge>
                      ) : (
                        <span className="text-xs">
                          {held}/{inModule.length}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-right tabular-nums">{role.permissions.length}</td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={modules.length + 2} className="px-4 py-6 text-center text-muted-foreground">
                  No roles to compare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}