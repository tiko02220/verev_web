import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CircleCheck,
  Coins,
  Copy,
  Eye,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Power,
  Receipt,
  Search,
  ShieldAlert,
  ShieldX,
  Store,
  Tag,
  Trash2,
  Users,
  UsersRound,
} from 'lucide-react'
import {
  customersPageSize,
  useAdjustCustomerPoints,
  useCreateStaff,
  useCreateStore,
  useDeleteMerchant,
  useDeleteStaff,
  useDeleteStore,
  useMerchant,
  useMerchantCustomers,
  useMerchantOverview,
  useMerchantStaff,
  useMerchantStores,
  useResetStaffPassword,
  useSetCustomerBlocked,
  useSetStaffActive,
  useSetStoreActive,
  useUpdateAccessState,
  useUpdateCustomer,
  useUpdateMerchantProfile,
  useUpdateStaffRole,
  useUpdateStore,
} from '../api/merchants'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import { useDebounce } from '../lib/useDebounce'
import { accessStateTone, formatDate, formatNumber, humanize, orgStatusTone } from '../lib/format'
import { Button, Card, ErrorState, MetricCard, Skeleton, StateBlock, StatusPill, TextField } from '../components/ui/primitives'
import type { PillTone } from '../components/ui/primitives'
import { ConfirmDialog, Modal } from '../components/ui/Dialog'
import { SimpleTable } from '../components/ui/SimpleTable'
import type { SimpleColumn } from '../components/ui/SimpleTable'
import { ProgramsTab, CampaignsTab, TransactionsTab, LedgerTab, BillingTab, ApprovalsTab } from './merchant/MerchantDataTabs'
import { ApiError } from '../lib/apiClient'
import { STAFF_ROLES } from '../types/api'
import type {
  AdminCustomer,
  AdminStaff,
  AdminStore,
  CreateStaffRequest,
  CreateStoreRequest,
  DeletionMode,
  MerchantDetail,
  OrganizationAccessState,
  PointsAdjustmentRequest,
  UpdateCustomerRequest,
  UpdateProfileRequest,
  UpdateStoreRequest,
} from '../types/api'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'stores', label: 'Stores' },
  { key: 'staff', label: 'Staff' },
  { key: 'customers', label: 'Customers' },
  { key: 'programs', label: 'Programs' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'billing', label: 'Billing' },
] as const

