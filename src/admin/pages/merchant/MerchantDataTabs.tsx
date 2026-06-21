import { useState } from 'react'
import type { ReactNode } from 'react'
import { BookOpen, Megaphone, Receipt, Tag } from 'lucide-react'
import {
  ledgerPageSize,
  useMerchantCampaigns,
  useMerchantLedger,
  useMerchantPrograms,
  useMerchantTransactions,
} from '../../api/merchants'
import { formatDate, formatNumber, humanize } from '../../lib/format'
import { Button, ErrorState, Skeleton, StateBlock, StatusPill } from '../../components/ui/primitives'
import type { PillTone } from '../../components/ui/primitives'
import { SimpleTable } from '../../components/ui/SimpleTable'
import type { SimpleColumn } from '../../components/ui/SimpleTable'
import type { AdminCampaign, AdminLedgerEntry, AdminProgram, AdminTransaction } from '../../types/api'

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
