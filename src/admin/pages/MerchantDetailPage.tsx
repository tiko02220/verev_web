import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Coins, Pencil, Power, Receipt, Search, Store, Tag, Trash2, Users, UsersRound } from 'lucide-react'
import {
  customersPageSize,
  useDeleteMerchant,
  useMerchant,
  useMerchantCustomers,
  useMerchantOverview,
  useMerchantStaff,
  useMerchantStores,
  useSetStaffActive,
  useSetStoreActive,
  useUpdateAccessState,
  useUpdateStaffRole,
  useUpdateStore,
} from '../api/merchants'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import { useDebounce } from '../lib/useDebounce'
import { accessStateTone, formatDate, formatNumber, humanize, orgStatusTone } from '../lib/format'
import { Button, Card, ErrorState, MetricCard, Skeleton, StateBlock, StatusPill, TextField } from '../components/ui/primitives'
import { ConfirmDialog, Modal } from '../components/ui/Dialog'
import { SimpleTable } from '../components/ui/SimpleTable'
import type { SimpleColumn } from '../components/ui/SimpleTable'
import { ProgramsTab, CampaignsTab, TransactionsTab, LedgerTab } from './merchant/MerchantDataTabs'
import { ApiError } from '../lib/apiClient'
import { STAFF_ROLES } from '../types/api'
import type { AdminCustomer, AdminStaff, AdminStore, DeletionMode, MerchantDetail, OrganizationAccessState, UpdateStoreRequest } from '../types/api'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'stores', label: 'Stores' },
  { key: 'staff', label: 'Staff' },
  { key: 'customers', label: 'Customers' },
  { key: 'programs', label: 'Programs' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'ledger', label: 'Ledger' },
] as const

