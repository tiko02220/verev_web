import { useState } from 'react'
import type { ReactNode } from 'react'
import { Ban, BookOpen, CreditCard, Megaphone, Pencil, Power, Receipt, ShieldCheck, Tag, Trash2 } from 'lucide-react'
import { useAdminAuth } from '../../auth/AdminAuthContext'
import { can } from '../../auth/permissions'
import {
  ledgerPageSize,
  useDeleteCampaign,
  useDeleteProgram,
  useMerchantApprovals,
  useMerchantBilling,
  useMerchantCampaigns,
  useMerchantLedger,
  useMerchantPrograms,
  useMerchantTransactions,
  useRenameProgram,
  useSetCampaignActive,
  useSetProgramActive,
  useUpdateCampaign,
  useVoidTransaction,
} from '../../api/merchants'
import { ApiError } from '../../lib/apiClient'
import { formatDate, formatMoney, formatNumber, humanize } from '../../lib/format'
import { Button, Card, ErrorState, MetricCard, Skeleton, StateBlock, StatusPill, TextField } from '../../components/ui/primitives'
import type { PillTone } from '../../components/ui/primitives'
import { ConfirmDialog, Modal } from '../../components/ui/Dialog'
import { SimpleTable } from '../../components/ui/SimpleTable'
import type { SimpleColumn } from '../../components/ui/SimpleTable'
import type { AdminApproval, AdminCampaign, AdminLedgerEntry, AdminProgram, AdminTransaction, BillingInvoice, UpdateCampaignRequest } from '../../types/api'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

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
    case 'VOIDED':
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
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useMerchantPrograms(merchantId)
  const setActive = useSetProgramActive(merchantId)
  const deleteProgram = useDeleteProgram(merchantId)
  const [renaming, setRenaming] = useState<AdminProgram | null>(null)
  const [deleting, setDeleting] = useState<AdminProgram | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const rows = data ?? []
  const columns: SimpleColumn<AdminProgram>[] = [
    { header: 'Name', render: (program) => <span className="font-medium text-slate-900">{program.name}</span> },
    { header: 'Type', render: (program) => <span className="text-slate-600">{humanize(program.type)}</span> },
    { header: 'Created', render: (program) => <span className="text-slate-500">{formatDate(program.createdAt)}</span> },
    { header: 'Status', render: (program) => <StatusPill tone={activeTone(program.active)}>{program.active ? 'Active' : 'Inactive'}</StatusPill> },
  ]
  if (canManage) {
    columns.push({
      header: 'Actions',
      align: 'right',
      render: (program) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setRenaming(program)} className="h-8 px-2">
            Rename
          </Button>
          <Button
            variant="ghost"
            icon={<Power className="size-4" aria-hidden />}
            isLoading={setActive.isPending && setActive.variables?.programId === program.id}
            onClick={() => setActive.mutate({ programId: program.id, active: !program.active })}
            className={`h-8 px-2 ${program.active ? 'text-red-600' : 'text-brand-dark'}`}
          >
            {program.active ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => {
              setDeleteError(null)
              setDeleting(program)
            }}
            className="h-8 px-2 text-red-600"
          >
            Delete
          </Button>
        </div>
      ),
    })
  }
  return (
    <TabGate isLoading={isLoading} isError={isError} error={error} isEmpty={rows.length === 0} emptyIcon={<Tag className="size-7" aria-hidden />} emptyTitle="No programs" onRetry={() => refetch()}>
      <SimpleTable<AdminProgram> rows={rows} getKey={(program) => program.id} columns={columns} />
      <ProgramRenameDialog merchantId={merchantId} program={renaming} onClose={() => setRenaming(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete program"
        description={
          <div className="flex flex-col gap-2">
            <span>
              Deletes the <span className="font-semibold text-slate-900">{deleting?.name}</span> program. Customer points already earned remain in the ledger, but
              this program stops issuing or redeeming. This action cannot be undone.
            </span>
            {deleteError ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</span> : null}
          </div>
        }
        confirmLabel="Delete program"
        tone="danger"
        isLoading={deleteProgram.isPending}
        onConfirm={() => {
          if (!deleting) return
          setDeleteError(null)
          deleteProgram.mutate({ programId: deleting.id }, { onSuccess: () => setDeleting(null), onError: (err) => setDeleteError(errorMessage(err, 'Delete failed')) })
        }}
        onClose={() => setDeleting(null)}
      />
    </TabGate>
  )
}

function ProgramRenameDialog({ merchantId, program, onClose }: { merchantId: string; program: AdminProgram | null; onClose: () => void }) {
  const mutation = useRenameProgram(merchantId)
  const [name, setName] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (program && program.id !== seededId) {
    setSeededId(program.id)
    setName(program.name)
    setErrorText(null)
  }

  function save() {
    if (!program) return
    setErrorText(null)
    mutation.mutate(
      { programId: program.id, request: { name: name.trim() } },
      { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Rename failed')) },
    )
  }

  return (
    <Modal
      open={program !== null}
      onClose={onClose}
      title="Rename program"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!name.trim()} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Program name" value={name} onChange={(event) => setName(event.target.value)} />
        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

export function CampaignsTab({ merchantId }: { merchantId: string }) {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useMerchantCampaigns(merchantId)
  const setActive = useSetCampaignActive(merchantId)
  const deleteCampaign = useDeleteCampaign(merchantId)
  const [editing, setEditing] = useState<AdminCampaign | null>(null)
  const [deleting, setDeleting] = useState<AdminCampaign | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const rows = data ?? []
  const columns: SimpleColumn<AdminCampaign>[] = [
    { header: 'Name', render: (campaign) => <span className="font-medium text-slate-900">{campaign.name}</span> },
    { header: 'Promotion', render: (campaign) => <span className="text-slate-600">{humanize(campaign.promotionType)}</span> },
    { header: 'Value', render: (campaign) => <span className="mono text-slate-700">{formatNumber(campaign.promotionValue)}</span> },
    { header: 'Window', render: (campaign) => <span className="text-slate-500">{`${formatDate(campaign.startDate)} → ${formatDate(campaign.endDate)}`}</span> },
    { header: 'Status', render: (campaign) => <StatusPill tone={activeTone(campaign.active)}>{campaign.active ? 'Active' : 'Inactive'}</StatusPill> },
  ]
  if (canManage) {
    columns.push({
      header: 'Actions',
      align: 'right',
      render: (campaign) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setEditing(campaign)} className="h-8 px-2">
            Edit
          </Button>
          <Button
            variant="ghost"
            icon={<Power className="size-4" aria-hidden />}
            isLoading={setActive.isPending && setActive.variables?.campaignId === campaign.id}
            onClick={() => setActive.mutate({ campaignId: campaign.id, active: !campaign.active })}
            className={`h-8 px-2 ${campaign.active ? 'text-red-600' : 'text-brand-dark'}`}
          >
            {campaign.active ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => {
              setDeleteError(null)
              setDeleting(campaign)
            }}
            className="h-8 px-2 text-red-600"
          >
            Delete
          </Button>
        </div>
      ),
    })
  }
  return (
    <TabGate isLoading={isLoading} isError={isError} error={error} isEmpty={rows.length === 0} emptyIcon={<Megaphone className="size-7" aria-hidden />} emptyTitle="No campaigns" onRetry={() => refetch()}>
      <SimpleTable<AdminCampaign> rows={rows} getKey={(campaign) => campaign.id} columns={columns} />
      <CampaignEditDialog merchantId={merchantId} campaign={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete campaign"
        description={
          <div className="flex flex-col gap-2">
            <span>
              Deletes the <span className="font-semibold text-slate-900">{deleting?.name}</span> campaign. It stops applying immediately. This action cannot be
              undone.
            </span>
            {deleteError ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</span> : null}
          </div>
        }
        confirmLabel="Delete campaign"
        tone="danger"
        isLoading={deleteCampaign.isPending}
        onConfirm={() => {
          if (!deleting) return
          setDeleteError(null)
          deleteCampaign.mutate({ campaignId: deleting.id }, { onSuccess: () => setDeleting(null), onError: (err) => setDeleteError(errorMessage(err, 'Delete failed')) })
        }}
        onClose={() => setDeleting(null)}
      />
    </TabGate>
  )
}

function toCampaignForm(campaign: AdminCampaign): UpdateCampaignRequest {
  return { name: campaign.name, startDate: campaign.startDate, endDate: campaign.endDate, promotionValue: campaign.promotionValue }
}

function CampaignEditDialog({ merchantId, campaign, onClose }: { merchantId: string; campaign: AdminCampaign | null; onClose: () => void }) {
  const mutation = useUpdateCampaign(merchantId)
  const [form, setForm] = useState<UpdateCampaignRequest>({ name: '', startDate: '', endDate: '', promotionValue: 0 })
  const [valueText, setValueText] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (campaign && campaign.id !== seededId) {
    setSeededId(campaign.id)
    setForm(toCampaignForm(campaign))
    setValueText(String(campaign.promotionValue))
    setErrorText(null)
  }

  const value = Number(valueText)
  const valueValid = valueText.trim().length > 0 && Number.isFinite(value) && value >= 0
  const datesOrdered = form.startDate.trim().length === 0 || form.endDate.trim().length === 0 || form.startDate <= form.endDate
  const canSubmit = form.name.trim().length > 0 && valueValid && datesOrdered

  function field(key: 'name' | 'startDate' | 'endDate') {
    return (next: string) => setForm((current) => ({ ...current, [key]: next }))
  }

  function save() {
    if (!campaign || !canSubmit) return
    setErrorText(null)
    mutation.mutate(
      { campaignId: campaign.id, request: { ...form, promotionValue: value } },
      { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Update failed')) },
    )
  }

  return (
    <Modal
      open={campaign !== null}
      onClose={onClose}
      title="Edit campaign"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!canSubmit} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={form.name} onChange={(event) => field('name')(event.target.value)} />
        <TextField
          label="Promotion value"
          type="number"
          inputMode="decimal"
          value={valueText}
          onChange={(event) => setValueText(event.target.value)}
          errorText={valueText.trim().length > 0 && !valueValid ? 'Enter a non-negative number' : undefined}
        />
        <TextField label="Start date" type="date" value={form.startDate} onChange={(event) => field('startDate')(event.target.value)} />
        <TextField
          label="End date"
          type="date"
          value={form.endDate}
          onChange={(event) => field('endDate')(event.target.value)}
          errorText={!datesOrdered ? 'End date must be on or after the start date' : undefined}
        />
        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
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
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch, isFetching } = useMerchantTransactions(merchantId, page)
  const [voiding, setVoiding] = useState<AdminTransaction | null>(null)
  const rows = data ?? []
  const columns: SimpleColumn<AdminTransaction>[] = [
    { header: 'When', render: (txn) => <span className="text-slate-500">{formatDate(txn.occurredAt)}</span> },
    { header: 'Type', render: (txn) => <span className="text-slate-600">{humanize(txn.transactionType)}</span> },
    { header: 'Amount', render: (txn) => <span className="mono text-slate-700">{formatNumber(txn.amount)}</span> },
    { header: 'Earned', render: (txn) => <span className="mono text-emerald-700">+{formatNumber(txn.pointsEarned)}</span> },
    { header: 'Redeemed', render: (txn) => <span className="mono text-slate-700">{formatNumber(txn.pointsRedeemed)}</span> },
    { header: 'Status', render: (txn) => <StatusPill tone={transactionTone(txn.status)}>{humanize(txn.status)}</StatusPill> },
  ]
  if (canManage) {
    columns.push({
      header: 'Actions',
      align: 'right',
      render: (txn) =>
        txn.status === 'VOIDED' ? (
          <span className="text-xs text-slate-400">Voided</span>
        ) : (
          <Button variant="ghost" icon={<Ban className="size-4" aria-hidden />} onClick={() => setVoiding(txn)} className="h-8 px-2 text-red-600">
            Void
          </Button>
        ),
    })
  }
  return (
    <TabGate isLoading={isLoading} isError={isError} error={error} isEmpty={rows.length === 0 && page === 0} emptyIcon={<Receipt className="size-7" aria-hidden />} emptyTitle="No transactions" onRetry={() => refetch()}>
      <div className="space-y-4">
        <SimpleTable<AdminTransaction> rows={rows} getKey={(txn) => txn.id} columns={columns} />
        <Pagination page={page} hasNextPage={rows.length === ledgerPageSize} isFetching={isFetching} onChange={setPage} />
      </div>
      <TransactionVoidDialog merchantId={merchantId} transaction={voiding} onClose={() => setVoiding(null)} />
    </TabGate>
  )
}

function TransactionVoidDialog({ merchantId, transaction, onClose }: { merchantId: string; transaction: AdminTransaction | null; onClose: () => void }) {
  const mutation = useVoidTransaction(merchantId)
  const [reason, setReason] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (transaction && transaction.id !== seededId) {
    setSeededId(transaction.id)
    setReason('')
    setErrorText(null)
  }

  const alreadyVoided = mutation.isError && mutation.error instanceof ApiError && mutation.error.status === 409
  const canSubmit = reason.trim().length > 0

  function save() {
    if (!transaction || !canSubmit) return
    setErrorText(null)
    mutation.mutate(
      { transactionId: transaction.id, request: { reason: reason.trim() } },
      {
        onSuccess: onClose,
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setErrorText('This transaction has already been voided. The list will refresh to show its current status.')
            return
          }
          setErrorText(errorMessage(error, 'Void failed'))
        },
      },
    )
  }

  return (
    <Modal
      open={transaction !== null}
      onClose={onClose}
      title="Void transaction"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {alreadyVoided ? 'Close' : 'Cancel'}
          </Button>
          <Button variant="danger" isLoading={mutation.isPending} disabled={!canSubmit || alreadyVoided} onClick={save}>
            Void transaction
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-slate-600">
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50/70 p-3.5 text-red-700 ring-1 ring-inset ring-red-600/15">
          <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Voiding reverses this transaction&rsquo;s points through new <span className="font-semibold">compensating ledger entries</span> — the original records
            are never edited. This action cannot be undone.
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Why this transaction is being voided"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
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
