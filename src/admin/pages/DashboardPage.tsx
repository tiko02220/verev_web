import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Ban, Clock, Coins, Receipt, Store, UsersRound } from 'lucide-react'
import { useDashboard } from '../api/platform'
import { useMerchants } from '../api/merchants'
import { formatNumber, humanize, orgStatusTone } from '../lib/format'
import { Button, Card, ErrorState, MetricCard, PageHeader, Skeleton, StatusPill } from '../components/ui/primitives'
import type { PlatformDashboard } from '../types/api'

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard()

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Platform health at a glance"
        actions={
          <Link to="/admin/merchants">
            <Button variant="secondary" icon={<Store className="size-4" aria-hidden />}>
              View merchants
            </Button>
          </Link>
        }
      />
      <div className="admin-rise space-y-6 p-6 sm:p-8">
        {isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load dashboard'} onRetry={() => refetch()} />
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric loading={isLoading} label="Merchants" value={data?.totalMerchants} tone="info" icon={<Store className="size-4" aria-hidden />} />
              <Metric loading={isLoading} label="Active" value={data?.activeMerchants} tone="success" icon={<Store className="size-4" aria-hidden />} />
              <Metric loading={isLoading} label="Suspended" value={data?.suspendedMerchants} tone="danger" icon={<Ban className="size-4" aria-hidden />} />
              <Metric loading={isLoading} label="Pending" value={data?.pendingMerchants} tone="warning" icon={<Clock className="size-4" aria-hidden />} />
            </section>

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric loading={isLoading} label="Customers" value={data?.totalCustomers} icon={<UsersRound className="size-4" aria-hidden />} />
              <Metric loading={isLoading} label="Stores" value={data?.totalStores} icon={<Store className="size-4" aria-hidden />} />
              <Metric loading={isLoading} label="Transactions" value={data?.totalTransactions} icon={<Receipt className="size-4" aria-hidden />} />
              <Metric loading={isLoading} label="Points outstanding" value={data?.pointsOutstanding} hint="open liability" icon={<Coins className="size-4" aria-hidden />} />
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <StatusBreakdown data={data} loading={isLoading} />
              <RecentMerchants />
            </div>
          </>
        )}
      </div>
    </>
  )
}

interface MetricProps {
  loading: boolean
  label: string
  value: number | undefined
  tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'info'
  hint?: string
  icon?: ReactNode
}

function Metric({ loading, label, value, tone = 'neutral', hint, icon }: MetricProps) {
  if (loading || value === undefined) return <Skeleton className="h-[104px]" />
  return <MetricCard label={label} value={formatNumber(value)} tone={tone} hint={hint} icon={icon} />
}

const STATUS_SEGMENTS: ReadonlyArray<{ key: keyof PlatformDashboard; label: string; color: string }> = [
  { key: 'activeMerchants', label: 'Active', color: 'bg-emerald-500' },
  { key: 'pendingMerchants', label: 'Pending', color: 'bg-amber-500' },
  { key: 'suspendedMerchants', label: 'Suspended', color: 'bg-red-500' },
]

function StatusBreakdown({ data, loading }: { data: PlatformDashboard | undefined; loading: boolean }) {
  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-5 h-3 w-full" />
        <Skeleton className="mt-5 h-24 w-full" />
      </Card>
    )
  }
  const cancelled = Math.max(0, data.totalMerchants - data.activeMerchants - data.pendingMerchants - data.suspendedMerchants)
  const segments = [...STATUS_SEGMENTS, { key: 'totalMerchants' as const, label: 'Cancelled', color: 'bg-slate-300', value: cancelled }]
  const total = Math.max(1, data.totalMerchants)

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink">Merchants by status</h2>
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((segment) => {
          const value = 'value' in segment ? segment.value : data[segment.key]
          const pct = (value / total) * 100
          return pct > 0 ? <div key={segment.label} className={segment.color} style={{ width: `${pct}%` }} aria-hidden /> : null
        })}
      </div>
      <ul className="mt-5 space-y-2.5">
        {segments.map((segment) => {
          const value = 'value' in segment ? segment.value : data[segment.key]
          return (
            <li key={segment.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className={`size-2.5 rounded-full ${segment.color}`} aria-hidden />
                {segment.label}
              </span>
              <span className="mono font-medium text-ink">{formatNumber(value)}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function RecentMerchants() {
  const { data, isLoading } = useMerchants({})
  const rows = (data ?? []).slice(0, 6)

  return (
    <Card className="xl:col-span-2">
      <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">Recent merchants</h2>
        <Link to="/admin/merchants" className="inline-flex items-center gap-1 text-xs font-medium text-brand-dark hover:underline">
          View all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-subtle">No merchants yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((merchant) => (
            <li key={merchant.organizationId}>
              <Link to={`/admin/merchants/${merchant.organizationId}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50/70">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{merchant.displayName}</p>
                  <p className="mono truncate text-xs text-slate-400">{merchant.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="mono hidden text-xs text-slate-500 sm:block">{formatNumber(merchant.customerCount)} customers</span>
                  <StatusPill tone={orgStatusTone(merchant.status)}>{humanize(merchant.status)}</StatusPill>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
