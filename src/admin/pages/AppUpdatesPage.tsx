import { useState } from 'react'
import { Plus, Smartphone } from 'lucide-react'
import { useAppUpdates, useUpsertAppUpdate } from '../api/platform'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import { formatDate, formatNumber } from '../lib/format'
import { Button, Card, ErrorState, PageHeader, Skeleton, StateBlock } from '../components/ui/primitives'
import { Modal } from '../components/ui/Dialog'
import { TextField } from '../components/ui/primitives'
import { ApiError } from '../lib/apiClient'
import type { AppUpdateConfig, UpsertAppUpdateRequest } from '../types/api'

interface EditorState {
  platform: string
  isNew: boolean
  form: UpsertAppUpdateRequest
}

const EMPTY_FORM: UpsertAppUpdateRequest = { latestVersionName: '', latestVersionCode: 1, minimumVersionCode: 0, storeUrl: '' }

export function AppUpdatesPage() {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useAppUpdates()
  const [editor, setEditor] = useState<EditorState | null>(null)

  return (
    <>
      <PageHeader
        title="App updates"
        subtitle="Control forced and optional update prompts shown in the mobile apps"
        actions={
          canManage ? (
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setEditor({ platform: '', isNew: true, form: EMPTY_FORM })}>
              Add platform
            </Button>
          ) : undefined
        }
      />
      <div className="admin-rise space-y-5 p-6 sm:p-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load app update config'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <StateBlock icon={<Smartphone className="size-6" aria-hidden />} title="No platforms configured" subtitle="Add a platform to control update prompts." />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {data.map((config) => (
              <PlatformCard
                key={config.platform}
                config={config}
                canManage={canManage}
                onEdit={() =>
                  setEditor({
                    platform: config.platform,
                    isNew: false,
                    form: {
                      latestVersionName: config.latestVersionName,
                      latestVersionCode: config.latestVersionCode,
                      minimumVersionCode: config.minimumVersionCode,
                      storeUrl: config.storeUrl,
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      <AppUpdateEditor editor={editor} onClose={() => setEditor(null)} />
    </>
  )
}

function PlatformCard({ config, canManage, onEdit }: { config: AppUpdateConfig; canManage: boolean; onEdit: () => void }) {
  const forcesAll = config.minimumVersionCode >= config.latestVersionCode
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
            <Smartphone className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{config.platform}</p>
            <p className="text-xs text-subtle">Updated {formatDate(config.updatedAt)}</p>
          </div>
        </div>
        {canManage ? (
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        <Stat label="Latest version" value={config.latestVersionName} sub={`code ${formatNumber(config.latestVersionCode)}`} />
        <Stat label="Minimum required" value={`code ${formatNumber(config.minimumVersionCode)}`} sub={forcesAll ? 'forces all older builds' : 'older builds get optional prompt'} />
      </dl>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        Builds below code <span className="mono font-semibold text-red-600">{formatNumber(config.minimumVersionCode)}</span> are{' '}
        <span className="font-semibold text-red-600">force-updated</span>; below{' '}
        <span className="mono font-semibold text-amber-600">{formatNumber(config.latestVersionCode)}</span> get an{' '}
        <span className="font-semibold text-amber-600">optional</span> prompt.
      </div>

      <a href={config.storeUrl} target="_blank" rel="noopener noreferrer" className="mono mt-3 block truncate text-xs text-brand-dark hover:underline">
        {config.storeUrl}
      </a>
    </Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-ink">{value}</dd>
      {sub ? <dd className="text-xs text-slate-400">{sub}</dd> : null}
    </div>
  )
}

function AppUpdateEditor({ editor, onClose }: { editor: EditorState | null; onClose: () => void }) {
  const mutation = useUpsertAppUpdate()
  const [platform, setPlatform] = useState('')
  const [form, setForm] = useState<UpsertAppUpdateRequest>(EMPTY_FORM)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seeded, setSeeded] = useState<string | null>(null)

  const editorKey = editor ? `${editor.platform}-${editor.isNew}` : null
  if (editor && editorKey !== seeded) {
    setSeeded(editorKey)
    setPlatform(editor.platform)
    setForm(editor.form)
    setErrorText(null)
  }

  function setField<K extends keyof UpsertAppUpdateRequest>(key: K, value: UpsertAppUpdateRequest[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    if (!editor) return
    setErrorText(null)
    const target = editor.isNew ? platform.trim().toUpperCase() : editor.platform
    if (!target) {
      setErrorText('Platform is required')
      return
    }
    mutation.mutate(
      { platform: target, request: form },
      { onSuccess: onClose, onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Update failed') },
    )
  }

  function forceEveryone() {
    setField('minimumVersionCode', form.latestVersionCode)
  }

  return (
    <Modal
      open={editor !== null}
      onClose={onClose}
      title={editor?.isNew ? 'Add platform' : `Edit ${editor?.platform ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} disabled={!form.latestVersionName.trim() || !form.storeUrl.trim()} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {editor?.isNew ? (
          <TextField label="Platform" placeholder="ANDROID or IOS" value={platform} onChange={(event) => setPlatform(event.target.value)} />
        ) : null}
        <TextField label="Latest version name" placeholder="1.1.15" value={form.latestVersionName} onChange={(event) => setField('latestVersionName', event.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Latest version code"
            type="number"
            min={0}
            value={String(form.latestVersionCode)}
            onChange={(event) => setField('latestVersionCode', Number(event.target.value) || 0)}
          />
          <TextField
            label="Minimum (force) code"
            type="number"
            min={0}
            value={String(form.minimumVersionCode)}
            onChange={(event) => setField('minimumVersionCode', Number(event.target.value) || 0)}
          />
        </div>
        <button type="button" onClick={forceEveryone} className="cursor-pointer self-start text-xs font-medium text-red-600 hover:underline">
          Force every older build to update (set minimum = latest)
        </button>
        <TextField label="Store URL" placeholder="https://…" value={form.storeUrl} onChange={(event) => setField('storeUrl', event.target.value)} />
        {form.minimumVersionCode > form.latestVersionCode ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Minimum code cannot exceed the latest code.</p>
        ) : null}
        {errorText ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}
