import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Ban,
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Gift,
  Megaphone,
  Pencil,
  Plus,
  Power,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
} from 'lucide-react'
import { useAdminAuth } from '../../auth/AdminAuthContext'
import { can } from '../../auth/permissions'
import {
  ledgerPageSize,
  useCreateProgram,
  useDeleteCampaign,
  useDeleteProgram,
  useDeleteReward,
  useMerchantApprovals,
  useMerchantBilling,
  useMerchantCampaigns,
  useMerchantLedger,
  useLoyaltySettings,
  useMerchantPrograms,
  useMerchantRewards,
  useMerchantTransactionDetail,
  useMerchantTransactions,
  useRenameProgram,
  useSetCampaignActive,
  useSetLoyaltySettingsEnabled,
  useSetProgramActive,
  useSetRewardActive,
  useVoidTransaction,
} from '../../api/merchants'
import { ApiError } from '../../lib/apiClient'
import { formatDate, formatMoney, formatNumber, humanize } from '../../lib/format'
import { Button, Card, ErrorState, MetricCard, Skeleton, StateBlock, StatusPill, Switch, TextField } from '../../components/ui/primitives'
import type { PillTone } from '../../components/ui/primitives'
import { ConfirmDialog, Modal } from '../../components/ui/Dialog'
import { SimpleTable } from '../../components/ui/SimpleTable'
import type { SimpleColumn } from '../../components/ui/SimpleTable'
import { DetailDrawer, DetailRow, DetailSection } from '../../components/ui/DetailDrawer'
import { PROGRAM_SCOPES, PROGRAM_TYPES } from '../../types/api'
import type {
  AdminApproval,
  AdminCampaign,
  AdminLedgerEntry,
  AdminProgram,
  AdminRewardSummary,
  AdminTransaction,
  BillingInvoice,
  CreateProgramRequest,
} from '../../types/api'
import {
  GiveawayFormDialog,
  LoyaltyPointsDialog,
  ProgramConfigDialog,
  ProgramTypeFields,
  RewardFormDialog,
  RewardInventoryDialog,
  StoreSelectField,
} from './MerchantDataForms'
import { programConfigError } from './programForm'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function programScheduleTone(status: string): PillTone {
  switch (status) {
    case 'LIVE':
      return 'success'
    case 'SCHEDULED':
      return 'info'
    case 'PAUSED':
      return 'warning'
    case 'COMPLETED':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function rewardStatusTone(status: string): PillTone {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'DISABLED':
      return 'neutral'
    case 'EXPIRED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function giveawayStatusTone(status: string): PillTone {
  switch (status) {
    case 'READY':
    case 'SENT':
      return 'success'
    case 'SCHEDULED':
      return 'info'
    case 'COMPLETED':
      return 'neutral'
    case 'EXPIRED':
    case 'DISABLED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function moderationTone(status: string): PillTone {
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

const GIVEAWAY_LIFECYCLE_LOCKED = new Set(['SENT', 'COMPLETED', 'EXPIRED'])

function CopyId({ value }: { value: string }) {
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
      <span className="mono text-xs text-slate-700">{value}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" aria-hidden />
      )}
    </button>
  )
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

function DataTabHeader({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {count !== undefined ? (
          <span className="mono rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{formatNumber(count)}</span>
        ) : null}
      </div>
      {action}
    </div>
  )
}

function chevronColumn<T>(): SimpleColumn<T> {
  return { header: '', align: 'right', render: () => <ChevronRight className="ml-auto size-4 text-slate-300" aria-hidden /> }
}

function PointsValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="mono text-sm font-medium text-slate-800">{value}</span>
    </div>
  )
}

