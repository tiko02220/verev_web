import { useState } from 'react'
import { ArrowDown, CircleCheck, Plus, ShieldAlert, Smartphone, TriangleAlert } from 'lucide-react'
import { useAppUpdates, useUpsertAppUpdate } from '../api/platform'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { can } from '../auth/permissions'
import { formatDate, formatNumber } from '../lib/format'
import { Button, Card, ErrorState, PageHeader, Skeleton, StateBlock, StatusPill } from '../components/ui/primitives'
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
        subtitle="Decide which mobile builds are blocked, which see an optional prompt, and which are current"
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
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
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
  const hasForcedBand = config.minimumVersionCode > 0
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
        <div className="flex items-center gap-2">
          {forcesAll ? (
            <StatusPill tone="danger">Forcing everyone</StatusPill>
          ) : hasForcedBand ? (
            <StatusPill tone="warning">Optional + forced floor</StatusPill>
          ) : (
            <StatusPill tone="info">Optional only</StatusPill>
          )}
          {canManage ? (
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-ink">{config.latestVersionName || '—'}</span>
        <span className="mono text-sm text-slate-400">code {formatNumber(config.latestVersionCode)}</span>
        <span className="ml-auto text-xs font-medium uppercase tracking-wide text-slate-400">Latest build</span>
      </div>

      <PolicyBands latestCode={config.latestVersionCode} minimumCode={config.minimumVersionCode} className="mt-4" />

      <a
        href={config.storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mono mt-4 block truncate text-xs text-brand-dark hover:underline"
      >
        {config.storeUrl}
      </a>
    </Card>
  )
}

interface PolicyBand {
  tone: 'danger' | 'warning' | 'success'
  icon: typeof ShieldAlert
  label: string
  detail: string
}

function buildPolicyBands(latestCode: number, minimumCode: number): PolicyBand[] {
  const safeMinimum = Math.max(0, Math.min(minimumCode, latestCode))
  const bands: PolicyBand[] = []

  if (safeMinimum > 0) {
    bands.push({
      tone: 'danger',
      icon: ShieldAlert,
      label: `Builds below ${formatNumber(safeMinimum)}`,
      detail: 'Blocked — must update before they can use the app.',
    })
  }

  if (safeMinimum < latestCode) {
    const lower = formatNumber(safeMinimum)
    const upper = formatNumber(latestCode - 1)
    const range = safeMinimum === latestCode - 1 ? `Build ${upper}` : `Builds ${lower}–${upper}`
    bands.push({
      tone: 'warning',
      icon: TriangleAlert,
      label: range,
      detail: 'See a dismissible “update available” prompt.',
    })
  }

  bands.push({
    tone: 'success',
    icon: CircleCheck,
    label: `Builds ${formatNumber(latestCode)}+`,
    detail: 'Current — no prompt shown.',
  })

  return bands
}

const BAND_STYLES: Record<PolicyBand['tone'], { wrap: string; icon: string; label: string }> = {
  danger: { wrap: 'bg-red-50/70 ring-red-600/10', icon: 'text-red-600', label: 'text-red-700' },
  warning: { wrap: 'bg-amber-50/70 ring-amber-600/10', icon: 'text-amber-600', label: 'text-amber-700' },
  success: { wrap: 'bg-emerald-50/70 ring-emerald-600/10', icon: 'text-emerald-600', label: 'text-emerald-700' },
}

function PolicyBands({ latestCode, minimumCode, className = '' }: { latestCode: number; minimumCode: number; className?: string }) {
  const bands = buildPolicyBands(latestCode, minimumCode)
  return (
    <ul className={`flex flex-col gap-2 ${className}`}>
      {bands.map((band) => {
        const styles = BAND_STYLES[band.tone]
        const Icon = band.icon
        return (
          <li key={band.label} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ring-1 ring-inset ${styles.wrap}`}>
            <Icon className={`mt-0.5 size-4 shrink-0 ${styles.icon}`} aria-hidden />
            <p className="text-xs leading-relaxed text-slate-600">
              <span className={`font-semibold ${styles.label}`}>{band.label}</span> {band.detail}
            </p>
          </li>
        )
      })}
    </ul>
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

  const minimumExceedsLatest = form.minimumVersionCode > form.latestVersionCode
  const forcesAll = form.minimumVersionCode >= form.latestVersionCode && form.minimumVersionCode > 0
  const forcesNobody = form.minimumVersionCode <= 0

  function save() {
    if (!editor) return
    setErrorText(null)
    const target = editor.isNew ? platform.trim().toUpperCase() : editor.platform
    if (!target) {
      setErrorText('Platform is required')
      return
    }
    if (minimumExceedsLatest) {
      setErrorText('The force-update floor cannot be higher than the latest version code.')
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
          <Button
            isLoading={mutation.isPending}
            disabled={!form.latestVersionName.trim() || !form.storeUrl.trim() || minimumExceedsLatest}
            onClick={save}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {editor?.isNew ? (
          <TextField label="Platform" placeholder="ANDROID or IOS" value={platform} onChange={(event) => setPlatform(event.target.value)} />
        ) : null}

        <fieldset className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
          <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">Latest version</legend>
          <p className="-mt-1 text-xs text-slate-500">Everyone on an older build is offered a dismissible update automatically. Releasing a new version is as simple as bumping these.</p>
          <TextField label="Version name shown to users" placeholder="1.1.15" value={form.latestVersionName} onChange={(event) => setField('latestVersionName', event.target.value)} />
          <TextField
            label="Latest version code"
            type="number"
            min={0}
            value={String(form.latestVersionCode)}
            onChange={(event) => setField('latestVersionCode', Number(event.target.value) || 0)}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
          <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">Force-update floor</legend>
          <p className="-mt-1 text-xs text-slate-500">Anyone on a build below this code is blocked and cannot use the app until they update. Leave at 0 to force no one.</p>
          <TextField
            label="Force-update everyone below code"
            type="number"
            min={0}
            value={String(form.minimumVersionCode)}
            onChange={(event) => setField('minimumVersionCode', Number(event.target.value) || 0)}
          />
          <button type="button" onClick={forceEveryone} className="cursor-pointer self-start text-xs font-medium text-red-600 hover:underline">
            Force every older build to update (set the floor to the latest code)
          </button>
        </fieldset>

        <TextField label="Store URL" placeholder="https://…" value={form.storeUrl} onChange={(event) => setField('storeUrl', event.target.value)} />

        <div className="rounded-xl bg-slate-50 p-3.5">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">With these numbers</p>
          {minimumExceedsLatest ? (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-amber-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              The force-update floor ({formatNumber(form.minimumVersionCode)}) is above the latest code ({formatNumber(form.latestVersionCode)}). Lower it to continue.
            </p>
          ) : (
            <>
              <PolicyBands latestCode={form.latestVersionCode} minimumCode={form.minimumVersionCode} />
              <p className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-500">
                <ArrowDown className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {forcesAll
                  ? 'Every build older than the latest is force-updated.'
                  : forcesNobody
                    ? 'No one is forced — older builds only see a dismissible prompt.'
                    : 'Older builds get a dismissible prompt; only those below the floor are forced.'}
              </p>
            </>
          )}
        </div>

        {errorText ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </div>
    </Modal>
  )
}
