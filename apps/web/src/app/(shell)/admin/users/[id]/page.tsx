'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeftIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { AuditLog, AuditLogListResponse, Role, RoleListResponse, User } from '@app/contracts'
import { useBreadcrumbLabel } from '@/components/admin/breadcrumb-context'
import { PageHeader } from '@/components/admin/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'

export default function UserDetailPage() {
  const params = useParams<{ id: string }>()
  const userId = params.id
  const { can } = useSession()

  const [user, setUser] = useState<User | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [activity, setActivity] = useState<AuditLog[]>([])
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    void apiFetch<{ user: User }>(`/api/users/${userId}`)
      .then(({ user: loaded }) => setUser(loaded))
      .catch((cause: unknown) =>
        toast.error(cause instanceof ApiError ? cause.message : 'Could not load the user'),
      )

    void apiFetch<RoleListResponse>('/api/rbac/roles?limit=100')
      .then((page) => setRoles(page.items))
      .catch(() => setRoles([]))

    void apiFetch<AuditLogListResponse>(`/api/audit/logs?actorId=${userId}&limit=20`)
      .then((page) => setActivity(page.items))
      .catch(() => setActivity([]))
  }, [userId])

  async function toggleRole(roleKey: string, assigned: boolean) {
    setPending(roleKey)
    try {
      await apiFetch(`/api/rbac/users/${userId}/roles/${roleKey}`, {
        method: 'POST',
        body: JSON.stringify({ assigned }),
      })
      const { user: refreshed } = await apiFetch<{ user: User }>(`/api/users/${userId}`)
      setUser(refreshed)
      toast.success(assigned ? `Granted ${roleKey}` : `Revoked ${roleKey}`)
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not change the role')
    } finally {
      setPending(null)
    }
  }

  useBreadcrumbLabel(user ? (user.name ?? user.email) : null)

  if (!user) {
    return (
      <>
        <PageHeader title="User" />
        <Skeleton className="h-64 w-full" />
      </>
    )
  }

  return (
    <>
      <PageHeader title={user.name ?? user.email} description="Profile, access and recent activity.">
        <Button asChild variant="outline">
          <Link href="/admin/users">
            <ArrowLeftIcon data-icon="inline-start" />
            All users
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader className="flex flex-col items-center text-center">
            <Avatar className="size-20">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.email} />}
              <AvatarFallback className="text-xl">
                {user.email.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-base">{user.name ?? user.email}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={user.status === 'active' ? 'secondary' : 'destructive'}>
                {user.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <Separator />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">User id</span>
              <code className="text-xs break-all">{user.id}</code>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Each role grants its permissions. Changes take effect on the user&apos;s next
                request.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {roles.map((role) => {
                const assigned = user.roles.includes(role.key)
                return (
                  <div key={role.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                      id={`role-${role.key}`}
                      className="mt-0.5"
                      checked={assigned}
                      disabled={!can('rbac.assignment.write') || pending === role.key}
                      onCheckedChange={(checked) => void toggleRole(role.key, checked === true)}
                    />
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`role-${role.key}`}>
                          {role.name}
                          <code className="ml-2 text-xs text-muted-foreground">{role.key}</code>
                        </Label>
                        {pending === role.key && <Loader2Icon className="size-3 animate-spin" />}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {role.permissions.length} permissions · {role.memberCount} member(s)
                      </span>
                    </div>
                  </div>
                )
              })}
              {roles.length === 0 && (
                <p className="text-sm text-muted-foreground">No roles available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Audit records where this user was the actor.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                  <code className="text-xs">{entry.action}</code>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.status === 'success' ? 'secondary' : 'destructive'}>
                      {entry.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-muted-foreground">No recorded activity.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
