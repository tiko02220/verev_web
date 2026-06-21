import { useState } from 'react'
import type { ReactNode } from 'react'
import { BookOpen, CreditCard, Megaphone, Receipt, ShieldCheck, Tag } from 'lucide-react'
import {
  ledgerPageSize,
  useMerchantApprovals,
  useMerchantBilling,
  useMerchantCampaigns,
  useMerchantLedger,
  useMerchantPrograms,
  useMerchantTransactions,
} from '../../api/merchants'
import { formatDate, formatMoney, formatNumber, humanize } from '../../lib/format'
import { Button, Card, ErrorState, MetricCard, Skeleton, StateBlock, StatusPill } from '../../components/ui/primitives'
import type { PillTone } from '../../components/ui/primitives'
import { SimpleTable } from '../../components/ui/SimpleTable'
import type { SimpleColumn } from '../../components/ui/SimpleTable'
import type { AdminApproval, AdminCampaign, AdminLedgerEntry, AdminProgram, AdminTransaction, BillingInvoice } from '../../types/api'

function activeTone(active: boolean): PillTone {
  return active ? 'success' : 'neutral'
}

function transactionTone(status: string): PillTone {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'PENDING_APPROVAL':
      return 'warning'
    case 'REJECTED':
      return 'danger'
    default:
      return 'neutral'
  }
}

interface GateProps {
  isLoading: boolean
  isError: boolean
  error: unknown
  isEmpty: boolean
  emptyIcon: ReactNode
  emptyTitle: string
  onRetry: () => void
  children: ReactNode
}

function TabGate({ isLoading, isError, error, isEmpty, emptyIcon, emptyTitle, onRetry, children }: GateProps) {
  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load'} onRetry={onRetry} />
  if (isEmpty) return <StateBlock icon={emptyIcon} title={emptyTitle} />
  return <>{children}</>
}

export function ProgramsTab({ merchantId }: { merchantId: string }) {
  const { data, isLoading, isError, error, refetch } = useMerchantPrograms(merchantId)
  const rows = data ?? []
  const columns: SimpleColumn<AdminProgram>[] = [
    { header: 'Name', render: (program) => <span className="font-medium text-slate-900">{program.name}</span> },
    { header: 'Type', render: (program) => <span className="text-slate-600">{humanize(program.type)}</span> },
    { header: 'Created', render: (program) => <span className="text-slate-500">{formatDate(program.createdAt)}</span> },
    { header: 'Status', render: (program) => <StatusPill tone={activeTone(program.active)}>{program.active ? 'Active' : 'Inactive'}</StatusPill> },
  ]
  return (
    <TabGate isLoading={isLoading} isError={isError} error={error} isEmpty={rows.length === 0} emptyIcon={<Tag className="size-7" aria-hidden />} emptyTitle="No programs" onRetry={() => refetch()}>
      <SimpleTable<AdminProgram> rows={rows} getKey={(program) => program.id} columns={columns} />
    </TabGate>
  )
}

export function CampaignsTab({ merchantId }: { merchantId: string }) {
  const { data, isLoading, isError, error, refetch } = useMerchantCampaigns(merchantId)
  const rows = data ?? []
  const columns: SimpleColumn<AdminCampaign>[] = [
    { header: 'Name', render: (campaign) => <span className="font-medium text-slate-900">{campaign.name}</span> },
    { header: 'Promotion', render: (campaign) => <span className="text-slate-600">{humanize(campaign.promotionType)}</span> },
    { header: 'Value', render: (campaign) => <span className="mono text-slate-700">{formatNumber(campaign.promotionValue)}</span> },
    { header: 'Window', render: (campaign) => <span className="text-slate-500">{`${formatDate(campaign.startDate)} → ${formatDate(campaign.endDate)}`}</span> },
    { header: 'Status', render: (campaign) => <StatusPill tone={activeTone(campaign.active)}>{campaign.active ? 'Active' : 'Inactive'}</StatusPill> },
  ]
  return (
    <TabGate isLoading={isLoading} isError={isError} error={error} isEmpty={rows.length === 0} emptyIcon={<Megaphone className="size-7" aria-hidden />} emptyTitle="No campaigns" onRetry={() => refetch()}>
      <SimpleTable<AdminCampaign> rows={rows} getKey={(campaign) => campaign.id} columns={columns} />
    </TabGate>
  )
}