export function MerchantDetailPage() {
  const { merchantId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'overview'
  const merchantQuery = useMerchant(merchantId)

  if (merchantQuery.isError) {
    return (
      <div className="p-6 sm:p-8">
        <BackLink />
        <ErrorState
          message={merchantQuery.error instanceof Error ? merchantQuery.error.message : 'Failed to load merchant'}
          onRetry={() => merchantQuery.refetch()}
        />
      </div>
    )
  }

  const merchant = merchantQuery.data

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-canvas/85 px-6 pt-5 backdrop-blur-md sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <BackLink />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {merchant ? (
                <>
                  <h1 className="text-xl font-semibold tracking-tight text-ink">{merchant.displayName}</h1>
                  <StatusPill tone={orgStatusTone(merchant.status)}>{humanize(merchant.status)}</StatusPill>
                  <StatusPill tone={accessStateTone(merchant.accessState)}>{humanize(merchant.accessState)}</StatusPill>
                </>
              ) : (
                <Skeleton className="h-7 w-48" />
              )}
            </div>
            {merchant ? <p className="mono mt-1 text-sm text-slate-400">{merchant.slug}</p> : null}
          </div>
        </div>

        <nav className="admin-scroll mt-4 flex gap-1 overflow-x-auto" aria-label="Merchant sections">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSearchParams({ tab: item.key })}
              className={`-mb-px shrink-0 cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === item.key ? 'border-brand text-brand-dark' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="admin-rise p-6 sm:p-8">
        {tab === 'stores' ? (
          <StoresTab merchantId={merchantId} />
        ) : tab === 'staff' ? (
          <StaffTab merchantId={merchantId} />
        ) : tab === 'customers' ? (
          <CustomersTab merchantId={merchantId} />
        ) : tab === 'programs' ? (
          <ProgramsTab merchantId={merchantId} />
        ) : tab === 'campaigns' ? (
          <CampaignsTab merchantId={merchantId} />
        ) : tab === 'transactions' ? (
          <TransactionsTab merchantId={merchantId} />
        ) : tab === 'ledger' ? (
          <LedgerTab merchantId={merchantId} />
        ) : tab === 'approvals' ? (
          <ApprovalsTab merchantId={merchantId} />
        ) : tab === 'billing' ? (
          <BillingTab merchantId={merchantId} />
        ) : (
          <OverviewTab merchantId={merchantId} merchant={merchant} />
        )}
      </div>
    </>
  )
}

function BackLink() {
  return (
    <Link to="/admin/merchants" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="size-4" aria-hidden />
      Merchants
    </Link>
  )
}

interface AccessStateMeta {
  label: string
  tone: PillTone
  icon: typeof CircleCheck
  login: string
  writes: string
}

const ACCESS_STATE_META: Record<OrganizationAccessState, AccessStateMeta> = {
  ACTIVE: {
    label: 'Active',
    tone: 'success',
    icon: CircleCheck,
    login: 'Owner and staff can log in',
    writes: 'Full access — can make changes',
  },
  READ_ONLY_GRACE: {
    label: 'Read-only',
    tone: 'warning',
    icon: Eye,
    login: 'Owner and staff can log in',
    writes: 'Cannot make any changes',
  },
  SUSPENDED: {
    label: 'Suspended',
    tone: 'danger',
    icon: Lock,
    login: 'All login blocked',
    writes: 'All access blocked',
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'neutral',
    icon: Ban,
    login: 'Account closed',
    writes: 'Closed — irreversible',
  },
}

interface AccessAction {
  target: OrganizationAccessState
  label: string
  icon: typeof CircleCheck
  buttonClass: string
  confirmTitle: string
  confirmLabel: string
  confirmTone: 'primary' | 'danger'
  effect: ReactNode
}

function availableActions(current: OrganizationAccessState): AccessAction[] {
  const actions: AccessAction[] = []

  if (current !== 'ACTIVE' && current !== 'CANCELLED') {
    actions.push({
      target: 'ACTIVE',
      label: 'Restore to active',
      icon: CircleCheck,
      buttonClass: 'text-emerald-700',
      confirmTitle: 'Restore merchant to active',
      confirmLabel: 'Restore to active',
      confirmTone: 'primary',
      effect: (
        <span>
          Restores <span className="font-semibold text-slate-900">full access</span>. Owner and staff can log in and make changes again. Takes effect
          immediately.
        </span>
      ),
    })
  }

  if (current !== 'READ_ONLY_GRACE' && current !== 'CANCELLED') {
    actions.push({
      target: 'READ_ONLY_GRACE',
      label: 'Set read-only',
      icon: Eye,
      buttonClass: 'text-amber-700',
      confirmTitle: 'Set merchant to read-only',
      confirmLabel: 'Set read-only',
      confirmTone: 'primary',
      effect: (
        <span>
          Owner and staff can still log in but <span className="font-semibold text-slate-900">cannot make any changes</span>. Useful as a grace period before
          suspending. Takes effect immediately.
        </span>
      ),
    })
  }

  if (current !== 'SUSPENDED' && current !== 'CANCELLED') {
    actions.push({
      target: 'SUSPENDED',
      label: 'Suspend merchant',
      icon: Lock,
      buttonClass: 'text-red-600',
      confirmTitle: 'Suspend merchant',
      confirmLabel: 'Suspend merchant',
      confirmTone: 'danger',
      effect: (
        <span>
          Blocks <span className="font-semibold text-slate-900">all staff and owner login and access</span> — none of them can log in or perform any action
          until you restore the merchant. Takes effect immediately.
        </span>
      ),
    })
  }

  if (current !== 'CANCELLED') {
    actions.push({
      target: 'CANCELLED',
      label: 'Cancel account',
      icon: Ban,
      buttonClass: 'text-slate-700',
      confirmTitle: 'Cancel merchant account',
      confirmLabel: 'Cancel account',
      confirmTone: 'danger',
      effect: (
        <span>
          Marks the account <span className="font-semibold text-slate-900">closed</span>. This is a terminal lifecycle state and is not reversible from here.
        </span>
      ),
    })
  }

  return actions
}

function LifecycleCard({ merchantId, accessState }: { merchantId: string; accessState: OrganizationAccessState }) {
  const { admin } = useAdminAuth()
  const mutation = useUpdateAccessState(merchantId)
  const [pending, setPending] = useState<AccessAction | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  const canManage = admin ? can(admin.role, 'merchants.suspend') : false
  const current = ACCESS_STATE_META[accessState]
  const CurrentIcon = current.icon

  function apply(action: AccessAction, reason?: string) {
    setErrorText(null)
    mutation.mutate(
      { accessState: action.target, reasonText: reason || undefined },
      {
        onSuccess: () => setPending(null),
        onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Action failed'),
      },
    )
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Access &amp; lifecycle</h2>
          <p className="mt-1 text-sm text-slate-500">Controls whether this merchant’s owner and staff can log in and make changes.</p>
        </div>
        <StatusPill tone={current.tone}>{current.label}</StatusPill>
      </div>

      <div className={`mt-4 flex items-start gap-3 rounded-xl p-4 ring-1 ring-inset ${ACCESS_BANNER[accessState]}`}>
        <CurrentIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-slate-900">Currently {current.label.toLowerCase()}</p>
          <ul className="mt-1.5 space-y-1 text-slate-600">
            <li>
              <span className="font-medium text-slate-700">Login:</span> {current.login}
            </li>
            <li>
              <span className="font-medium text-slate-700">Changes:</span> {current.writes}
            </li>
          </ul>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACCESS_STATE_ORDER.map((state) => {
          const meta = ACCESS_STATE_META[state]
          const Icon = meta.icon
          const isCurrent = state === accessState
          return (
            <div
              key={state}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${isCurrent ? 'border-brand/40 bg-brand-soft/40' : 'border-slate-200'}`}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
              <div className="text-xs">
                <dt className="font-semibold text-slate-800">{meta.label}</dt>
                <dd className="mt-0.5 text-slate-500">{ACCESS_STATE_BLURB[state]}</dd>
              </div>
            </div>
          )
        })}
      </dl>

      {canManage ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {availableActions(accessState).map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.target}
                variant="secondary"
                icon={<Icon className="size-4" aria-hidden />}
                className={action.buttonClass}
                disabled={mutation.isPending}
                onClick={() => {
                  setErrorText(null)
                  setPending(action)
                }}
              >
                {action.label}
              </Button>
            )
          })}
        </div>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.confirmTitle ?? ''}
        description={
          <div className="flex flex-col gap-2">
            {pending?.effect}
            {errorText ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</span> : null}
          </div>
        }
        confirmLabel={pending?.confirmLabel ?? 'Confirm'}
        tone={pending?.confirmTone ?? 'primary'}
        withReason
        isLoading={mutation.isPending}
        onConfirm={(reason) => {
          if (pending) apply(pending, reason)
        }}
        onClose={() => setPending(null)}
      />
    </Card>
  )
}

