import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Coins, Receipt, Repeat, Store, UsersRound } from 'lucide-react'
import { useGlobalCustomer } from '../api/customers'
import { formatDate, formatNumber, humanize } from '../lib/format'
import { Card, ErrorState, Skeleton, StateBlock, StatusPill } from '../components/ui/primitives'
import type { PillTone } from '../components/ui/primitives'
import type { PlatformCustomerLedgerEntry, PlatformCustomerOrgAffiliation } from '../types/api'

function BackLink() {
  return (
    <Link to="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="size-4" aria-hidden />
      Customers
    </Link>
  )
}

function affiliationTone(status: string): PillTone {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'BLOCKED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function IdentityField({ label, value }: { label: string; value: ReactNode }) {
  const display = value === null || value === undefined || value === '' ? '—' : value
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{display}</dd>
    </div>
  )
}

function OrgMetric({ icon, label, value, tone = 'neutral' }: { icon: ReactNode; label: string; value: ReactNode; tone?: PillTone }) {
  const iconTone: Record<PillTone, string> = {
    success: 'bg-emerald-50 text-emerald-600',
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    neutral: 'bg-slate-100 text-slate-500',
    info: 'bg-sky-50 text-sky-600',
  }
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconTone[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mono text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

function LedgerLine({ entry }: { entry: PlatformCustomerLedgerEntry }) {
  const positive = entry.pointsDelta >= 0
  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-700">{humanize(entry.reasonCode)}</p>
        <p className="text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
      </div>
      <span className={`mono shrink-0 text-sm font-semibold ${positive ? 'text-emerald-700' : 'text-red-600'}`}>
        {positive ? '+' : ''}
        {formatNumber(entry.pointsDelta)}
      </span>
    </li>
  )
}

function MerchantCard({ org }: { org: PlatformCustomerOrgAffiliation }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark ring-1 ring-inset ring-brand-ring/60">
            <Building2 className="size-[18px]" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">{org.organizationName}</h3>
            <p className="text-xs text-slate-400">Enrolled {formatDate(org.enrolledAt)}</p>
          </div>
        </div>
        <StatusPill tone={affiliationTone(org.status)}>{humanize(org.status)}</StatusPill>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <OrgMetric icon={<Coins className="size-4" aria-hidden />} label="Points" value={formatNumber(org.currentPoints)} tone="info" />
        <OrgMetric icon={<UsersRound className="size-4" aria-hidden />} label="Tier" value={org.loyaltyTier ? humanize(org.loyaltyTier) : '—'} />
        <OrgMetric icon={<Repeat className="size-4" aria-hidden />} label="Visits" value={formatNumber(org.totalVisits)} />
        <OrgMetric icon={<Receipt className="size-4" aria-hidden />} label="Total spent" value={formatNumber(org.totalSpent)} />
        <OrgMetric icon={<Coins className="size-4" aria-hidden />} label="Lifetime earned" value={formatNumber(org.lifetimePointsEarned)} tone="success" />
        <OrgMetric icon={<Coins className="size-4" aria-hidden />} label="Lifetime redeemed" value={formatNumber(org.lifetimePointsRedeemed)} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Recent activity</p>
        <p className="text-xs text-slate-400">Last visit {org.lastVisitAt ? formatDate(org.lastVisitAt) : 'never'}</p>
      </div>
      {org.recentLedger.length === 0 ? (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">No recent activity</p>
      ) : (
        <ul className="mt-1">
          {org.recentLedger.map((entry) => (
            <LedgerLine key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </Card>
  )
}

export function CustomerDetailPage() {
  const { customerId = '' } = useParams()
  const { data, isLoading, isError, error, refetch } = useGlobalCustomer(customerId)

  if (isError) {
    return (
      <div className="p-6 sm:p-8">
        <BackLink />
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load customer'} onRetry={() => refetch()} />
      </div>
    )
  }

  const customer = data?.customer
  const name = customer ? `${customer.firstName} ${customer.lastName}`.trim() || 'Customer' : ''

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-canvas/85 px-6 pt-5 pb-5 backdrop-blur-md sm:px-8">
        <BackLink />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {customer ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-ink">{name}</h1>
              <StatusPill tone="info">{customer.loyaltyId}</StatusPill>
            </>
          ) : (
            <Skeleton className="h-7 w-48" />
          )}
        </div>
      </header>

      <div className="admin-rise space-y-6 p-6 sm:p-8">
        {isLoading || !data || !customer ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-56 w-full" />
          </>
        ) : (
          <>
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">Identity</h2>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <IdentityField label="Phone" value={<span className="mono">{customer.phoneNumber}</span>} />
                <IdentityField label="Email" value={customer.email} />
                <IdentityField label="Gender" value={customer.gender ? humanize(customer.gender) : ''} />
                <IdentityField label="Birth date" value={customer.birthDate ? formatDate(customer.birthDate) : ''} />
                <IdentityField label="Loyalty ID" value={<span className="mono">{customer.loyaltyId}</span>} />
                <IdentityField label="Enrolled" value={formatDate(customer.enrolledDate)} />
              </dl>
            </Card>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-ink">Merchants</h2>
                <span className="mono rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{data.organizations.length}</span>
              </div>
              {data.organizations.length === 0 ? (
                <StateBlock icon={<Store className="size-6" aria-hidden />} title="No merchant cards" subtitle="This customer is not enrolled with any merchant yet." />
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {data.organizations.map((org) => (
                    <MerchantCard key={org.organizationId} org={org} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}
