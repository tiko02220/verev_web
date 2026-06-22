import { useState } from 'react'
import { Plus, Smartphone } from 'lucide-react'
import { useAppUpdates, useUpsertAppUpdate } from '../api/platform'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import { formatDate } from '../lib/format'
import { Button, Card, ErrorState, PageHeader, Skeleton, StateBlock, StatusPill, TextField } from '../components/ui/primitives'
import { Modal } from '../components/ui/Dialog'
import { ApiError } from '../lib/apiClient'
import type { AppUpdateConfig, UpsertAppUpdateRequest } from '../types/api'

const SEMVER_PATTERN = /^\d+(\.\d+)*$/

function isSemver(value: string): boolean {
  return SEMVER_PATTERN.test(value.trim())
}

interface EditorState {
  platform: string
  isNew: boolean
  config: AppUpdateConfig | null
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
        subtitle="Set the current app version per platform, and which older versions must update or just see a prompt."
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
        <span className="text-2xl font-semibold tracking-tight text-ink">{config.latestVersion || '—'}</span>
        <span className="ml-auto text-xs font-medium uppercase tracking-wide text-slate-400">Current version</span>
      </div>

      <ul className="mt-4 flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          {config.forceVersion ? (
            <>
              <StatusPill tone="danger">Required</StatusPill>
              <span className="text-slate-600">below {config.forceVersion}</span>
            </>
          ) : (
            <span className="text-slate-400">No required update</span>
          )}
        </li>
        <li className="flex items-center gap-2">
          {config.suggestedVersion ? (
            <>
              <StatusPill tone="info">Suggested</StatusPill>
              <span className="text-slate-600">below {config.suggestedVersion}</span>
            </>
          ) : (
            <span className="text-slate-400">No suggested update</span>
          )}
        </li>
      </ul>

      <a href={config.storeUrl} target="_blank" rel="noopener noreferrer" className="mono mt-4 block truncate text-xs text-brand-dark hover:underline">
        {config.storeUrl}
      </a>
    </Card>
  )
}

interface EditorForm {
  latestVersion: string
  forceVersion: string
  suggestedVersion: string
  storeUrl: string
}

function toEditorForm(config: AppUpdateConfig | null): EditorForm {
  if (!config) return { latestVersion: '', forceVersion: '', suggestedVersion: '', storeUrl: '' }
  return { latestVersion: config.latestVersion, forceVersion: config.forceVersion, suggestedVersion: config.suggestedVersion, storeUrl: config.storeUrl }
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

  const latestInvalid = form.latestVersion.trim() !== '' && !isSemver(form.latestVersion)
  const forceInvalid = form.forceVersion.trim() !== '' && !isSemver(form.forceVersion)
  const suggestedInvalid = form.suggestedVersion.trim() !== '' && !isSemver(form.suggestedVersion)
  const canSave = form.latestVersion.trim() !== '' && form.storeUrl.trim() !== '' && !latestInvalid && !forceInvalid && !suggestedInvalid

  function save() {
    if (!editor) return
    setErrorText(null)
    const target = editor.isNew ? platform.trim().toUpperCase() : editor.platform
    if (!target) {
      setErrorText('Platform is required')
      return
    }
    const request: UpsertAppUpdateRequest = {
      latestVersion: form.latestVersion.trim(),
      forceVersion: form.forceVersion.trim(),
      suggestedVersion: form.suggestedVersion.trim(),
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
          <Button isLoading={mutation.isPending} disabled={!canSave} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {editor?.isNew ? (
          <TextField label="Platform" placeholder="ANDROID or IOS" value={platform} onChange={(event) => setPlatform(event.target.value)} />
        ) : null}

        <div>
          <TextField label="Current version" placeholder="1.1.15" value={form.latestVersion} onChange={(event) => set('latestVersion', event.target.value)} errorText={latestInvalid ? 'Use a version like 1.1.15' : undefined} />
          <p className="mt-1.5 text-xs text-slate-500">The latest released version. Use the version number, e.g. 1.1.15.</p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
          <TextField label="Required update below version" placeholder="e.g. 1.1.0 (optional)" value={form.forceVersion} onChange={(event) => set('forceVersion', event.target.value)} errorText={forceInvalid ? 'Use a version like 1.1.0' : undefined} />
          <p className="mt-1.5 text-xs text-slate-600">Anyone on a version below this is blocked and must update. Leave empty to require no one.</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <TextField label="Suggested update below version" placeholder="e.g. 1.1.10 (optional)" value={form.suggestedVersion} onChange={(event) => set('suggestedVersion', event.target.value)} errorText={suggestedInvalid ? 'Use a version like 1.1.10' : undefined} />
          <p className="mt-1.5 text-xs text-slate-600">Anyone on a version below this sees a dismissible “update available” prompt. Leave empty to suggest to no one.</p>
        </div>

        <TextField label="Store link" placeholder="https://…" value={form.storeUrl} onChange={(event) => set('storeUrl', event.target.value)} />

        {errorText ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}