export function MerchantDetailPage() {
  const { merchantId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'overview'
  const merchantQuery = useMerchant(merchantId)

  if (merchantQuery.isError) {
    return (
      <div className="p-6">
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
      <header className="border-b border-slate-200 bg-white px-6 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <BackLink />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {merchant ? (
                <>
                  <h1 className="text-xl font-semibold text-slate-900">{merchant.displayName}</h1>
                  <StatusPill tone={orgStatusTone(merchant.status)}>{humanize(merchant.status)}</StatusPill>
                  <StatusPill tone={accessStateTone(merchant.accessState)}>{humanize(merchant.accessState)}</StatusPill>
                </>
              ) : (
                <Skeleton className="h-7 w-48" />
              )}
            </div>
            {merchant ? <p className="mono mt-1 text-sm text-slate-400">{merchant.slug}</p> : null}
          </div>
          {merchant ? <LifecycleActions merchantId={merchantId} accessState={merchant.accessState as OrganizationAccessState} /> : null}
        </div>

        <nav className="mt-4 flex gap-1" aria-label="Merchant sections">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSearchParams({ tab: item.key })}
              className={`cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === item.key ? 'border-brand text-brand-dark' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="p-6">
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

interface LifecycleAction {
  label: string
  accessState: OrganizationAccessState
  tone: 'primary' | 'danger'
}

function actionsFor(accessState: OrganizationAccessState): LifecycleAction[] {
  switch (accessState) {
    case 'ACTIVE':
      return [
        { label: 'Set read-only', accessState: 'READ_ONLY_GRACE', tone: 'primary' },
        { label: 'Suspend', accessState: 'SUSPENDED', tone: 'danger' },
        { label: 'Cancel', accessState: 'CANCELLED', tone: 'danger' },
      ]
    case 'READ_ONLY_GRACE':
      return [
        { label: 'Reactivate', accessState: 'ACTIVE', tone: 'primary' },
        { label: 'Suspend', accessState: 'SUSPENDED', tone: 'danger' },
        { label: 'Cancel', accessState: 'CANCELLED', tone: 'danger' },
      ]
    case 'SUSPENDED':
      return [
        { label: 'Reactivate', accessState: 'ACTIVE', tone: 'primary' },
        { label: 'Cancel', accessState: 'CANCELLED', tone: 'danger' },
      ]
    case 'CANCELLED':
      return [{ label: 'Reactivate', accessState: 'ACTIVE', tone: 'primary' }]
    default:
      return []
  }
}

function LifecycleActions({ merchantId, accessState }: { merchantId: string; accessState: OrganizationAccessState }) {
  const { admin } = useAdminAuth()
  const mutation = useUpdateAccessState(merchantId)
  const [pending, setPending] = useState<LifecycleAction | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  if (!admin || !can(admin.role, 'merchants.suspend')) return null

  function confirm(reason: string) {
    if (!pending) return
    setErrorText(null)
    mutation.mutate(
      { accessState: pending.accessState, reasonText: reason || undefined },
      {
        onSuccess: () => setPending(null),
        onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Action failed'),
      },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actionsFor(accessState).map((action) => (
        <Button
          key={action.accessState}
          variant={action.tone === 'danger' ? 'secondary' : 'primary'}
          className={action.tone === 'danger' ? 'text-red-600' : ''}
          onClick={() => {
            setErrorText(null)
            setPending(action)
          }}
        >
          {action.label}
        </Button>
      ))}
      <ConfirmDialog
        open={pending !== null}
        title={`${pending?.label ?? ''} merchant`}
        description={
          <div className="flex flex-col gap-2">
            <span>
              Set access to <span className="font-semibold text-slate-900">{pending ? humanize(pending.accessState) : ''}</span>? This takes effect
              immediately.
            </span>
            {errorText ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</span> : null}
          </div>
        }
        confirmLabel={pending?.label ?? 'Confirm'}
        tone={pending?.tone}
        withReason
        isLoading={mutation.isPending}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </div>
  )
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

      <ProfileCard merchant={merchant} />
      {merchant ? <DangerZone merchant={merchant} /> : null}
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
      <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
      <p className="mt-1 text-sm text-slate-500">Deletion is restricted to platform owners and cannot be performed by other roles.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900">Anonymize &amp; deactivate</p>
          <p className="mt-0.5 text-xs text-slate-500">Scrubs identity, cancels all access, keeps financial ledgers intact. Recommended.</p>
          <Button variant="secondary" className="mt-3 text-red-600" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setMode('ANONYMIZE')}>
            Anonymize
          </Button>
        </div>
        <div className="flex-1 rounded-lg border border-red-200 bg-red-50/40 p-4">
          <p className="text-sm font-medium text-red-700">Raw purge</p>
          <p className="mt-0.5 text-xs text-slate-500">Permanently deletes every record including ledgers. Irreversible.</p>
          <Button variant="danger" className="mt-3" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setMode('RAW_PURGE')}>
            Raw purge
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={mode !== null}
        title={isRaw ? 'Permanently purge merchant' : 'Anonymize merchant'}
        description={
          <div className="flex flex-col gap-2">
            <span>
              {isRaw
                ? 'This permanently deletes every record for this merchant, including financial ledgers. This action cannot be undone.'
                : 'This scrubs the merchant’s identity and cancels all access. Financial ledgers are retained for the record.'}
            </span>
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

function ProfileCard({ merchant }: { merchant: MerchantDetail | undefined }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Profile</h2>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{field.label}</dt>
            <dd className="text-sm text-slate-800">{merchant ? merchant[field.key] || '—' : <Skeleton className="h-4 w-32" />}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function activeTone(active: boolean) {
  return active ? ('success' as const) : ('neutral' as const)
}

function StoresTab({ merchantId }: { merchantId: string }) {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useMerchantStores(merchantId)
  const setActive = useSetStoreActive(merchantId)
  const [editing, setEditing] = useState<AdminStore | null>(null)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load stores'} onRetry={() => refetch()} />
  if (!data || data.length === 0) return <StateBlock icon={<Store className="size-7" aria-hidden />} title="No stores" />

  const columns: SimpleColumn<AdminStore>[] = [
    { header: 'Name', render: (store) => <span className="font-medium text-slate-900">{store.name}</span> },
    { header: 'Category', render: (store) => <span className="text-slate-600">{store.category || '—'}</span> },
    { header: 'Status', render: (store) => <StatusPill tone={activeTone(store.active)}>{store.active ? 'Active' : 'Inactive'}</StatusPill> },
  ]
  if (canManage) {
    columns.push({
      header: 'Actions',
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
        </div>
      ),
    })
  }

  return (
    <>
      <SimpleTable<AdminStore> rows={data} getKey={(store) => store.id} columns={columns} />
      <StoreEditDialog merchantId={merchantId} store={editing} onClose={() => setEditing(null)} />
    </>
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
  const [editingRole, setEditingRole] = useState<AdminStaff | null>(null)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load staff'} onRetry={() => refetch()} />
  if (!data || data.length === 0) return <StateBlock icon={<Users className="size-7" aria-hidden />} title="No staff" />

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
      render: (member) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setEditingRole(member)} className="h-8 px-2">
            Role
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
        </div>
      ),
    })
  }

  return (
    <>
      <SimpleTable<AdminStaff> rows={data} getKey={(member) => member.id} columns={columns} />
      <StaffRoleDialog merchantId={merchantId} member={editingRole} onClose={() => setEditingRole(null)} />
    </>
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

  const rows = data ?? []
  const hasNextPage = rows.length === customersPageSize

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
          <SimpleTable<AdminCustomer>
            rows={rows}
            getKey={(customer) => customer.customerId}
            columns={[
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
              { header: 'Points', render: (customer) => <span className="mono text-slate-700">{formatNumber(customer.currentPoints)}</span> },
              { header: 'Visits', render: (customer) => <span className="mono text-slate-700">{formatNumber(customer.totalVisits)}</span> },
              { header: 'Last visit', render: (customer) => <span className="text-slate-500">{customer.lastVisitAt ? formatDate(customer.lastVisitAt) : '—'}</span> },
              { header: 'Status', render: (customer) => <StatusPill tone={customerStatusTone(customer.status)}>{humanize(customer.status)}</StatusPill> },
            ]}
          />
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
    </div>
  )
}

