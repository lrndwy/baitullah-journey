'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArchiveRestoreIcon,
  BedDoubleIcon,
  BoxesIcon,
  Building2Icon,
  CalendarDaysIcon,
  ClipboardListIcon,
  FolderOpenIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  NewspaperIcon,
  PackageIcon,
  QuoteIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagsIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { useBranding } from '@/components/branding-provider'
import { useSession } from '@/lib/session'
import type { NavigationItem } from '@app/contracts'

/**
 * Sidebar entries come from `GET /api/_meta/navigation`. Icons resolve by path
 * first, then by the optional `icon` field from the module manifest, then a
 * generic fallback — so domain pages get distinct icons without a frontend
 * change for every new module.
 */
const PATH_ICONS: Record<string, LucideIcon> = {
  '/admin/categories': TagsIcon,
  '/admin/packages': PackageIcon,
  '/admin/departures': CalendarDaysIcon,
  '/admin/facilities': SparklesIcon,
  '/admin/accommodations': Building2Icon,
  '/admin/articles': NewspaperIcon,
  '/admin/galleries': ImagesIcon,
  '/admin/testimonials': QuoteIcon,
  '/admin/inquiries': ClipboardListIcon,
  '/admin/users': UsersIcon,
  '/admin/roles': ShieldCheckIcon,
  '/admin/files': FolderOpenIcon,
  '/admin/backups': ArchiveRestoreIcon,
  '/admin/audit': ScrollTextIcon,
  '/admin/settings': SettingsIcon,
}

const NAMED_ICONS: Record<string, LucideIcon> = {
  tags: TagsIcon,
  package: PackageIcon,
  calendar: CalendarDaysIcon,
  sparkles: SparklesIcon,
  building: Building2Icon,
  bed: BedDoubleIcon,
  newspaper: NewspaperIcon,
  images: ImagesIcon,
  quote: QuoteIcon,
  clipboard: ClipboardListIcon,
  users: UsersIcon,
  shield: ShieldCheckIcon,
  folder: FolderOpenIcon,
  archive: ArchiveRestoreIcon,
  scroll: ScrollTextIcon,
  settings: SettingsIcon,
}

const NAV_GROUPS: { id: string; label: string; modules: string[] }[] = [
  { id: 'katalog', label: 'Katalog', modules: ['packages'] },
  { id: 'konten', label: 'Konten', modules: ['content'] },
  { id: 'operasi', label: 'Operasi', modules: ['inquiries'] },
  {
    id: 'sistem',
    label: 'Sistem',
    modules: ['users', 'rbac', 'storage', 'backup', 'audit', 'settings'],
  },
]

function resolveIcon(item: NavigationItem): LucideIcon {
  if (PATH_ICONS[item.path]) return PATH_ICONS[item.path]
  if (item.icon && NAMED_ICONS[item.icon]) return NAMED_ICONS[item.icon]
  return BoxesIcon
}

function isActivePath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const { user, navigation, signOut } = useSession()
  const branding = useBranding()

  const closeOnNavigate = () => {
    if (isMobile) setOpenMobile(false)
  }

  const grouped = NAV_GROUPS.map((group) => ({
    ...group,
    items: navigation.filter((item) => group.modules.includes(item.module)),
  })).filter((group) => group.items.length > 0)

  const ungrouped = navigation.filter(
    (item) => !NAV_GROUPS.some((group) => group.modules.includes(item.module)),
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logoUrl}
                    alt=""
                    className="size-8 shrink-0 rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <BoxesIcon className="size-4" />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="truncate font-medium">{branding.siteName}</span>
                  <span className="text-xs text-muted-foreground">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin'}>
                  <Link href="/admin" onClick={closeOnNavigate}>
                    <LayoutDashboardIcon />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {grouped.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = resolveIcon(item)
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActivePath(pathname, item.path)}>
                        <Link href={item.path} onClick={closeOnNavigate}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {ungrouped.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Lainnya</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ungrouped.map((item) => {
                  const Icon = resolveIcon(item)
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActivePath(pathname, item.path)}>
                        <Link href={item.path} onClick={closeOnNavigate}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8 rounded-lg">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.email} />}
                    <AvatarFallback className="rounded-lg">
                      {initials(user?.email ?? '??')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.email}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.roles.join(', ') || 'no roles'}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{user?.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {user?.permissions.length ?? 0} permissions granted
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" onClick={closeOnNavigate}>
                    <UserRoundIcon />
                    Your profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut().then(() => router.replace('/'))
                  }}
                >
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
