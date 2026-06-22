import { NavLink, Outlet } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Bell, ClipboardCheck, LayoutDashboard, LogOut, ScrollText, ShieldCheck, Smartphone, Store, UsersRound } from 'lucide-react'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import type { Capability } from '../auth/permissions'

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

export function AdminShell() {
  const { admin, logout } = useAdminAuth()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white md:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white shadow-sm">1B</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink">One Bonus</p>
            <p className="text-xs text-subtle">Admin console</p>
          </div>
        </div>

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
              onClick={logout}
              aria-label="Sign out"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-scroll min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
