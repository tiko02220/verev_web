import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Ban, Coins, Receipt, Store, Tag, UsersRound } from 'lucide-react'
import { useDashboard } from '../api/platform'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { formatNumber } from '../lib/format'
import { Card, ErrorState, MetricCard, PageHeader, Skeleton } from '../components/ui/primitives'

export function DashboardPage() {
  const { admin } = useAdminAuth()
  const firstName = admin?.fullName.split(' ')[0] ?? 'there'
  const { data, isLoading, isError, error, refetch } = useDashboard()

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${firstName}.`} />
      <div className="space-y-6 p-6">
        {isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load dashboard'} onRetry={() => refetch()} />
        ) : (
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading || !data ? (
              Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-24" />)
            ) : (
              <>
                <MetricCard label="Merchants" value={formatNumber(data.totalMerchants)} icon={<Store className="size-4" aria-hidden />} />
                <MetricCard label="Active" value={formatNumber(data.activeMerchants)} icon={<Store className="size-4" aria-hidden />} hint="merchants" />
                <MetricCard label="Suspended" value={formatNumber(data.suspendedMerchants)} icon={<Ban className="size-4" aria-hidden />} hint="merchants" />
                <MetricCard label="Pending" value={formatNumber(data.pendingMerchants)} icon={<Store className="size-4" aria-hidden />} hint="merchants" />
                <MetricCard label="Customers" value={formatNumber(data.totalCustomers)} icon={<UsersRound className="size-4" aria-hidden />} />
                <MetricCard label="Stores" value={formatNumber(data.totalStores)} icon={<Store className="size-4" aria-hidden />} />
                <MetricCard label="Transactions" value={formatNumber(data.totalTransactions)} icon={<Receipt className="size-4" aria-hidden />} />
                <MetricCard label="Points out" value={formatNumber(data.pointsOutstanding)} icon={<Coins className="size-4" aria-hidden />} hint="liability" />
              </>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <QuickLink to="/admin/merchants" icon={<Store className="size-5" aria-hidden />} title="Merchants" subtitle="View and manage every organization" />
          <QuickLink to="/admin/audit" icon={<Tag className="size-5" aria-hidden />} title="Audit log" subtitle="Every platform action, newest first" />
        </div>
      </div>
    </>
  )
}

interface QuickLinkProps {
  to: string
  icon: ReactNode
  title: string
  subtitle: string
}

function QuickLink({ to, icon, title, subtitle }: QuickLinkProps) {
  return (
    <Link to={to} className="block">
      <Card className="p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center gap-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">{icon}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          <ArrowRight className="size-5 text-slate-400" aria-hidden />
        </div>
      </Card>
    </Link>
  )
}