interface PaginationProps {
  page: number
  hasNextPage: boolean
  isFetching: boolean
  onChange: (page: number) => void
}

function Pagination({ page, hasNextPage, isFetching, onChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{isFetching ? 'Loading…' : `Page ${page + 1}`}</span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page === 0 || isFetching} onClick={() => onChange(Math.max(0, page - 1))}>
          Previous
        </Button>
        <Button variant="secondary" disabled={!hasNextPage || isFetching} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

export function TransactionsTab({ merchantId }: { merchantId: string }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch, isFetching } = useMerchantTransactions(merchantId, page)
  const rows = data ?? []
  const columns: SimpleColumn<AdminTransaction>[] = [
    { header: 'When', render: (txn) => <span className="text-slate-500">{formatDate(txn.occurredAt)}</span> },
    { header: 'Type', render: (txn) => <span className="text-slate-600">{humanize(txn.transactionType)}</span> },
    { header: 'Amount', render: (txn) => <span className="mono text-slate-700">{formatNumber(txn.amount)}</span> },
    { header: 'Earned', render: (txn) => <span className="mono text-emerald-700">+{formatNumber(txn.pointsEarned)}</span> },
    { header: 'Redeemed', render: (txn) => <span className="mono text-slate-700">{formatNumber(txn.pointsRedeemed)}</span> },
    { header: 'Status', render: (txn) => <StatusPill tone={transactionTone(txn.status)}>{humanize(txn.status)}</StatusPill> },
  ]
  return (
    <TabGate isLoading={isLoading} isError={isError} error={error} isEmpty={rows.length === 0 && page === 0} emptyIcon={<Receipt className="size-7" aria-hidden />} emptyTitle="No transactions" onRetry={() => refetch()}>
      <div className="space-y-4">
        <SimpleTable<AdminTransaction> rows={rows} getKey={(txn) => txn.id} columns={columns} />
        <Pagination page={page} hasNextPage={rows.length === ledgerPageSize} isFetching={isFetching} onChange={setPage} />
      </div>
    </TabGate>
  )
}

