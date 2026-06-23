import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  Cake,
  Calendar,
  Check,
  ChevronRight,
  Coins,
  Copy,
  Hash,
  Mail,
  Phone,
  Receipt,
  Repeat,
  Store,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { useDeleteGlobalCustomer, useGlobalCustomer } from '../api/customers'
import { formatDate, formatNumber, humanize, orgStatusTone } from '../lib/format'
import { Button, Card, ErrorState, MetricCard, Skeleton, StateBlock, StatusPill } from '../components/ui/primitives'
import type { PillTone } from '../components/ui/primitives'
import { ConfirmDialog } from '../components/ui/Dialog'
import { DetailDrawer } from '../components/ui/DetailDrawer'
import type { PlatformCustomerIdentity, PlatformCustomerLedgerEntry, PlatformCustomerOrgAffiliation } from '../types/api'

function BackLink() {
  return (
    <Link to="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800">
      <ArrowLeft className="size-4" aria-hidden />
      Customers
    </Link>
  )
}

function CopyableValue({ value, mono = false }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span className="text-sm text-slate-400">—</span>
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button type="button" onClick={copy} title="Copy to clipboard" className="group inline-flex items-center gap-1.5 text-left">
      <span className={`text-sm text-slate-800 ${mono ? 'mono' : ''}`}>{value}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" aria-hidden />
      )}
    </button>
  )
}