const ACCESS_STATE_ORDER: ReadonlyArray<OrganizationAccessState> = ['ACTIVE', 'READ_ONLY_GRACE', 'SUSPENDED', 'CANCELLED']

const ACCESS_STATE_BLURB: Record<OrganizationAccessState, string> = {
  ACTIVE: 'Full access to log in and make changes.',
  READ_ONLY_GRACE: 'Can log in, cannot make changes.',
  SUSPENDED: 'Login and all access blocked — this is “disable the merchant”.',
  CANCELLED: 'Account closed. Terminal and irreversible.',
}

const ACCESS_BANNER: Record<OrganizationAccessState, string> = {
  ACTIVE: 'bg-emerald-50/70 text-emerald-700 ring-emerald-600/10',
  READ_ONLY_GRACE: 'bg-amber-50/70 text-amber-700 ring-amber-600/10',
  SUSPENDED: 'bg-red-50/70 text-red-700 ring-red-600/10',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-500/10',
}

function OverviewTab({ merchantId, merchant }: { merchantId: string; merchant: MerchantDetail | undefined }) {
  const overviewQuery = useMerchantOverview(merchantId)

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {overviewQuery.isError ? (
          <div className="col-span-full">
            <ErrorState
              message={overviewQuery.error instanceof Error ? overviewQuery.error.message : 'Failed to load overview'}
              onRetry={() => overviewQuery.refetch()}
            />
          </div>
        ) : overviewQuery.isLoading || !overviewQuery.data ? (
          Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24" />)
        ) : (
          <>
            <MetricCard label="Stores" value={formatNumber(overviewQuery.data.storeCount)} icon={<Store className="size-4" aria-hidden />} />
            <MetricCard label="Staff" value={formatNumber(overviewQuery.data.staffCount)} icon={<Users className="size-4" aria-hidden />} />
            <MetricCard label="Customers" value={formatNumber(overviewQuery.data.customerCount)} icon={<UsersRound className="size-4" aria-hidden />} />
            <MetricCard label="Programs" value={formatNumber(overviewQuery.data.activeProgramCount)} icon={<Tag className="size-4" aria-hidden />} hint="active" />
            <MetricCard label="Campaigns" value={formatNumber(overviewQuery.data.activeCampaignCount)} icon={<Tag className="size-4" aria-hidden />} hint="active" />
            <MetricCard label="Transactions" value={formatNumber(overviewQuery.data.transactionCount)} icon={<Receipt className="size-4" aria-hidden />} />
          </>
        )}
      </section>

      {overviewQuery.data ? (
        <MetricCard
          label="Points outstanding"
          value={formatNumber(overviewQuery.data.pointsOutstanding)}
          icon={<Coins className="size-4" aria-hidden />}
          hint="across all customers"
        />
      ) : null}

      {merchant ? <LifecycleCard merchantId={merchantId} accessState={merchant.accessState as OrganizationAccessState} /> : null}
      <ProfileCard merchantId={merchantId} merchant={merchant} />
      {merchant ? <DangerZone merchant={merchant} /> : null}
    </div>
  )
}

const ANONYMIZE_KEPT = ['Financial ledgers and points history', 'Transaction and settlement records', 'Audit trail of platform actions']
const ANONYMIZE_DESTROYED = ['Personal and identifying details (names, emails, phones)', 'Branding and uploaded media']
const PURGE_KEPT = ['Nothing — every record is removed']
const PURGE_DESTROYED = [
  'All ledgers, points history, and transactions',
  'Every store, staff member, and customer',
  'All programs, campaigns, and settings',
  'All identity and billing records',
]

