import { useState } from 'react'
import { Plus, Smartphone } from 'lucide-react'
import { useAppUpdates, useUpsertAppUpdate } from '../api/platform'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import { formatDate, formatNumber } from '../lib/format'
import { Button, Card, ErrorState, PageHeader, Skeleton, StateBlock, StatusPill, TextField } from '../components/ui/primitives'
import { Modal } from '../components/ui/Dialog'
import { ApiError } from '../lib/apiClient'
import type { AppUpdateConfig, UpsertAppUpdateRequest } from '../types/api'

interface EditorState {
  platform: string
  isNew: boolean
  config: AppUpdateConfig | null
}

function isRequired(config: { latestVersionCode: number; minimumVersionCode: number }): boolean {
  return config.minimumVersionCode >= config.latestVersionCode && config.latestVersionCode > 0
}

export function AppUpdatesPage() {
  const { admin } = useAdminAuth()
  const canManage = admin ? can(admin.role, 'merchants.config') : false
  const { data, isLoading, isError, error, refetch } = useAppUpdates()
  const [editor, setEditor] = useState<EditorState | null>(null)

  return (
    <>
      <PageHeader
        title="App updates"
        subtitle="Set the current app version per platform, and whether older versions must update or just see a prompt."
        actions={
          canManage ? (
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setEditor({ platform: '', isNew: true, config: null })}>
              Add platform
            </Button>
          ) : undefined
        }
      />
      <div className="admin-rise space-y-5 p-6 sm:p-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Skeleton className="h-52" />
            <Skeleton className="h-52" />
          </div>
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load app update config'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <StateBlock icon={<Smartphone className="size-6" aria-hidden />} title="No platforms configured" subtitle="Add a platform to control app updates." />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {data.map((config) => (
              <PlatformCard key={config.platform} config={config} canManage={canManage} onEdit={() => setEditor({ platform: config.platform, isNew: false, config })} />
            ))}
          </div>
        )}
      </div>

      <AppUpdateEditor editor={editor} onClose={() => setEditor(null)} />
    </>
  )
}

function PlatformCard({ config, canManage, onEdit }: { config: AppUpdateConfig; canManage: boolean; onEdit: () => void }) {
  const required = isRequired(config)
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
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

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-ink">{config.latestVersionName || '—'}</span>
        <span className="mono text-sm text-slate-400">build {formatNumber(config.latestVersionCode)}</span>
        <span className="ml-auto">
          {required ? <StatusPill tone="danger">Required</StatusPill> : <StatusPill tone="info">Optional</StatusPill>}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {required
          ? 'Anyone on an older version must update before they can keep using the app.'
          : 'Anyone on an older version sees a dismissible “update available” prompt.'}
      </p>

      <a href={config.storeUrl} target="_blank" rel="noopener noreferrer" className="mono mt-4 block truncate text-xs text-brand-dark hover:underline">
        {config.storeUrl}
      </a>
    </Card>
  )
}

interface EditorForm {
  versionName: string
  versionCode: string
  storeUrl: string
  required: boolean
}

function toEditorForm(config: AppUpdateConfig | null): EditorForm {
  if (!config) return { versionName: '', versionCode: '1', storeUrl: '', required: false }
  return { versionName: config.latestVersionName, versionCode: String(config.latestVersionCode), storeUrl: config.storeUrl, required: isRequired(config) }
}

function AppUpdateEditor({ editor, onClose }: { editor: EditorState | null; onClose: () => void }) {
  const mutation = useUpsertAppUpdate()
  const [platform, setPlatform] = useState('')
  const [form, setForm] = useState<EditorForm>(toEditorForm(null))
  const [errorText, setErrorText] = useState<string | null>(null)
  const [seeded, setSeeded] = useState<string | null>(null)

  const editorKey = editor ? `${editor.platform}-${editor.isNew}` : null
  if (editor && editorKey !== seeded) {
    setSeeded(editorKey)
    setPlatform(editor.platform)
    setForm(toEditorForm(editor.config))
    setErrorText(null)
  }

  function set<K extends keyof EditorForm>(key: K, value: EditorForm[K]) {
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
    const code = Number(form.versionCode) || 0
    const request: UpsertAppUpdateRequest = {
      latestVersionName: form.versionName.trim(),
      latestVersionCode: code,
      minimumVersionCode: form.required ? code : 0,
      storeUrl: form.storeUrl.trim(),
    }
    mutation.mutate({ platform: target, request }, { onSuccess: onClose, onError: (error) => setErrorText(error instanceof ApiError ? error.message : 'Update failed') })
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
          <Button isLoading={mutation.isPending} disabled={!form.versionName.trim() || !form.storeUrl.trim()} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {editor?.isNew ? (
          <TextField label="Platform" placeholder="ANDROID or IOS" value={platform} onChange={(event) => setPlatform(event.target.value)} />
        ) : null}

        <TextField label="Current version name" placeholder="1.1.15" value={form.versionName} onChange={(event) => set('versionName', event.target.value)} />
        <TextField
          label="Build number"
          type="number"
          min={0}
          value={form.versionCode}
          onChange={(event) => set('versionCode', event.target.value)}
        />
        <p className="-mt-3 text-xs text-slate-500">The build number that ships with this release. It increases with every release; users on a lower number are “older”.</p>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">For users on an older version</span>
          <UpdateTypeOption
            selected={!form.required}
            onClick={() => set('required', false)}
            title="Optional update"
            detail="They see a dismissible “update available” prompt and can keep using the app."
          />
          <UpdateTypeOption
            selected={form.required}
            onClick={() => set('required', true)}
            title="Required update"
            detail="They are blocked and must update before they can use the app."
          />
        </div>

        <TextField label="Store link" placeholder="https://…" value={form.storeUrl} onChange={(event) => set('storeUrl', event.target.value)} />

        {errorText ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}

function UpdateTypeOption({ selected, onClick, title, detail }: { selected: boolean; onClick: () => void; title: string; detail: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        selected ? 'border-brand bg-brand-soft/40' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-brand' : 'border-slate-300'}`}>
        {selected ? <span className="size-2 rounded-full bg-brand" /> : null}
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{detail}</span>
      </span>
    </button>
  )
}