function ageFrom(birthDate: string): number | null {
  const parsed = new Date(birthDate)
  if (Number.isNaN(parsed.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - parsed.getFullYear()
  const monthDelta = now.getMonth() - parsed.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

function IdentityField({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  const display = value === null || value === undefined || value === '' ? <span className="text-sm text-slate-400">—</span> : value
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className="mt-0.5">{display}</dd>
      </div>
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
        <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mono truncate text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

function LedgerLine({ entry }: { entry: PlatformCustomerLedgerEntry }) {
  const positive = entry.pointsDelta >= 0
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {positive ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-700">{humanize(entry.reasonCode)}</p>
          <p className="mono truncate text-[0.7rem] text-slate-400" title={entry.transactionId}>
            {formatDate(entry.createdAt)} · {entry.transactionId.slice(0, 8)}
          </p>
        </div>
      </div>
      <span className={`mono shrink-0 text-sm font-semibold ${positive ? 'text-emerald-700' : 'text-red-600'}`}>
        {positive ? '+' : ''}
        {formatNumber(entry.pointsDelta)}
      </span>
    </li>
  )
}

function RowStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="mono text-sm font-semibold text-ink">{value}</p>
      <p className="text-[0.58rem] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  )
}

function MerchantRow({ org, onSelect }: { org: PlatformCustomerOrgAffiliation; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark ring-1 ring-inset ring-brand-ring/60">
        <Store className="size-[17px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">{org.organizationName}</span>
          <StatusPill tone={orgStatusTone(org.status)}>{humanize(org.status)}</StatusPill>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {org.loyaltyTier ? `${humanize(org.loyaltyTier)} · ` : ''}Last visit {org.lastVisitAt ? formatDate(org.lastVisitAt) : 'never'}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-6 sm:flex">
        <RowStat label="Points" value={formatNumber(org.currentPoints)} />
        <RowStat label="Visits" value={formatNumber(org.totalVisits)} />
        <RowStat label="Spent" value={formatNumber(org.totalSpent)} />
      </div>
      <ChevronRight className="size-4 shrink-0 text-slate-300" aria-hidden />
    </button>
  )
}

function MerchantDrawer({ org, onClose }: { org: PlatformCustomerOrgAffiliation; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={org.organizationName}
      subtitle={`Enrolled ${formatDate(org.enrolledAt)} · Last visit ${org.lastVisitAt ? formatDate(org.lastVisitAt) : 'never'}`}
      status={<StatusPill tone={orgStatusTone(org.status)}>{humanize(org.status)}</StatusPill>}
      actions={
        <Link to={`/admin/merchants/${org.organizationId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-dark hover:underline">
          Open merchant
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        <OrgMetric icon={<Coins className="size-4" aria-hidden />} label="Points" value={formatNumber(org.currentPoints)} tone="info" />
        <OrgMetric icon={<Award className="size-4" aria-hidden />} label="Tier" value={org.loyaltyTier ? humanize(org.loyaltyTier) : '—'} tone="warning" />
        <OrgMetric icon={<Repeat className="size-4" aria-hidden />} label="Visits" value={formatNumber(org.totalVisits)} />
        <OrgMetric icon={<Receipt className="size-4" aria-hidden />} label="Total spent" value={formatNumber(org.totalSpent)} />
        <OrgMetric icon={<TrendingUp className="size-4" aria-hidden />} label="Lifetime earned" value={formatNumber(org.lifetimePointsEarned)} tone="success" />
        <OrgMetric icon={<TrendingDown className="size-4" aria-hidden />} label="Lifetime redeemed" value={formatNumber(org.lifetimePointsRedeemed)} tone="danger" />
      </div>

      <section>
        <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Recent activity</p>
        {org.recentLedger.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">No recent activity</p>
        ) : (
          <ul className="rounded-xl border border-slate-200/70 bg-white px-2 py-1 shadow-card">
            {org.recentLedger.map((entry) => (
              <LedgerLine key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </DetailDrawer>
  )
}

function totalsOf(orgs: PlatformCustomerOrgAffiliation[]) {
  return orgs.reduce(
    (acc, org) => ({
      points: acc.points + org.currentPoints,
      earned: acc.earned + org.lifetimePointsEarned,
      redeemed: acc.redeemed + org.lifetimePointsRedeemed,
      visits: acc.visits + org.totalVisits,
      spent: acc.spent + org.totalSpent,
    }),
    { points: 0, earned: 0, redeemed: 0, visits: 0, spent: 0 },
  )
}

function IdentityHero({ customer }: { customer: PlatformCustomerIdentity }) {
  const name = `${customer.firstName} ${customer.lastName}`.trim() || 'Customer'
  const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase() || '?'
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-lg font-semibold text-white shadow-sm">{initials}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{name}</h1>
          <StatusPill tone="info">{customer.loyaltyId}</StatusPill>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5 text-slate-400" aria-hidden />
            <span className="mono">{customer.phoneNumber || '—'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5 text-slate-400" aria-hidden />
            {customer.email || '—'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5 text-slate-400" aria-hidden />
            Member since {formatDate(customer.enrolledDate)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function CustomerDetailPage() {
  const { customerId = '' } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useGlobalCustomer(customerId)
  const deleteCustomer = useDeleteGlobalCustomer()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  if (isError) {
    return (
      <div className="p-6 sm:p-8">
        <BackLink />
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load customer'} onRetry={() => refetch()} />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6 sm:p-8">
        <BackLink />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  const customer = data.customer
  const name = `${customer.firstName} ${customer.lastName}`.trim()
  const totals = totalsOf(data.organizations)
  const age = ageFrom(customer.birthDate)
  const selectedOrg = data.organizations.find((org) => org.organizationId === selectedOrgId) ?? null

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-canvas/85 px-6 pt-5 pb-5 backdrop-blur-md sm:px-8">
        <BackLink />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <IdentityHero customer={customer} />
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirmingDelete(true)}>
            Delete
          </Button>
        </div>
      </header>

      <div className="admin-rise space-y-6 p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Merchants" value={formatNumber(data.organizations.length)} icon={<Store className="size-4" aria-hidden />} tone="info" />
          <MetricCard label="Points held" value={formatNumber(totals.points)} icon={<Coins className="size-4" aria-hidden />} tone="info" />
          <MetricCard label="Lifetime earned" value={formatNumber(totals.earned)} icon={<TrendingUp className="size-4" aria-hidden />} tone="success" />
          <MetricCard label="Lifetime redeemed" value={formatNumber(totals.redeemed)} icon={<TrendingDown className="size-4" aria-hidden />} tone="danger" />
          <MetricCard label="Total visits" value={formatNumber(totals.visits)} icon={<Repeat className="size-4" aria-hidden />} tone="neutral" />
          <MetricCard label="Total spent" value={formatNumber(totals.spent)} icon={<Wallet className="size-4" aria-hidden />} tone="warning" />
        </div>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Identity</h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <IdentityField icon={<User className="size-3.5" aria-hidden />} label="First name" value={<span className="text-sm text-slate-800">{customer.firstName || '—'}</span>} />
            <IdentityField icon={<User className="size-3.5" aria-hidden />} label="Last name" value={<span className="text-sm text-slate-800">{customer.lastName || '—'}</span>} />
            <IdentityField icon={<UsersRound className="size-3.5" aria-hidden />} label="Gender" value={customer.gender ? <span className="text-sm text-slate-800">{humanize(customer.gender)}</span> : ''} />
            <IdentityField icon={<Phone className="size-3.5" aria-hidden />} label="Phone" value={<CopyableValue value={customer.phoneNumber} mono />} />
            <IdentityField icon={<Mail className="size-3.5" aria-hidden />} label="Email" value={<CopyableValue value={customer.email} />} />
            <IdentityField
              icon={<Cake className="size-3.5" aria-hidden />}
              label="Birth date"
              value={customer.birthDate ? <span className="text-sm text-slate-800">{formatDate(customer.birthDate)}{age !== null ? ` · ${age} yrs` : ''}</span> : ''}
            />
            <IdentityField icon={<Hash className="size-3.5" aria-hidden />} label="Loyalty ID" value={<CopyableValue value={customer.loyaltyId} mono />} />
            <IdentityField icon={<Hash className="size-3.5" aria-hidden />} label="Customer ID" value={<CopyableValue value={customer.customerId} mono />} />
            <IdentityField icon={<Calendar className="size-3.5" aria-hidden />} label="Enrolled" value={<span className="text-sm text-slate-800">{formatDate(customer.enrolledDate)}</span>} />
          </dl>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">Merchant memberships</h2>
            <span className="mono rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{data.organizations.length}</span>
          </div>
          {data.organizations.length === 0 ? (
            <StateBlock icon={<Store className="size-6" aria-hidden />} title="No merchant cards" subtitle="This customer is not enrolled with any merchant yet." />
          ) : (
            <Card className="overflow-hidden">
              {data.organizations.map((org) => (
                <MerchantRow key={org.organizationId} org={org} onSelect={() => setSelectedOrgId(org.organizationId)} />
              ))}
            </Card>
          )}
        </section>
      </div>

      {selectedOrg ? <MerchantDrawer org={selectedOrg} onClose={() => setSelectedOrgId(null)} /> : null}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete customer"
        description={`Permanently remove ${name || 'this customer'} and detach them from all merchant cards. This cannot be undone.`}
        confirmLabel="Delete customer"
        tone="danger"
        confirmPhrase={customer.loyaltyId}
        isLoading={deleteCustomer.isPending}
        onConfirm={() =>
          deleteCustomer.mutate(
            { customerId },
            {
              onSuccess: () => {
                setConfirmingDelete(false)
                navigate('/admin/customers')
              },
            },
          )
        }
        onClose={() => setConfirmingDelete(false)}
      />
    </>
  )
}
