import { useState } from 'react'
import { Power, ShieldPlus, UserCog } from 'lucide-react'
import { useAdmins, useCreateAdmin, useSetAdminStatus, useUpdateAdminRole } from '../api/platform'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import { formatDate, humanize } from '../lib/format'
import { Button, ErrorState, PageHeader, Skeleton, StateBlock, StatusPill, TextField } from '../components/ui/primitives'
import type { PillTone } from '../components/ui/primitives'
import { SimpleTable } from '../components/ui/SimpleTable'
import type { SimpleColumn } from '../components/ui/SimpleTable'
import { Modal } from '../components/ui/Dialog'
import { ApiError } from '../lib/apiClient'
import { PLATFORM_ADMIN_ROLES } from '../types/api'
import type { CreateAdminRequest, PlatformAdminUser } from '../types/api'

function adminStatusTone(status: string): PillTone {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'SUSPENDED':
      return 'danger'
    case 'INVITED':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function AdminsPage() {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'admins.manage') : false
  const { data, isLoading, isError, error, refetch } = useAdmins()
  const setStatus = useSetAdminStatus()
  const [creating, setCreating] = useState(false)
  const [editingRole, setEditingRole] = useState<PlatformAdminUser | null>(null)

  const columns: SimpleColumn<PlatformAdminUser>[] = [
    {
      header: 'Admin',
      render: (row) => (
        <div>
          <span className="block font-medium text-ink">{row.fullName}</span>
          <span className="block text-xs text-slate-400">{row.email}</span>
        </div>
      ),
    },
    { header: 'Role', render: (row) => <span className="text-slate-600">{humanize(row.role)}</span> },
    { header: 'Status', render: (row) => <StatusPill tone={adminStatusTone(row.status)}>{humanize(row.status)}</StatusPill> },
    { header: 'Last login', render: (row) => <span className="text-slate-500">{row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Never'}</span> },
  ]
  if (canManage) {
    columns.push({
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" icon={<UserCog className="size-4" aria-hidden />} onClick={() => setEditingRole(row)} className="h-8 px-2">
            Role
          </Button>
          <Button
            variant="ghost"
            icon={<Power className="size-4" aria-hidden />}
            isLoading={setStatus.isPending && setStatus.variables?.adminId === row.id}
            disabled={row.id === admin?.id}
            onClick={() => setStatus.mutate({ adminId: row.id, active: row.status !== 'ACTIVE' })}
            className={`h-8 px-2 ${row.status === 'ACTIVE' ? 'text-red-600' : 'text-brand-dark'}`}
          >
            {row.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
          </Button>
        </div>
      ),
    })
  }

  return (
    <>
      <PageHeader
        title="Administrators"
        subtitle="Platform staff with console access"
        actions={
          canManage ? (
            <Button icon={<ShieldPlus className="size-4" aria-hidden />} onClick={() => setCreating(true)}>
              New admin
            </Button>
          ) : undefined
        }
      />
      <div className="admin-rise space-y-4 p-6 sm:p-8">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load admins'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <StateBlock icon={<UserCog className="size-6" aria-hidden />} title="No administrators" />
        ) : (
          <SimpleTable<PlatformAdminUser> rows={data} getKey={(row) => row.id} columns={columns} />
        )}
      </div>

      <CreateAdminDialog open={creating} onClose={() => setCreating(false)} />
      <RoleDialog admin={editingRole} onClose={() => setEditingRole(null)} />
    </>
  )
}

function CreateAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateAdmin()
  const [form, setForm] = useState<CreateAdminRequest>({ email: '', fullName: '', role: 'OPERATIONS_ADMIN', password: '' })
  const [errorText, setErrorText] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setForm({ email: '', fullName: '', role: 'OPERATIONS_ADMIN', password: '' })
      setErrorText(null)
    }
  }

  function setField<K extends keyof CreateAdminRequest>(key: K, value: CreateAdminRequest[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    setErrorText(null)
    mutation.mutate(form, {
      onSuccess: onClose,
      onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Could not create admin'),
    })
  }

  const valid = form.email.trim() && form.fullName.trim() && form.password.length >= 8

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New administrator"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!valid} onClick={save}>
            Create
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="Full name" value={form.fullName} onChange={(event) => setField('fullName', event.target.value)} />
        <TextField label="Email" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
        <RoleSelect value={form.role} onChange={(value) => setField('role', value)} />
        <TextField label="Temporary password" type="password" value={form.password} onChange={(event) => setField('password', event.target.value)} errorText={form.password && form.password.length < 8 ? 'At least 8 characters' : undefined} />
        {errorText ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

function RoleDialog({ admin, onClose }: { admin: PlatformAdminUser | null; onClose: () => void }) {
  const mutation = useUpdateAdminRole()
  const [role, setRole] = useState('OPERATIONS_ADMIN')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (admin && admin.id !== seededId) {
    setSeededId(admin.id)
    setRole(admin.role)
    setErrorText(null)
  }

  function save() {
    if (!admin) return
    setErrorText(null)
    mutation.mutate(
      { adminId: admin.id, role },
      { onSuccess: onClose, onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Update failed') },
    )
  }

  return (
    <Modal
      open={admin !== null}
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
      <RoleSelect value={role} onChange={setRole} />
      {errorText ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
    </Modal>
  )
}

function RoleSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">Role</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
      >
        {PLATFORM_ADMIN_ROLES.map((role) => (
          <option key={role} value={role}>
            {humanize(role)}
          </option>
        ))}
      </select>
    </label>
  )
}
