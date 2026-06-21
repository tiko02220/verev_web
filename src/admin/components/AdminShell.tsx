import { NavLink, Outlet } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, LogOut, ScrollText, Store } from 'lucide-react'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { Button } from './ui/primitives'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/merchants', label: 'Merchants', icon: Store },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
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
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">1B</span>
          <span className="text-sm font-semibold text-slate-900">One Bonus Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-soft text-brand-dark' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {admin ? initials(admin.fullName) : ''}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{admin?.fullName}</p>
              <p className="truncate text-xs text-slate-500">{admin?.role.replace('_', ' ').toLowerCase()}</p>
            </div>
          </div>
          <Button variant="ghost" icon={<LogOut className="size-4" aria-hidden />} onClick={logout} className="mt-1 w-full justify-start">
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