function KeptDestroyed({ kept, destroyed }: { kept: string[]; destroyed: string[] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CircleCheck className="size-3.5" aria-hidden />
          Kept
        </p>
        <ul className="space-y-1 text-xs text-slate-600">
          {kept.map((item) => (
            <li key={item} className="flex gap-1.5">
              <span className="text-emerald-500" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-700">
          <ShieldX className="size-3.5" aria-hidden />
          Destroyed
        </p>
        <ul className="space-y-1 text-xs text-slate-600">
          {destroyed.map((item) => (
            <li key={item} className="flex gap-1.5">
              <span className="text-red-500" aria-hidden>
                ✕
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DangerZone({ merchant }: { merchant: MerchantDetail }) {
  const { admin } = useAdminAuth()
  const navigate = useNavigate()
  const mutation = useDeleteMerchant(merchant.organizationId)
  const [mode, setMode] = useState<DeletionMode | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  if (!admin || !can(admin.role, 'merchants.delete')) return null

  function runDelete() {
    if (!mode) return
    setErrorText(null)
    mutation.mutate(
      { mode, confirmation: merchant.slug },
      {
        onSuccess: () => {
          setMode(null)
          navigate('/admin/merchants', { replace: true })
        },
        onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Delete failed'),
      },
    )
  }

  const isRaw = mode === 'RAW_PURGE'

  return (
    <Card className="border-red-200 p-5">
      <div className="flex items-center gap-2">
        <ShieldX className="size-4 text-red-600" aria-hidden />
        <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">Deletion is restricted to platform owners and cannot be performed by other roles.</p>

      <div className="mt-4 flex flex-col gap-4">
        <section className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Anonymize &amp; deactivate</p>
              <p className="mt-0.5 text-xs text-slate-500">Scrubs personal data, keeps the financial record, and cancels the account. Recommended.</p>
            </div>
            <Button variant="secondary" className="text-red-600" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setMode('ANONYMIZE')}>
              Anonymize
            </Button>
          </div>
          <KeptDestroyed kept={ANONYMIZE_KEPT} destroyed={ANONYMIZE_DESTROYED} />
        </section>

        <section className="rounded-xl border-2 border-red-300 bg-red-50/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <ShieldX className="size-4" aria-hidden />
                Raw purge
              </p>
              <p className="mt-0.5 text-xs font-medium text-red-700/90">Permanently deletes ALL of this merchant’s data. Irreversible.</p>
            </div>
            <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setMode('RAW_PURGE')}>
              Raw purge
            </Button>
          </div>
          <KeptDestroyed kept={PURGE_KEPT} destroyed={PURGE_DESTROYED} />
        </section>
      </div>

      <ConfirmDialog
        open={mode !== null}
        title={isRaw ? 'Permanently purge merchant' : 'Anonymize merchant'}
        description={
          <div className="flex flex-col gap-3">
            <span>
              {isRaw
                ? 'This permanently deletes every record for this merchant, including financial ledgers. This action cannot be undone.'
                : 'This scrubs the merchant’s personal and identifying data and cancels all access. Financial ledgers and history are retained for the record.'}
            </span>
            <KeptDestroyed kept={isRaw ? PURGE_KEPT : ANONYMIZE_KEPT} destroyed={isRaw ? PURGE_DESTROYED : ANONYMIZE_DESTROYED} />
            {errorText ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</span> : null}
          </div>
        }
        confirmLabel={isRaw ? 'Purge everything' : 'Anonymize'}
        tone="danger"
        confirmPhrase={merchant.slug}
        isLoading={mutation.isPending}
        onConfirm={runDelete}
        onClose={() => setMode(null)}
      />
    </Card>
  )
}

const PROFILE_FIELDS: ReadonlyArray<{ label: string; key: keyof MerchantDetail }> = [
  { label: 'Legal name', key: 'legalName' },
  { label: 'Industry', key: 'industry' },
  { label: 'Email', key: 'email' },
  { label: 'Phone', key: 'phone' },
  { label: 'Currency', key: 'defaultCurrencyCode' },
  { label: 'Timezone', key: 'defaultTimezone' },
  { label: 'Plan', key: 'planCode' },
]

function ProfileCard({ merchantId, merchant }: { merchantId: string; merchant: MerchantDetail | undefined }) {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const [editing, setEditing] = useState(false)
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        {canManage && merchant ? (
          <Button variant="secondary" icon={<Pencil className="size-4" aria-hidden />} className="h-8 px-2.5" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{field.label}</dt>
            <dd className="text-sm text-slate-800">{merchant ? merchant[field.key] || '—' : <Skeleton className="h-4 w-32" />}</dd>
          </div>
        ))}
      </dl>
      {merchant ? <ProfileEditDialog merchantId={merchantId} merchant={merchant} open={editing} onClose={() => setEditing(false)} /> : null}
    </Card>
  )
}

function toProfileForm(merchant: MerchantDetail): UpdateProfileRequest {
  return {
    legalName: merchant.legalName,
    displayName: merchant.displayName,
    industry: merchant.industry,
    email: merchant.email,
    phone: merchant.phone,
    defaultCurrencyCode: merchant.defaultCurrencyCode,
    defaultTimezone: merchant.defaultTimezone,
  }
}

const PROFILE_EDIT_FIELDS: ReadonlyArray<{ label: string; key: keyof UpdateProfileRequest }> = [
  { label: 'Legal name', key: 'legalName' },
  { label: 'Display name', key: 'displayName' },
  { label: 'Industry', key: 'industry' },
  { label: 'Email', key: 'email' },
  { label: 'Phone', key: 'phone' },
  { label: 'Currency', key: 'defaultCurrencyCode' },
  { label: 'Timezone', key: 'defaultTimezone' },
]

function ProfileEditDialog({ merchantId, merchant, open, onClose }: { merchantId: string; merchant: MerchantDetail; open: boolean; onClose: () => void }) {
  const mutation = useUpdateMerchantProfile(merchantId)
  const [form, setForm] = useState<UpdateProfileRequest>(() => toProfileForm(merchant))
  const [errorText, setErrorText] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setForm(toProfileForm(merchant))
      setErrorText(null)
    }
  }

  function save() {
    setErrorText(null)
    mutation.mutate(form, { onSuccess: onClose, onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Update failed') })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit merchant profile"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!form.legalName.trim() || !form.displayName.trim()} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {PROFILE_EDIT_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={form[field.key]}
            onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        ))}
        {errorText ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

function activeTone(active: boolean) {
  return active ? ('success' as const) : ('neutral' as const)
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function TableHeader({ title, action }: { title: string; action: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
  )
}

function TemporaryPasswordDialog({ open, title, password, onClose }: { open: boolean; title: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(password).then(
      () => setCopied(true),
      () => setCopied(false),
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button onClick={onClose}>Done</Button>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-slate-600">
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50/70 p-3.5 text-amber-800 ring-1 ring-inset ring-amber-600/15">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            This temporary password is shown <span className="font-semibold">once</span>. Copy it now and share it securely — it cannot be retrieved again.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="mono flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900">{password}</code>
          <Button variant="secondary" icon={<Copy className="size-4" aria-hidden />} onClick={copy} className="h-10 px-3 shrink-0">
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function StoresTab({ merchantId }: { merchantId: string }) {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useMerchantStores(merchantId)
  const setActive = useSetStoreActive(merchantId)
  const deleteStore = useDeleteStore(merchantId)
  const [editing, setEditing] = useState<AdminStore | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<AdminStore | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const addButton = canManage ? (
    <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)} className="h-9 px-3">
      Add store
    </Button>
  ) : null

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load stores'} onRetry={() => refetch()} />

  const columns: SimpleColumn<AdminStore>[] = [
    { header: 'Name', render: (store) => <span className="font-medium text-slate-900">{store.name}</span> },
    { header: 'Category', render: (store) => <span className="text-slate-600">{store.category || '—'}</span> },
    { header: 'Status', render: (store) => <StatusPill tone={activeTone(store.active)}>{store.active ? 'Active' : 'Inactive'}</StatusPill> },
  ]
  if (canManage) {
    columns.push({
      header: 'Actions',
      align: 'right',
      render: (store) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setEditing(store)} className="h-8 px-2">
            Edit
          </Button>
          <Button
            variant="ghost"
            icon={<Power className="size-4" aria-hidden />}
            isLoading={setActive.isPending && setActive.variables?.storeId === store.id}
            onClick={() => setActive.mutate({ storeId: store.id, active: !store.active })}
            className={`h-8 px-2 ${store.active ? 'text-red-600' : 'text-brand-dark'}`}
          >
            {store.active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="ghost"
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => {
              setDeleteError(null)
              setDeleting(store)
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
    <div className="space-y-4">
      <TableHeader title="Stores" action={addButton} />
      {!data || data.length === 0 ? (
        <StateBlock icon={<Store className="size-7" aria-hidden />} title="No stores" action={addButton ?? undefined} />
      ) : (
        <SimpleTable<AdminStore> rows={data} getKey={(store) => store.id} columns={columns} />
      )}
      <StoreEditDialog merchantId={merchantId} store={editing} onClose={() => setEditing(null)} />
      <StoreCreateDialog merchantId={merchantId} open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete store"
        description={
          <div className="flex flex-col gap-2">
            <span>
              Deletes <span className="font-semibold text-slate-900">{deleting?.name}</span>. If the store has transaction or settlement history it is archived
              instead of permanently removed. This action cannot be undone.
            </span>
            {deleteError ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</span> : null}
          </div>
        }
        confirmLabel="Delete store"
        tone="danger"
        isLoading={deleteStore.isPending}
        onConfirm={() => {
          if (!deleting) return
          setDeleteError(null)
          deleteStore.mutate(
            { storeId: deleting.id },
            { onSuccess: () => setDeleting(null), onError: (err) => setDeleteError(errorMessage(err, 'Delete failed')) },
          )
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

const EMPTY_STORE_FORM: CreateStoreRequest = { name: '', address: '', contactInfo: '', category: '', workingHours: '' }

function StoreCreateDialog({ merchantId, open, onClose }: { merchantId: string; open: boolean; onClose: () => void }) {
  const mutation = useCreateStore(merchantId)
  const [form, setForm] = useState<CreateStoreRequest>(EMPTY_STORE_FORM)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setForm(EMPTY_STORE_FORM)
      setErrorText(null)
    }
  }

  function field(key: keyof CreateStoreRequest) {
    return (value: string) => setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    setErrorText(null)
    mutation.mutate(form, { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Create failed')) })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add store"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!form.name.trim()} onClick={save}>
            Create store
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={form.name} onChange={(event) => field('name')(event.target.value)} />
        <TextField label="Category" value={form.category} onChange={(event) => field('category')(event.target.value)} />
        <TextField label="Address" value={form.address} onChange={(event) => field('address')(event.target.value)} />
        <TextField label="Contact info" value={form.contactInfo} onChange={(event) => field('contactInfo')(event.target.value)} />
        <TextField label="Working hours" value={form.workingHours} onChange={(event) => field('workingHours')(event.target.value)} />
        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

function StoreEditDialog({ merchantId, store, onClose }: { merchantId: string; store: AdminStore | null; onClose: () => void }) {
  const mutation = useUpdateStore(merchantId)
  const [form, setForm] = useState<UpdateStoreRequest>({ name: '', address: '', contactInfo: '', category: '', workingHours: '' })
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (store && store.id !== seededId) {
    setSeededId(store.id)
    setForm({ name: store.name, address: store.address, contactInfo: store.contactInfo, category: store.category, workingHours: store.workingHours })
    setErrorText(null)
  }

  function field(key: keyof UpdateStoreRequest) {
    return (value: string) => setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    if (!store) return
    setErrorText(null)
    mutation.mutate(
      { storeId: store.id, request: form },
      { onSuccess: onClose, onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Update failed') },
    )
  }

  return (
    <Modal
      open={store !== null}
      onClose={onClose}
      title="Edit store"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!form.name.trim()} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={form.name} onChange={(event) => field('name')(event.target.value)} />
        <TextField label="Category" value={form.category} onChange={(event) => field('category')(event.target.value)} />
        <TextField label="Address" value={form.address} onChange={(event) => field('address')(event.target.value)} />
        <TextField label="Contact info" value={form.contactInfo} onChange={(event) => field('contactInfo')(event.target.value)} />
        <TextField label="Working hours" value={form.workingHours} onChange={(event) => field('workingHours')(event.target.value)} />
        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

function StaffTab({ merchantId }: { merchantId: string }) {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useMerchantStaff(merchantId)
  const setActive = useSetStaffActive(merchantId)
  const deleteStaff = useDeleteStaff(merchantId)
  const resetPassword = useResetStaffPassword(merchantId)
  const [editingRole, setEditingRole] = useState<AdminStaff | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<AdminStaff | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [resetting, setResetting] = useState<AdminStaff | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null)

  const addButton = canManage ? (
    <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)} className="h-9 px-3">
      Add staff
    </Button>
  ) : null

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load staff'} onRetry={() => refetch()} />

  const columns: SimpleColumn<AdminStaff>[] = [
    {
      header: 'Name',
      render: (member) => <span className="font-medium text-slate-900">{`${member.firstName} ${member.lastName}`.trim() || '—'}</span>,
    },
    { header: 'Email', render: (member) => <span className="text-slate-600">{member.email}</span> },
    { header: 'Role', render: (member) => <span className="text-slate-600">{humanize(member.role)}</span> },
    { header: 'Status', render: (member) => <StatusPill tone={activeTone(member.active)}>{member.active ? 'Active' : 'Inactive'}</StatusPill> },
  ]
  if (canManage) {
    columns.push({
      header: 'Actions',
      align: 'right',
      render: (member) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setEditingRole(member)} className="h-8 px-2">
            Role
          </Button>
          <Button
            variant="ghost"
            icon={<KeyRound className="size-4" aria-hidden />}
            onClick={() => {
              setResetError(null)
              setResetting(member)
            }}
            className="h-8 px-2 text-slate-600"
          >
            Reset password
          </Button>
          <Button
            variant="ghost"
            icon={<Power className="size-4" aria-hidden />}
            isLoading={setActive.isPending && setActive.variables?.staffId === member.id}
            onClick={() => setActive.mutate({ staffId: member.id, active: !member.active })}
            className={`h-8 px-2 ${member.active ? 'text-red-600' : 'text-brand-dark'}`}
          >
            {member.active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="ghost"
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => {
              setDeleteError(null)
              setDeleting(member)
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
    <div className="space-y-4">
      <TableHeader title="Staff" action={addButton} />
      {!data || data.length === 0 ? (
        <StateBlock icon={<Users className="size-7" aria-hidden />} title="No staff" action={addButton ?? undefined} />
      ) : (
        <SimpleTable<AdminStaff> rows={data} getKey={(member) => member.id} columns={columns} />
      )}
      <StaffRoleDialog merchantId={merchantId} member={editingRole} onClose={() => setEditingRole(null)} />
      <StaffCreateDialog merchantId={merchantId} open={creating} onClose={() => setCreating(false)} onCreated={(password) => setRevealedPassword(password)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete staff member"
        description={
          <div className="flex flex-col gap-2">
            <span>
              Removes <span className="font-semibold text-slate-900">{deleting ? `${deleting.firstName} ${deleting.lastName}`.trim() || deleting.email : ''}</span>{' '}
              from this merchant. The owner cannot be deleted, and members with recorded activity may be archived instead. This action cannot be undone.
            </span>
            {deleteError ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</span> : null}
          </div>
        }
        confirmLabel="Delete staff"
        tone="danger"
        isLoading={deleteStaff.isPending}
        onConfirm={() => {
          if (!deleting) return
          setDeleteError(null)
          deleteStaff.mutate(
            { staffId: deleting.id },
            { onSuccess: () => setDeleting(null), onError: (err) => setDeleteError(errorMessage(err, 'Delete failed')) },
          )
        }}
        onClose={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={resetting !== null}
        title="Reset staff password"
        description={
          <div className="flex flex-col gap-2">
            <span>
              Generates a new temporary password for{' '}
              <span className="font-semibold text-slate-900">{resetting ? `${resetting.firstName} ${resetting.lastName}`.trim() || resetting.email : ''}</span>. Their
              current password stops working immediately. The new password is shown only once.
            </span>
            {resetError ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{resetError}</span> : null}
          </div>
        }
        confirmLabel="Reset password"
        tone="primary"
        isLoading={resetPassword.isPending}
        onConfirm={() => {
          if (!resetting) return
          setResetError(null)
          resetPassword.mutate(
            { staffId: resetting.id },
            {
              onSuccess: (result) => {
                setResetting(null)
                setRevealedPassword(result.temporaryPassword)
              },
              onError: (err) => setResetError(errorMessage(err, 'Reset failed')),
            },
          )
        }}
        onClose={() => setResetting(null)}
      />
      <TemporaryPasswordDialog
        open={revealedPassword !== null}
        title="Temporary password"
        password={revealedPassword ?? ''}
        onClose={() => setRevealedPassword(null)}
      />
    </div>
  )
}

const EMPTY_STAFF_FORM: CreateStaffRequest = { firstName: '', lastName: '', email: '', role: 'CASHIER' }

function StaffCreateDialog({ merchantId, open, onClose, onCreated }: { merchantId: string; open: boolean; onClose: () => void; onCreated: (password: string) => void }) {
  const mutation = useCreateStaff(merchantId)
  const [form, setForm] = useState<CreateStaffRequest>(EMPTY_STAFF_FORM)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setForm(EMPTY_STAFF_FORM)
      setErrorText(null)
    }
  }

  const emailValid = isValidEmail(form.email)
  const canSubmit = form.firstName.trim().length > 0 && emailValid

  function field(key: keyof CreateStaffRequest) {
    return (value: string) => setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    setErrorText(null)
    mutation.mutate(form, {
      onSuccess: (result) => {
        onClose()
        onCreated(result.temporaryPassword)
      },
      onError: (error) => setErrorText(errorMessage(error, 'Create failed')),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add staff member"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!canSubmit} onClick={save}>
            Create staff
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="First name" value={form.firstName} onChange={(event) => field('firstName')(event.target.value)} />
        <TextField label="Last name" value={form.lastName} onChange={(event) => field('lastName')(event.target.value)} />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => field('email')(event.target.value)}
          errorText={form.email.trim().length > 0 && !emailValid ? 'Enter a valid email address' : undefined}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Role</span>
          <select
            value={form.role}
            onChange={(event) => field('role')(event.target.value)}
            className="h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {STAFF_ROLES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
        </label>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">A temporary password will be generated and shown once after the member is created.</p>
        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

function StaffRoleDialog({ merchantId, member, onClose }: { merchantId: string; member: AdminStaff | null; onClose: () => void }) {
  const mutation = useUpdateStaffRole(merchantId)
  const [role, setRole] = useState<string>('STAFF')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (member && member.id !== seededId) {
    setSeededId(member.id)
    setRole(member.role)
    setErrorText(null)
  }

  function save() {
    if (!member) return
    setErrorText(null)
    mutation.mutate(
      { staffId: member.id, role },
      { onSuccess: onClose, onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Update failed') },
    )
  }

  return (
    <Modal
      open={member !== null}
      onClose={onClose}
      title="Change role"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Role</span>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          {STAFF_ROLES.map((value) => (
            <option key={value} value={value}>
              {humanize(value)}
            </option>
          ))}
        </select>
      </label>
      {errorText ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
    </Modal>
  )
}

function customerStatusTone(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'success' as const
    case 'BLOCKED':
      return 'danger' as const
    default:
      return 'neutral' as const
  }
}

function CustomersTab({ merchantId }: { merchantId: string }) {
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const search = useDebounce(searchInput, 300)
  const { data, isLoading, isError, error, refetch, isFetching } = useMerchantCustomers(merchantId, search.trim(), page)

  function onSearchChange(value: string) {
    setSearchInput(value)
    setPage(0)
  }

  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const setBlocked = useSetCustomerBlocked(merchantId)
  const [editing, setEditing] = useState<AdminCustomer | null>(null)
  const [adjusting, setAdjusting] = useState<AdminCustomer | null>(null)
  const rows = data ?? []
  const hasNextPage = rows.length === customersPageSize

  const columns: SimpleColumn<AdminCustomer>[] = [
    {
      header: 'Customer',
      render: (customer) => (
        <div>
          <span className="font-medium text-slate-900">{`${customer.firstName} ${customer.lastName}`.trim() || '—'}</span>
          <span className="mono block text-xs text-slate-400">{customer.loyaltyId}</span>
        </div>
      ),
    },
    { header: 'Phone', render: (customer) => <span className="mono text-slate-600">{customer.phoneNumber}</span> },
    { header: 'Tier', render: (customer) => <span className="text-slate-600">{customer.loyaltyTier}</span> },
    { header: 'Points', align: 'right', render: (customer) => <span className="mono text-slate-700">{formatNumber(customer.currentPoints)}</span> },
    { header: 'Visits', align: 'right', render: (customer) => <span className="mono text-slate-700">{formatNumber(customer.totalVisits)}</span> },
    { header: 'Last visit', render: (customer) => <span className="text-slate-500">{customer.lastVisitAt ? formatDate(customer.lastVisitAt) : '—'}</span> },
    { header: 'Status', render: (customer) => <StatusPill tone={customerStatusTone(customer.status)}>{humanize(customer.status)}</StatusPill> },
  ]
  if (canManage) {
    columns.push({
      header: 'Actions',
      align: 'right',
      render: (customer) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setEditing(customer)} className="h-8 px-2">
            Edit
          </Button>
          <Button variant="ghost" icon={<Coins className="size-4" aria-hidden />} onClick={() => setAdjusting(customer)} className="h-8 px-2 text-brand-dark">
            Adjust points
          </Button>
          <Button
            variant="ghost"
            icon={<Power className="size-4" aria-hidden />}
            isLoading={setBlocked.isPending && setBlocked.variables?.customerId === customer.customerId}
            onClick={() => setBlocked.mutate({ customerId: customer.customerId, blocked: customer.status !== 'BLOCKED' })}
            className={`h-8 px-2 ${customer.status === 'BLOCKED' ? 'text-brand-dark' : 'text-red-600'}`}
          >
            {customer.status === 'BLOCKED' ? 'Unblock' : 'Block'}
          </Button>
        </div>
      ),
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, phone, email, ID"
          aria-label="Search customers"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load customers'} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <StateBlock icon={<UsersRound className="size-7" aria-hidden />} title="No customers" subtitle={search ? 'Try a different search.' : undefined} />
      ) : (
        <>
          <SimpleTable<AdminCustomer> rows={rows} getKey={(customer) => customer.customerId} columns={columns} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{isFetching ? 'Loading…' : `Page ${page + 1}`}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 0 || isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                Previous
              </Button>
              <Button variant="secondary" disabled={!hasNextPage || isFetching} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
      <CustomerEditDialog merchantId={merchantId} customer={editing} onClose={() => setEditing(null)} />
      <CustomerPointsDialog merchantId={merchantId} customer={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  )
}

function CustomerEditDialog({ merchantId, customer, onClose }: { merchantId: string; customer: AdminCustomer | null; onClose: () => void }) {
  const mutation = useUpdateCustomer(merchantId)
  const [form, setForm] = useState<UpdateCustomerRequest>({ firstName: '', lastName: '', email: '', phoneNumber: '' })
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (customer && customer.customerId !== seededId) {
    setSeededId(customer.customerId)
    setForm({ firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phoneNumber: customer.phoneNumber })
    setErrorText(null)
  }

  const emailValid = form.email.trim().length === 0 || isValidEmail(form.email)
  const canSubmit = form.firstName.trim().length > 0 && emailValid

  function field(key: keyof UpdateCustomerRequest) {
    return (value: string) => setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    if (!customer) return
    setErrorText(null)
    mutation.mutate(
      { customerId: customer.customerId, request: form },
      { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Update failed')) },
    )
  }

  return (
    <Modal
      open={customer !== null}
      onClose={onClose}
      title="Edit customer"
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
        <TextField label="First name" value={form.firstName} onChange={(event) => field('firstName')(event.target.value)} />
        <TextField label="Last name" value={form.lastName} onChange={(event) => field('lastName')(event.target.value)} />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => field('email')(event.target.value)}
          errorText={!emailValid ? 'Enter a valid email address' : undefined}
        />
        <TextField label="Phone number" value={form.phoneNumber} onChange={(event) => field('phoneNumber')(event.target.value)} />
        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

function CustomerPointsDialog({ merchantId, customer, onClose }: { merchantId: string; customer: AdminCustomer | null; onClose: () => void }) {
  const mutation = useAdjustCustomerPoints(merchantId)
  const [deltaText, setDeltaText] = useState('')
  const [reason, setReason] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (customer && customer.customerId !== seededId) {
    setSeededId(customer.customerId)
    setDeltaText('')
    setReason('')
    setErrorText(null)
  }

  const delta = Number.parseInt(deltaText, 10)
  const deltaValid = Number.isInteger(delta) && delta !== 0
  const canSubmit = deltaValid && reason.trim().length > 0

  function save() {
    if (!customer || !canSubmit) return
    setErrorText(null)
    const request: PointsAdjustmentRequest = { pointsDelta: delta, reason: reason.trim() }
    mutation.mutate(
      { customerId: customer.customerId, request },
      { onSuccess: onClose, onError: (error) => setErrorText(errorMessage(error, 'Adjustment failed')) },
    )
  }

  return (
    <Modal
      open={customer !== null}
      onClose={onClose}
      title="Adjust points"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!canSubmit} onClick={save}>
            Apply adjustment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-slate-600">
        <div className="flex items-start gap-2.5 rounded-xl bg-sky-50/70 p-3.5 text-sky-800 ring-1 ring-inset ring-sky-600/15">
          <Coins className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            This writes a new <span className="font-semibold">compensating ledger entry</span> — it never edits past history. Use a positive number to grant points,
            a negative number to deduct. Current balance: <span className="mono font-semibold">{customer ? formatNumber(customer.currentPoints) : '—'}</span>.
          </p>
        </div>
        <TextField
          label="Points delta"
          type="number"
          inputMode="numeric"
          placeholder="e.g. 500 or -200"
          value={deltaText}
          onChange={(event) => setDeltaText(event.target.value)}
          errorText={deltaText.trim().length > 0 && !deltaValid ? 'Enter a non-zero whole number' : undefined}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Why this adjustment is being made"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