function PointsSystemSection({ merchantId, canManage }: { merchantId: string; canManage: boolean }) {
  const { data, isLoading, isError, error, refetch } = useLoyaltySettings(merchantId)
  const setEnabled = useSetLoyaltySettingsEnabled(merchantId)
  const [editing, setEditing] = useState(false)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Coins className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Points system</h2>
            <p className="text-xs text-slate-400">Org-level loyalty points earning and redemption</p>
          </div>
        </div>
        {data && data.configured ? (
          <div className="flex items-center gap-3">
            <StatusPill tone={data.enabled ? 'success' : 'neutral'}>{data.enabled ? 'Enabled' : 'Disabled'}</StatusPill>
            {canManage ? (
              <Switch
                checked={data.enabled}
                disabled={setEnabled.isPending}
                onChange={(enabled) => setEnabled.mutate({ enabled })}
                label="Points system enabled"
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load points system'} onRetry={() => refetch()} />
        ) : !data || !data.configured ? (
          <StateBlock
            icon={<Coins className="size-6" aria-hidden />}
            title="No points system configured"
            subtitle="Set up org-level points to start earning and redemption."
            action={
              canManage ? (
                <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setEditing(true)}>
                  Set up points system
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <PointsValueRow label="Spend step amount" value={formatNumber(data.pointsSpendStepAmount)} />
              <PointsValueRow label="Points per step" value={formatNumber(data.pointsAwardedPerStep)} />
              <PointsValueRow label="Points per currency unit" value={formatNumber(data.pointsPerCurrencyUnit)} />
              <PointsValueRow label="Minimum redeem" value={formatNumber(data.pointsMinimumRedeem)} />
              <PointsValueRow label="Welcome bonus" value={formatNumber(data.pointsWelcomeBonus)} />
              <PointsValueRow label="Expiry" value={data.pointsExpiryMonths === 0 ? 'Never expires' : `${formatNumber(data.pointsExpiryMonths)} months`} />
            </div>
            {canManage ? (
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <LoyaltyPointsDialog merchantId={merchantId} open={editing} settings={data ?? null} onClose={() => setEditing(false)} />
    </Card>
  )
}

export function ProgramsTab({ merchantId }: { merchantId: string }) {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useMerchantPrograms(merchantId)
  const setActive = useSetProgramActive(merchantId)
  const deleteProgram = useDeleteProgram(merchantId)
  const [renaming, setRenaming] = useState<AdminProgram | null>(null)
  const [configuring, setConfiguring] = useState<AdminProgram | null>(null)
  const [deleting, setDeleting] = useState<AdminProgram | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<AdminProgram | null>(null)
  const [creating, setCreating] = useState(false)
  const rows = data ?? []
  const columns: SimpleColumn<AdminProgram>[] = [
    { header: 'Name', render: (program) => <span className="font-medium text-slate-900">{program.name}</span> },
    { header: 'Type', render: (program) => <span className="text-slate-600">{humanize(program.type)}</span> },
    { header: 'Created', render: (program) => <span className="text-slate-500">{formatDate(program.createdAt)}</span> },
    {
      header: 'Schedule',
      render: (program) => <StatusPill tone={programScheduleTone(program.scheduleStatus)}>{humanize(program.scheduleStatus)}</StatusPill>,
    },
    {
      header: 'Enabled',
      render: (program) => <StatusPill tone={program.active ? 'success' : 'neutral'}>{program.active ? 'On' : 'Off'}</StatusPill>,
    },
    chevronColumn<AdminProgram>(),
  ]
  return (
    <div className="space-y-4">
      <PointsSystemSection merchantId={merchantId} canManage={canManage} />
      <DataTabHeader
        title="Programs"
        count={rows.length}
        action={
          canManage ? (
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)} className="h-9 px-3">
              Add program
            </Button>
          ) : undefined
        }
      />
      <TabGate
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={rows.length === 0}
        emptyIcon={<Tag className="size-7" aria-hidden />}
        emptyTitle="No programs"
        onRetry={() => refetch()}
      >
        <SimpleTable<AdminProgram> rows={rows} getKey={(program) => program.id} columns={columns} onRowClick={setViewing} />
        <DetailDrawer
          open={viewing !== null}
          onClose={() => setViewing(null)}
          title={viewing?.name ?? ''}
          subtitle={viewing ? humanize(viewing.type) : undefined}
          status={
            viewing ? (
              <>
                <StatusPill tone={programScheduleTone(viewing.scheduleStatus)}>{humanize(viewing.scheduleStatus)}</StatusPill>
                <StatusPill tone={viewing.active ? 'success' : 'neutral'}>{viewing.active ? 'Enabled' : 'Disabled'}</StatusPill>
              </>
            ) : undefined
          }
          actions={
            viewing && canManage ? (
              <>
                <Button
                  variant="secondary"
                  icon={<Trash2 className="size-4" aria-hidden />}
                  className="text-red-600"
                  onClick={() => {
                    setDeleteError(null)
                    setDeleting(viewing)
                    setViewing(null)
                  }}
                >
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  icon={<Power className="size-4" aria-hidden />}
                  className={viewing.active ? 'text-red-600' : 'text-brand-dark'}
                  isLoading={setActive.isPending}
                  onClick={() => setActive.mutate({ programId: viewing.id, active: !viewing.active })}
                >
                  {viewing.active ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  variant="secondary"
                  icon={<SlidersHorizontal className="size-4" aria-hidden />}
                  onClick={() => {
                    setConfiguring(viewing)
                    setViewing(null)
                  }}
                >
                  Configure
                </Button>
                <Button
                  icon={<Pencil className="size-4" aria-hidden />}
                  onClick={() => {
                    setRenaming(viewing)
                    setViewing(null)
                  }}
                >
                  Rename
                </Button>
              </>
            ) : undefined
          }
        >
          {viewing ? (
            <DetailSection title="Program">
              <DetailRow label="Name" value={viewing.name} />
              <DetailRow label="Type" value={humanize(viewing.type)} />
              <DetailRow label="Schedule" value={humanize(viewing.scheduleStatus)} />
              <DetailRow label="Currently active" value={viewing.isCurrentlyActive ? 'Yes' : 'No'} />
              <DetailRow label="Enabled" value={viewing.active ? 'Yes' : 'No'} />
              <DetailRow label="Created" value={formatDate(viewing.createdAt)} />
              <DetailRow label="Program ID" value={<CopyId value={viewing.id} />} />
            </DetailSection>
          ) : null}
        </DetailDrawer>
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
            deleteProgram.mutate(
              { programId: deleting.id },
              { onSuccess: () => setDeleting(null), onError: (err) => setDeleteError(errorMessage(err, 'Delete failed')) },
            )
          }}
          onClose={() => setDeleting(null)}
        />
      </TabGate>
      <ProgramCreateDialog merchantId={merchantId} open={creating} onClose={() => setCreating(false)} />
      <ProgramConfigDialog merchantId={merchantId} program={configuring} onClose={() => setConfiguring(null)} />
    </div>
  )
}

const EMPTY_PROGRAM_FORM: CreateProgramRequest = {
  name: '',
  description: '',
  type: 'DIGITAL_STAMP',
  scope: 'GLOBAL',
  active: true,
  tierSilverThreshold: 0,
  tierGoldThreshold: 0,
  tierVipThreshold: 0,
  tierThresholdBasis: 'POINTS',
  checkInVisitsRequired: 0,
  checkInRewardPoints: 0,
  checkInRewardName: '',
  purchaseFrequencyBasis: 'COUNT',
  purchaseFrequencyCount: 0,
  purchaseFrequencySpendTarget: 0,
  purchaseFrequencyWindowDays: 0,
  purchaseFrequencyRewardPoints: 0,
  referralReferrerRewardPoints: 0,
  referralRefereeRewardPoints: 0,
  referralCodePrefix: '',
  storeId: '',
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {humanize(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function ProgramCreateDialog({ merchantId, open, onClose }: { merchantId: string; open: boolean; onClose: () => void }) {
  const mutation = useCreateProgram(merchantId)
  const [form, setForm] = useState<CreateProgramRequest>(EMPTY_PROGRAM_FORM)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setForm(EMPTY_PROGRAM_FORM)
      setErrorText(null)
    }
  }

  function set<K extends keyof CreateProgramRequest>(key: K, value: CreateProgramRequest[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'type' && value === 'TIER') {
        next.scope = 'GLOBAL'
        next.storeId = ''
      }
      return next
    })
  }

  const isTier = form.type === 'TIER'
  const validation = programConfigError({ ...form, storeId: form.storeId || null })

  function save() {
    if (validation) {
      setErrorText(validation)
      return
    }
    setErrorText(null)
    const branchScoped = !isTier && form.scope === 'BRANCH'
    mutation.mutate(
      {
        ...form,
        name: form.name.trim(),
        referralCodePrefix: form.referralCodePrefix.trim(),
        scope: isTier ? 'GLOBAL' : form.scope,
        storeId: branchScoped ? form.storeId : '',
      },
      { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Create failed')) },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add program"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={validation !== null} onClick={save}>
            Create program
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={form.name} onChange={(event) => set('name', event.target.value)} />
        <TextField label="Description" value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Optional" />
        <SelectField label="Type" value={form.type} options={PROGRAM_TYPES} onChange={(value) => set('type', value)} />
        {isTier ? null : (
          <>
            <SelectField label="Scope" value={form.scope} options={PROGRAM_SCOPES} onChange={(value) => set('scope', value)} />
            {form.scope === 'BRANCH' ? (
              <StoreSelectField merchantId={merchantId} value={form.storeId} onChange={(value) => set('storeId', value)} />
            ) : null}
          </>
        )}

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Active on creation</span>
          <Switch checked={form.active} onChange={(checked) => set('active', checked)} />
        </div>

        <ProgramTypeFields form={form} set={set} numberMin={false} />

        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
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

function rewardInventoryLabel(reward: AdminRewardSummary): string {
  return reward.inventoryTracked ? `${formatNumber(reward.availableQuantity)} left` : 'Unlimited'
}

export function RewardsTab({ merchantId }: { merchantId: string }) {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useMerchantRewards(merchantId)
  const setActive = useSetRewardActive(merchantId)
  const deleteReward = useDeleteReward(merchantId)
  const [deleting, setDeleting] = useState<AdminRewardSummary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<AdminRewardSummary | null>(null)
  const [editing, setEditing] = useState<AdminRewardSummary | null>(null)
  const [adjusting, setAdjusting] = useState<AdminRewardSummary | null>(null)
  const [creating, setCreating] = useState(false)
  const rows = data ?? []
  const columns: SimpleColumn<AdminRewardSummary>[] = [
    {
      header: 'Reward',
      render: (reward) => (
        <div className="flex items-center gap-3">
          {reward.imageUri ? (
            <img src={reward.imageUri} alt="" className="size-9 shrink-0 rounded-lg border border-slate-200 object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <Gift className="size-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{reward.name}</p>
            <p className="text-xs text-slate-400">{humanize(reward.catalogType)}</p>
          </div>
        </div>
      ),
    },
    { header: 'Type', render: (reward) => <span className="text-slate-600">{humanize(reward.rewardType)}</span> },
    { header: 'Points', align: 'right', render: (reward) => <span className="mono text-slate-700">{formatNumber(reward.pointsRequired)}</span> },
    { header: 'Inventory', render: (reward) => <span className="text-slate-600">{rewardInventoryLabel(reward)}</span> },
    { header: 'Expires', render: (reward) => <span className="text-slate-500">{reward.expirationDate ? formatDate(reward.expirationDate) : 'Never'}</span> },
    { header: 'Status', render: (reward) => <StatusPill tone={rewardStatusTone(reward.status)}>{humanize(reward.status)}</StatusPill> },
    chevronColumn<AdminRewardSummary>(),
  ]
  return (
    <div className="space-y-4">
      <DataTabHeader
        title="Rewards"
        count={rows.length}
        action={
          canManage ? (
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)} className="h-9 px-3">
              Add reward
            </Button>
          ) : undefined
        }
      />
      <TabGate
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={rows.length === 0}
        emptyIcon={<Gift className="size-7" aria-hidden />}
        emptyTitle="No rewards"
        onRetry={() => refetch()}
      >
        <SimpleTable<AdminRewardSummary> rows={rows} getKey={(reward) => reward.id} columns={columns} onRowClick={setViewing} />
      </TabGate>
      <DetailDrawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        subtitle={viewing ? humanize(viewing.rewardType) : undefined}
        status={viewing ? <StatusPill tone={rewardStatusTone(viewing.status)}>{humanize(viewing.status)}</StatusPill> : undefined}
        actions={
          viewing && canManage ? (
            <>
              <Button
                variant="secondary"
                icon={<Trash2 className="size-4" aria-hidden />}
                className="text-red-600"
                onClick={() => {
                  setDeleteError(null)
                  setDeleting(viewing)
                  setViewing(null)
                }}
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                icon={<Power className="size-4" aria-hidden />}
                className={viewing.activeStatus ? 'text-red-600' : 'text-brand-dark'}
                isLoading={setActive.isPending}
                onClick={() => setActive.mutate({ rewardId: viewing.id, active: !viewing.activeStatus })}
              >
                {viewing.activeStatus ? 'Disable' : 'Enable'}
              </Button>
              <Button
                variant="secondary"
                icon={<Boxes className="size-4" aria-hidden />}
                onClick={() => {
                  setAdjusting(viewing)
                  setViewing(null)
                }}
              >
                Inventory
              </Button>
              <Button
                icon={<Pencil className="size-4" aria-hidden />}
                onClick={() => {
                  setEditing(viewing)
                  setViewing(null)
                }}
              >
                Edit
              </Button>
            </>
          ) : undefined
        }
      >
        {viewing ? (
          <>
            {viewing.imageUri ? (
              <img src={viewing.imageUri} alt={viewing.name} className="h-40 w-full rounded-xl border border-slate-200 object-cover" />
            ) : null}
            <DetailSection title="Reward">
              <DetailRow label="Name" value={viewing.name} />
              <DetailRow label="Description" value={viewing.description} />
              <DetailRow label="Type" value={humanize(viewing.rewardType)} />
              <DetailRow label="Catalog" value={humanize(viewing.catalogType)} />
              <DetailRow label="Points required" value={<span className="mono">{formatNumber(viewing.pointsRequired)}</span>} />
              <DetailRow label="Usage limit" value={<span className="mono">{formatNumber(viewing.usageLimit)}</span>} />
              <DetailRow label="Inventory tracked" value={viewing.inventoryTracked ? 'Yes' : 'No'} />
              <DetailRow label="Available" value={viewing.inventoryTracked ? <span className="mono">{formatNumber(viewing.availableQuantity)}</span> : 'Unlimited'} />
              <DetailRow label="Expires" value={viewing.expirationDate ? formatDate(viewing.expirationDate) : 'Never'} />
              <DetailRow label="Status" value={humanize(viewing.status)} />
              <DetailRow label="Scope" value={viewing.storeId ? 'Branch' : 'Global'} />
              {viewing.storeId ? <DetailRow label="Branch ID" value={<CopyId value={viewing.storeId} />} /> : null}
              <DetailRow label="Reward ID" value={<CopyId value={viewing.id} />} />
            </DetailSection>
          </>
        ) : null}
      </DetailDrawer>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete reward"
        description={
          <div className="flex flex-col gap-2">
            <span>
              Deletes the <span className="font-semibold text-slate-900">{deleting?.name}</span> reward. It stops being redeemable immediately. This action cannot be
              undone.
            </span>
            {deleteError ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</span> : null}
          </div>
        }
        confirmLabel="Delete reward"
        tone="danger"
        isLoading={deleteReward.isPending}
        onConfirm={() => {
          if (!deleting) return
          setDeleteError(null)
          deleteReward.mutate(
            { rewardId: deleting.id },
            { onSuccess: () => setDeleting(null), onError: (err) => setDeleteError(errorMessage(err, 'Delete failed')) },
          )
        }}
        onClose={() => setDeleting(null)}
      />
      <RewardFormDialog merchantId={merchantId} open={creating} reward={null} onClose={() => setCreating(false)} />
      <RewardFormDialog merchantId={merchantId} open={editing !== null} reward={editing} onClose={() => setEditing(null)} />
      <RewardInventoryDialog merchantId={merchantId} reward={adjusting} onClose={() => setAdjusting(null)} />
    </div>
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
  const [viewing, setViewing] = useState<AdminCampaign | null>(null)
  const [creating, setCreating] = useState(false)
  const rows = data ?? []
  const columns: SimpleColumn<AdminCampaign>[] = [
    { header: 'Name', render: (campaign) => <span className="font-medium text-slate-900">{campaign.name}</span> },
    { header: 'Reward', render: (campaign) => <span className="text-slate-600">{humanize(campaign.giveawayType || campaign.promotionType)}</span> },
    { header: 'Value', align: 'right', render: (campaign) => <span className="mono text-slate-700">{formatNumber(campaign.promotionValue)}</span> },
    { header: 'Window', render: (campaign) => <span className="text-slate-500">{`${formatDate(campaign.startDate)} → ${formatDate(campaign.endDate)}`}</span> },
    {
      header: 'Status',
      render: (campaign) => <StatusPill tone={giveawayStatusTone(campaign.giveawayStatus)}>{humanize(campaign.giveawayStatus)}</StatusPill>,
    },
    chevronColumn<AdminCampaign>(),
  ]
  return (
    <div className="space-y-4">
      <DataTabHeader
        title="Giveaways"
        count={rows.length}
        action={
          canManage ? (
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)} className="h-9 px-3">
              Add giveaway
            </Button>
          ) : undefined
        }
      />
      <TabGate
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={rows.length === 0}
        emptyIcon={<Megaphone className="size-7" aria-hidden />}
        emptyTitle="No giveaways"
        onRetry={() => refetch()}
      >
        <SimpleTable<AdminCampaign> rows={rows} getKey={(campaign) => campaign.id} columns={columns} onRowClick={setViewing} />
      </TabGate>
      <DetailDrawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        subtitle={viewing ? humanize(viewing.giveawayType || viewing.promotionType) : undefined}
        status={
          viewing ? (
            <>
              <StatusPill tone={giveawayStatusTone(viewing.giveawayStatus)}>{humanize(viewing.giveawayStatus)}</StatusPill>
              <StatusPill tone={moderationTone(viewing.moderationStatus)}>{humanize(viewing.moderationStatus)}</StatusPill>
            </>
          ) : undefined
        }
        actions={
          viewing && canManage ? (
            <>
              <Button
                variant="secondary"
                icon={<Trash2 className="size-4" aria-hidden />}
                className="text-red-600"
                onClick={() => {
                  setDeleteError(null)
                  setDeleting(viewing)
                  setViewing(null)
                }}
              >
                Delete
              </Button>
              {GIVEAWAY_LIFECYCLE_LOCKED.has(viewing.giveawayStatus) ? null : (
                <Button
                  variant="secondary"
                  icon={<Power className="size-4" aria-hidden />}
                  className={viewing.active ? 'text-red-600' : 'text-brand-dark'}
                  isLoading={setActive.isPending}
                  onClick={() => setActive.mutate({ campaignId: viewing.id, active: !viewing.active })}
                >
                  {viewing.active ? 'Disable' : 'Enable'}
                </Button>
              )}
              <Button
                icon={<Pencil className="size-4" aria-hidden />}
                onClick={() => {
                  setEditing(viewing)
                  setViewing(null)
                }}
              >
                Edit
              </Button>
            </>
          ) : undefined
        }
      >
        {viewing ? (
          <DetailSection title="Giveaway">
            <DetailRow label="Name" value={viewing.name} />
            <DetailRow label="Giveaway type" value={humanize(viewing.giveawayType || '—')} />
            <DetailRow label="Promotion type" value={humanize(viewing.promotionType)} />
            <DetailRow label="Value" value={<span className="mono">{formatNumber(viewing.promotionValue)}</span>} />
            <DetailRow label="Lifecycle" value={humanize(viewing.giveawayStatus)} />
            <DetailRow label="Moderation" value={humanize(viewing.moderationStatus)} />
            <DetailRow label="Enabled" value={viewing.active ? 'Yes' : 'No'} />
            <DetailRow label="Starts" value={formatDate(viewing.startDate)} />
            <DetailRow label="Ends" value={formatDate(viewing.endDate)} />
            <DetailRow label="Giveaway ID" value={<CopyId value={viewing.id} />} />
          </DetailSection>
        ) : null}
      </DetailDrawer>
      <GiveawayFormDialog merchantId={merchantId} open={creating} campaign={null} onClose={() => setCreating(false)} />
      <GiveawayFormDialog merchantId={merchantId} open={editing !== null} campaign={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete giveaway"
        description={
          <div className="flex flex-col gap-2">
            <span>
              Deletes the <span className="font-semibold text-slate-900">{deleting?.name}</span> giveaway. It stops applying immediately. This action cannot be
              undone.
            </span>
            {deleteError ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</span> : null}
          </div>
        }
        confirmLabel="Delete giveaway"
        tone="danger"
        isLoading={deleteCampaign.isPending}
        onConfirm={() => {
          if (!deleting) return
          setDeleteError(null)
          deleteCampaign.mutate(
            { campaignId: deleting.id },
            { onSuccess: () => setDeleting(null), onError: (err) => setDeleteError(errorMessage(err, 'Delete failed')) },
          )
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
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

function TransactionDetailDrawer({
  merchantId,
  transactionId,
  fallbackTitle,
  onClose,
  onVoid,
}: {
  merchantId: string
  transactionId: string | null
  fallbackTitle?: string
  onClose: () => void
  onVoid?: (transactionId: string) => void
}) {
  const { data, isLoading, isError, error } = useMerchantTransactionDetail(merchantId, transactionId)
  const open = transactionId !== null
  const title = data ? humanize(data.transactionType) : fallbackTitle ?? 'Transaction'
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={data ? `${data.storeName || 'Store'} · ${formatDate(data.occurredAt)}` : undefined}
      status={data ? <StatusPill tone={transactionTone(data.status)}>{humanize(data.status)}</StatusPill> : undefined}
      actions={
        data && onVoid && data.status !== 'VOIDED' ? (
          <Button variant="secondary" icon={<Ban className="size-4" aria-hidden />} className="text-red-600" onClick={() => onVoid(data.id)}>
            Void transaction
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load transaction'} />
      ) : data ? (
        <>
          <DetailSection title="Parties">
            <DetailRow label="Customer" value={data.customerDisplayName || '—'} />
            <DetailRow label="Cashier" value={data.staffDisplayName || '—'} />
            <DetailRow label="Store" value={data.storeName || '—'} />
          </DetailSection>
          <DetailSection title="Amounts">
            <DetailRow label="Amount" value={<span className="mono">{formatMoney(data.amount, data.currencyCode)}</span>} />
            <DetailRow label="Points earned" value={<span className="mono text-emerald-700">+{formatNumber(data.pointsEarned)}</span>} />
            <DetailRow label="Engagement points" value={<span className="mono text-emerald-700">+{formatNumber(data.engagementPointsEarned)}</span>} />
            <DetailRow label="Points redeemed" value={<span className="mono">{formatNumber(data.pointsRedeemed)}</span>} />
          </DetailSection>
          <DetailSection title="Record">
            <DetailRow label="Type" value={humanize(data.transactionType)} />
            <DetailRow label="Status" value={humanize(data.status)} />
            {data.summary ? <DetailRow label="Summary" value={data.summary} /> : null}
            <DetailRow label="Occurred" value={formatDate(data.occurredAt)} />
            <DetailRow label="Completed" value={data.completedAt ? formatDate(data.completedAt) : '—'} />
            {data.originalTransactionId ? <DetailRow label="Voids transaction" value={<CopyId value={data.originalTransactionId} />} /> : null}
            <DetailRow label="Customer ID" value={<CopyId value={data.customerId} />} />
            <DetailRow label="Transaction ID" value={<CopyId value={data.id} />} />
          </DetailSection>
          <section>
            <h3 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Line items</h3>
            {data.items.length === 0 ? (
              <p className="rounded-xl border border-slate-200/70 bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-card">No line items recorded</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-card">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/70 bg-slate-50/60 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2 text-left font-semibold">Item</th>
                      <th className="px-3 py-2 text-right font-semibold">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold">Unit</th>
                      <th className="px-3 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-800">{item.title}</p>
                          {item.sku ? <p className="mono text-[0.7rem] text-slate-400">{item.sku}</p> : null}
                        </td>
                        <td className="mono px-3 py-2.5 text-right text-slate-600">{formatNumber(item.quantity)}</td>
                        <td className="mono px-3 py-2.5 text-right text-slate-600">{formatMoney(item.unitPrice, data.currencyCode)}</td>
                        <td className="mono px-3 py-2.5 text-right font-medium text-slate-800">{formatMoney(item.lineTotal, data.currencyCode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </DetailDrawer>
  )
}

export function TransactionsTab({ merchantId }: { merchantId: string }) {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch, isFetching } = useMerchantTransactions(merchantId, page)
  const [voiding, setVoiding] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const rows = data ?? []
  const columns: SimpleColumn<AdminTransaction>[] = [
    {
      header: 'Customer',
      render: (txn) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">{txn.customerDisplayName || 'Unknown customer'}</span>
          <span className="text-xs text-slate-400">{txn.storeName || 'Unknown store'}</span>
        </div>
      ),
    },
    { header: 'Cashier', render: (txn) => <span className="text-slate-600">{txn.staffDisplayName || '—'}</span> },
    { header: 'Type', render: (txn) => <span className="text-slate-600">{humanize(txn.transactionType)}</span> },
    { header: 'Amount', align: 'right', render: (txn) => <span className="mono text-slate-700">{formatMoney(txn.amount, txn.currencyCode)}</span> },
    { header: 'Earned', align: 'right', render: (txn) => <span className="mono text-emerald-700">+{formatNumber(txn.pointsEarned)}</span> },
    { header: 'Redeemed', align: 'right', render: (txn) => <span className="mono text-slate-700">{formatNumber(txn.pointsRedeemed)}</span> },
    { header: 'Status', render: (txn) => <StatusPill tone={transactionTone(txn.status)}>{humanize(txn.status)}</StatusPill> },
    { header: 'When', render: (txn) => <span className="text-slate-500">{formatDate(txn.occurredAt)}</span> },
    chevronColumn<AdminTransaction>(),
  ]
  return (
    <TabGate
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={rows.length === 0 && page === 0}
      emptyIcon={<Receipt className="size-7" aria-hidden />}
      emptyTitle="No transactions"
      onRetry={() => refetch()}
    >
      <div className="space-y-4">
        <SimpleTable<AdminTransaction> rows={rows} getKey={(txn) => txn.id} columns={columns} onRowClick={(txn) => setViewingId(txn.id)} />
        <Pagination page={page} hasNextPage={rows.length === ledgerPageSize} isFetching={isFetching} onChange={setPage} />
      </div>
      <TransactionDetailDrawer
        merchantId={merchantId}
        transactionId={viewingId}
        onClose={() => setViewingId(null)}
        onVoid={
          canManage
            ? (transactionId) => {
                setViewingId(null)
                setVoiding(transactionId)
              }
            : undefined
        }
      />
      <TransactionVoidDialog merchantId={merchantId} transactionId={voiding} onClose={() => setVoiding(null)} />
    </TabGate>
  )
}

function TransactionVoidDialog({ merchantId, transactionId, onClose }: { merchantId: string; transactionId: string | null; onClose: () => void }) {
  const mutation = useVoidTransaction(merchantId)
  const [reason, setReason] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (transactionId && transactionId !== seededId) {
    setSeededId(transactionId)
    setReason('')
    setErrorText(null)
  }

  const alreadyVoided = mutation.isError && mutation.error instanceof ApiError && mutation.error.status === 409
  const canSubmit = reason.trim().length > 0

  function save() {
    if (!transactionId || !canSubmit) return
    setErrorText(null)
    mutation.mutate(
      { transactionId, request: { reason: reason.trim() } },
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
      open={transactionId !== null}
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
  const [viewingId, setViewingId] = useState<string | null>(null)
  const rows = data ?? []
  const columns: SimpleColumn<AdminLedgerEntry>[] = [
    { header: 'Customer', render: (entry) => <span className="font-medium text-slate-800">{entry.customerDisplayName || 'Unknown customer'}</span> },
    { header: 'When', render: (entry) => <span className="text-slate-500">{formatDate(entry.createdAt)}</span> },
    { header: 'Entry', render: (entry) => <span className="text-slate-600">{humanize(entry.entryType)}</span> },
    {
      header: 'Delta',
      align: 'right',
      render: (entry) => (
        <span className={`mono ${entry.pointsDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {entry.pointsDelta >= 0 ? '+' : ''}
          {formatNumber(entry.pointsDelta)}
        </span>
      ),
    },
    { header: 'Balance', align: 'right', render: (entry) => <span className="mono text-slate-700">{formatNumber(entry.balanceAfter)}</span> },
    { header: 'Reason', render: (entry) => <span className="mono text-xs text-slate-400">{entry.reasonCode}</span> },
    {
      header: '',
      align: 'right',
      render: (entry) => (entry.transactionId ? <ChevronRight className="ml-auto size-4 text-slate-300" aria-hidden /> : null),
    },
  ]
  return (
    <TabGate
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={rows.length === 0 && page === 0}
      emptyIcon={<BookOpen className="size-7" aria-hidden />}
      emptyTitle="No ledger entries"
      onRetry={() => refetch()}
    >
      <div className="space-y-4">
        <SimpleTable<AdminLedgerEntry>
          rows={rows}
          getKey={(entry) => entry.id}
          columns={columns}
          onRowClick={(entry) => {
            if (entry.transactionId) setViewingId(entry.transactionId)
          }}
        />
        <Pagination page={page} hasNextPage={rows.length === ledgerPageSize} isFetching={isFetching} onChange={setPage} />
      </div>
      <TransactionDetailDrawer merchantId={merchantId} transactionId={viewingId} onClose={() => setViewingId(null)} />
    </TabGate>
  )
}

export function ApprovalsTab({ merchantId }: { merchantId: string }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch, isFetching } = useMerchantApprovals(merchantId, page)
  const [viewing, setViewing] = useState<AdminApproval | null>(null)
  const rows = data ?? []
  const columns: SimpleColumn<AdminApproval>[] = [
    { header: 'Requested', render: (row) => <span className="text-slate-500">{formatDate(row.createdAt)}</span> },
    { header: 'Type', render: (row) => <span className="text-slate-700">{humanize(row.requestType)}</span> },
    { header: 'Reason', render: (row) => <span className="text-slate-500">{row.reasonText || '—'}</span> },
    { header: 'Expires', render: (row) => <span className="text-slate-500">{row.expiresAt ? formatDate(row.expiresAt) : '—'}</span> },
    { header: 'Status', render: (row) => <StatusPill tone={approvalTone(row.status)}>{humanize(row.status)}</StatusPill> },
    chevronColumn<AdminApproval>(),
  ]
  return (
    <TabGate
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={rows.length === 0 && page === 0}
      emptyIcon={<ShieldCheck className="size-7" aria-hidden />}
      emptyTitle="No approval requests"
      onRetry={() => refetch()}
    >
      <div className="space-y-4">
        <SimpleTable<AdminApproval> rows={rows} getKey={(row) => row.id} columns={columns} onRowClick={setViewing} />
        <Pagination page={page} hasNextPage={rows.length === ledgerPageSize} isFetching={isFetching} onChange={setPage} />
      </div>
      <DetailDrawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? humanize(viewing.requestType) : ''}
        subtitle={viewing ? `Requested ${formatDate(viewing.createdAt)}` : undefined}
        status={viewing ? <StatusPill tone={approvalTone(viewing.status)}>{humanize(viewing.status)}</StatusPill> : undefined}
      >
        {viewing ? (
          <DetailSection title="Approval request">
            <DetailRow label="Type" value={humanize(viewing.requestType)} />
            <DetailRow label="Status" value={humanize(viewing.status)} />
            <DetailRow label="Reason" value={viewing.reasonText || '—'} />
            <DetailRow label="Requested" value={formatDate(viewing.createdAt)} />
            <DetailRow label="Expires" value={viewing.expiresAt ? formatDate(viewing.expiresAt) : '—'} />
            <DetailRow label="Request ID" value={<CopyId value={viewing.id} />} />
          </DetailSection>
        ) : null}
      </DetailDrawer>
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
        <MetricCard
          label="Monthly price"
          value={data.summary.currentMonthlyPrice !== null ? formatMoney(data.summary.currentMonthlyPrice, currency) : '—'}
          hint={data.summary.nextRenewalDate ? `renews ${formatDate(data.summary.nextRenewalDate)}` : undefined}
        />
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