export function LedgerTab({ merchantId }: { merchantId: string }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch, isFetching } = useMerchantLedger(merchantId, page)
  const rows = data ?? []
  const columns: SimpleColumn<AdminLedgerEntry>[] = [
    { header: 'When', render: (entry) => <span className="text-slate-500">{formatDate(entry.createdAt)}</span> },
    { header: 'Entry', render: (entry) => <span className="text-slate-600">{humanize(entry.entryType)}</span> },
    {
      header: 'Delta',
      render: (entry) => (
        <span className={`mono ${entry.pointsDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {entry.pointsDelta >= 0 ? '+' : ''}
          {formatNumber(entry.pointsDelta)}
        </span>
      ),
    },
    { header: 'Balance', render: (entry) => <span className="mono text-slate-700">{formatNumber(entry.balanceAfter)}</span> },
    { header: 'Reason', render: (entry) => <span className="mono text-xs text-slate-400">{entry.reasonCode}</span> },
  ]
  return (
    <TabGate isLoading={isLoading} isError={isError} error={error} isEmpty={rows.length === 0 && page === 0} emptyIcon={<BookOpen className="size-7" aria-hidden />} emptyTitle="No ledger entries" onRetry={() => refetch()}>
      <div className="space-y-4">
        <SimpleTable<AdminLedgerEntry> rows={rows} getKey={(entry) => entry.id} columns={columns} />
        <Pagination page={page} hasNextPage={rows.length === ledgerPageSize} isFetching={isFetching} onChange={setPage} />
      </div>
    </TabGate>
  )
}

function approvalTone(status: string): PillTone {
  switch (status) {
    case 'APPROVED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'REJECTED':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function ApprovalsTab({ merchantId }: { merchantId: string }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch, isFetching } = useMerchantApprovals(merchantId, page)
  const rows = data ?? []
  const columns: SimpleColumn<AdminApproval>[] = [
    { header: 'Requested', render: (row) => <span className="text-slate-500">{formatDate(row.createdAt)}</span> },
    { header: 'Type', render: (row) => <span className="text-slate-700">{humanize(row.requestType)}</span> },
    { header: 'Reason', render: (row) => <span className="text-slate-500">{row.reasonText || '—'}</span> },
    { header: 'Expires', render: (row) => <span className="text-slate-500">{row.expiresAt ? formatDate(row.expiresAt) : '—'}</span> },
    { header: 'Status', render: (row) => <StatusPill tone={approvalTone(row.status)}>{humanize(row.status)}</StatusPill> },
  ]
  return (
    <TabGate isLoading={isLoading} isError={isError} error={error} isEmpty={rows.length === 0 && page === 0} emptyIcon={<ShieldCheck className="size-7" aria-hidden />} emptyTitle="No approval requests" onRetry={() => refetch()}>
      <div className="space-y-4">
        <SimpleTable<AdminApproval> rows={rows} getKey={(row) => row.id} columns={columns} />
        <Pagination page={page} hasNextPage={rows.length === ledgerPageSize} isFetching={isFetching} onChange={setPage} />
      </div>
    </TabGate>
  )
}

function subscriptionTone(status: string): PillTone {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'TRIAL':
      return 'info'
    case 'PAST_DUE':
    case 'GRACE':
      return 'warning'
    case 'SUSPENDED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function invoiceTone(status: string): PillTone {
  switch (status) {
    case 'PAID':
      return 'success'
    case 'OPEN':
      return 'warning'
    case 'PAST_DUE':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function BillingTab({ merchantId }: { merchantId: string }) {
  const { data, isLoading, isError, error, refetch } = useMerchantBilling(merchantId)
  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load billing'} onRetry={() => refetch()} />
  if (!data) return <StateBlock icon={<CreditCard className="size-7" aria-hidden />} title="No billing data" />

  const subscription = data.currentSubscription
  const currency = subscription?.currencyCode ?? ''
  const invoiceColumns: SimpleColumn<BillingInvoice>[] = [
    { header: 'Invoice', render: (invoice) => <span className="font-medium text-ink">{invoice.title}</span> },
    { header: 'Period', render: (invoice) => <span className="text-slate-600">{invoice.periodLabel}</span> },
    { header: 'Issued', render: (invoice) => <span className="text-slate-500">{formatDate(invoice.issuedDate)}</span> },
    { header: 'Amount', align: 'right', render: (invoice) => <span className="mono text-slate-700">{formatMoney(invoice.amount, invoice.currencyCode)}</span> },
    { header: 'Status', render: (invoice) => <StatusPill tone={invoiceTone(invoice.status)}>{humanize(invoice.status)}</StatusPill> },
  ]

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Open invoices" value={formatNumber(data.summary.openInvoiceCount)} hint={formatMoney(data.summary.openInvoiceAmount, currency)} />
        <MetricCard label="Paid (30 days)" value={formatMoney(data.summary.paidInvoiceAmount30d, currency)} />
        <MetricCard label="Monthly price" value={data.summary.currentMonthlyPrice !== null ? formatMoney(data.summary.currentMonthlyPrice, currency) : '—'} hint={data.summary.nextRenewalDate ? `renews ${formatDate(data.summary.nextRenewalDate)}` : undefined} />
      </section>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">Subscription</h2>
        {subscription ? (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="Plan" value={subscription.displayName || subscription.planCode} />
            <Field label="Status" value={<StatusPill tone={subscriptionTone(subscription.status)}>{humanize(subscription.status)}</StatusPill>} />
            <Field label="Monthly price" value={formatMoney(subscription.monthlyPrice, subscription.currencyCode)} />
            <Field label="Billing cycle" value={humanize(subscription.billingCycle)} />
            <Field label="Auto-renew" value={subscription.autoRenew ? 'On' : 'Off'} />
            <Field label="Renewal date" value={formatDate(subscription.renewalDate)} />
          </dl>
        ) : (
          <p className="text-sm text-subtle">No active subscription.</p>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink">Invoices</h2>
        {data.invoices.length === 0 ? (
          <StateBlock icon={<Receipt className="size-7" aria-hidden />} title="No invoices" />
        ) : (
          <SimpleTable<BillingInvoice> rows={data.invoices} getKey={(invoice) => invoice.id} columns={invoiceColumns} />
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  )
}
