import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Bell, ClipboardCheck, LayoutDashboard, LogOut, Menu, ScrollText, ShieldCheck, Smartphone, Store, UsersRound, Workflow, X } from 'lucide-react'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import type { Capability } from '../auth/permissions'
import type { PlatformAdmin } from '../types/api'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  capability?: Capability
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/merchants', label: 'Merchants', icon: Store },
      { to: '/admin/customers', label: 'Customers', icon: UsersRound },
      { to: '/admin/moderation', label: 'Moderation', icon: ClipboardCheck, capability: 'merchants.config' },
      { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
      { to: '/admin/project-map', label: 'Project map', icon: Workflow },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/notifications', label: 'Notifications', icon: Bell, capability: 'merchants.config' },
      { to: '/admin/app-updates', label: 'App updates', icon: Smartphone, capability: 'merchants.config' },
      { to: '/admin/admins', label: 'Administrators', icon: ShieldCheck, capability: 'admins.manage' },
    ],
  },
]

function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white shadow-sm">1B</span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-ink">One Bonus</p>
        <p className="text-xs text-subtle">Admin console</p>
      </div>
    </div>
  )
}

interface ShellNavProps {
  admin: PlatformAdmin | null
  onLogout: () => void
  onNavigate?: () => void
}

function ShellNav({ admin, onLogout, onNavigate }: ShellNavProps) {
  return (
    <>
      <nav className="admin-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => !item.capability || (admin ? can(admin.role, item.capability) : false))
          if (visible.length === 0) return null
          return (
            <div key={group.label} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
              {visible.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-soft text-brand-dark ring-1 ring-inset ring-brand-ring/60' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`size-[18px] ${isActive ? 'text-brand' : 'text-slate-400 group-hover:text-slate-600'}`} aria-hidden />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-slate-200/70 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-dark ring-1 ring-inset ring-brand-ring/60">
            {admin ? initials(admin.fullName) : ''}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{admin?.fullName}</p>
            <p className="truncate text-xs capitalize text-subtle">{admin?.role.replace('_', ' ').toLowerCase()}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  )
}

export function AdminShell() {
  const { admin, logout } = useAdminAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!drawerOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white md:flex">
        <div className="flex h-16 items-center px-5">
          <BrandMark />
        </div>
        <ShellNav admin={admin} onLogout={logout} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-pointer bg-slate-900/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-slate-200/70 bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-5">
              <BrandMark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <ShellNav admin={admin} onLogout={logout} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white px-4 md:hidden">
          <BrandMark />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </header>

        <main className="admin-scroll min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
