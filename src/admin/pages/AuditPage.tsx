import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Ban,
  Bot,
  Check,
  CircleSlash,
  Clock,
  Copy,
  FilePlus2,
  FileText,
  Hash,
  PencilLine,
  Search,
  ScrollText,
  ShieldCheck,
  Store,
  Trash2,
  User,
  UserCog,
} from 'lucide-react'
import { auditPageSize, useAuditEntry, useAuditLog } from '../api/platform'
import { formatDate, humanize } from '../lib/format'
import { Button, Card, ErrorState, Skeleton, StateBlock, StatusPill } from '../components/ui/primitives'
import type { PillTone } from '../components/ui/primitives'
import { SimpleTable } from '../components/ui/SimpleTable'
import type { SimpleColumn } from '../components/ui/SimpleTable'
import { DetailDrawer, DetailRow, DetailSection } from '../components/ui/DetailDrawer'
import type { AuditEntry } from '../types/api'

type ActionKind = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'suspend' | 'other'

const KIND_LABELS: Record<ActionKind, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  suspend: 'Suspend',
  other: 'Other',
}

const KIND_TONES: Record<ActionKind, PillTone> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  approve: 'success',
  reject: 'danger',
  suspend: 'warning',
  other: 'neutral',
}

function actionKind(action: string): ActionKind {
  const token = action.toUpperCase()
  if (token.includes('CREATE') || token.includes('ADD') || token.includes('INVITE') || token.includes('GRANT')) return 'create'
  if (token.includes('DELETE') || token.includes('REMOVE') || token.includes('PURGE') || token.includes('REVOKE')) return 'delete'
  if (token.includes('APPROVE') || token.includes('ACTIVATE') || token.includes('REACTIVATE') || token.includes('ENABLE')) return 'approve'
  if (token.includes('REJECT') || token.includes('DECLINE') || token.includes('DENY')) return 'reject'
  if (token.includes('SUSPEND') || token.includes('DISABLE') || token.includes('SHUTDOWN') || token.includes('LOCK')) return 'suspend'
  if (token.includes('UPDATE') || token.includes('EDIT') || token.includes('CHANGE') || token.includes('SET') || token.includes('MODIFY')) return 'update'
  return 'other'
}

function kindIcon(kind: ActionKind): ReactNode {
  switch (kind) {
    case 'create':
      return <FilePlus2 className="size-3.5" aria-hidden />
    case 'update':
      return <PencilLine className="size-3.5" aria-hidden />
    case 'delete':
      return <Trash2 className="size-3.5" aria-hidden />
    case 'approve':
      return <ShieldCheck className="size-3.5" aria-hidden />
    case 'reject':
      return <CircleSlash className="size-3.5" aria-hidden />
    case 'suspend':
      return <Ban className="size-3.5" aria-hidden />
    default:
      return <FileText className="size-3.5" aria-hidden />
  }
}

const KIND_ICON_TONES: Record<PillTone, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  neutral: 'bg-slate-100 text-slate-500',
  info: 'bg-sky-50 text-sky-600',
}

function actorTone(actorType: string): PillTone {
  switch (actorType) {
    case 'PLATFORM_ADMIN':
      return 'info'
    case 'SYSTEM':
      return 'neutral'
    default:
      return 'success'
  }
}

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatTimestamp(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? '—' : TIME_FORMATTER.format(parsed)
}

function relativeTime(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  const seconds = Math.round((Date.now() - parsed.getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 8)}…` : value
}

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
    <button type="button" onClick={copy} title={value} className="group inline-flex items-center gap-1.5 text-left">
      <span className="mono text-sm text-slate-800">{value}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" aria-hidden />
      )}
    </button>
  )
}

function ActorBadge({ entry }: { entry: AuditEntry }) {
  const label = entry.actorName || humanize(entry.actorType)
  const isSystem = entry.actorType === 'SYSTEM'
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${KIND_ICON_TONES[actorTone(entry.actorType)]}`}>
        {isSystem ? <Bot className="size-3.5" aria-hidden /> : <User className="size-3.5" aria-hidden />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{label}</p>
        <p className="truncate text-[0.7rem] text-slate-400">{humanize(entry.actorType)}</p>
      </div>
    </div>
  )
}

type ParsedJson = Record<string, unknown> | null

function parseJson(raw: string): ParsedJson {
  if (!raw || !raw.trim()) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

function renderScalar(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value || '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function JsonBlock({ label, raw }: { label: string; raw: string }) {
  const pretty = useMemo(() => {
    if (!raw || !raw.trim()) return ''
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return raw
    }
  }, [raw])
  if (!pretty) return null
  return (
    <div>
      <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <pre className="admin-scroll mono max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 text-xs leading-relaxed text-slate-700">
        {pretty}
      </pre>
    </div>
  )
}

function DiffTable({ before, after }: { before: ParsedJson; after: ParsedJson }) {
  const keys = useMemo(() => {
    const set = new Set<string>([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
    return Array.from(set).sort()
  }, [before, after])

  if (keys.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200/70 bg-slate-50/60 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
            <th className="px-3.5 py-2.5 text-left font-semibold">Field</th>
            <th className="px-3.5 py-2.5 text-left font-semibold">Before</th>
            <th className="px-3.5 py-2.5 text-left font-semibold">After</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const beforeValue = before ? before[key] : undefined
            const afterValue = after ? after[key] : undefined
            const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue)
            return (
              <tr key={key} className={`border-b border-slate-100 last:border-0 ${changed ? 'bg-amber-50/40' : ''}`}>
                <td className="px-3.5 py-2.5 align-top">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    {changed ? <span className="size-1.5 rounded-full bg-amber-500" aria-hidden /> : <span className="size-1.5 rounded-full bg-transparent" aria-hidden />}
                    {humanize(key)}
                  </span>
                </td>
                <td className="mono px-3.5 py-2.5 align-top text-xs text-slate-500">{renderScalar(beforeValue)}</td>
                <td className={`mono px-3.5 py-2.5 align-top text-xs ${changed ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{renderScalar(afterValue)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ChangeView({ entry }: { entry: AuditEntry }) {
  const before = parseJson(entry.beforeJson)
  const after = parseJson(entry.afterJson)
  const hasBeforeRaw = Boolean(entry.beforeJson && entry.beforeJson.trim())
  const hasAfterRaw = Boolean(entry.afterJson && entry.afterJson.trim())

  if (!hasBeforeRaw && !hasAfterRaw) {
    return <p className="rounded-xl bg-slate-50 px-3.5 py-4 text-center text-xs text-slate-400">No state change was recorded for this action.</p>
  }

  if (before && after) {
    return <DiffTable before={before} after={after} />
  }

  return (
    <div className="space-y-4">
      {before ? <DiffTable before={before} after={null} /> : <JsonBlock label="Before" raw={entry.beforeJson} />}
      {after ? <DiffTable before={null} after={after} /> : <JsonBlock label="After" raw={entry.afterJson} />}
    </div>
  )
}

function AuditDrawerBody({ entry }: { entry: AuditEntry }) {
  const kind = actionKind(entry.action)
  return (
    <>
      <DetailSection title="Action">
        <DetailRow
          label="Type"
          value={
            <StatusPill tone={KIND_TONES[kind]}>
              {kindIcon(kind)}
              {KIND_LABELS[kind]}
            </StatusPill>
          }
        />
        <DetailRow label="Action code" value={<span className="mono text-xs text-slate-600">{entry.action}</span>} />
        <DetailRow label="When" value={<span title={formatTimestamp(entry.createdAt)}>{formatTimestamp(entry.createdAt)}</span>} />
      </DetailSection>

      <DetailSection title="Actor">
        <DetailRow label="Name" value={entry.actorName || <span className="text-slate-400">—</span>} />
        <DetailRow label="Type" value={<StatusPill tone={actorTone(entry.actorType)}>{humanize(entry.actorType)}</StatusPill>} />
        <DetailRow label="Actor ID" value={<CopyId value={entry.actorId} />} />
      </DetailSection>

      <DetailSection title="Target">
        <DetailRow label="Entity" value={<span className="text-sm text-slate-800">{humanize(entry.entityType)}</span>} />
        <DetailRow label="Entity ID" value={<CopyId value={entry.entityId} />} />
        {entry.organizationId ? (
          <DetailRow
            label="Merchant"
            value={
              <Link
                to={`/admin/merchants/${entry.organizationId}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark transition-colors hover:text-brand"
              >
                <Store className="size-3.5" aria-hidden />
                Open merchant
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
        ) : null}
        {entry.organizationId ? <DetailRow label="Organization ID" value={<CopyId value={entry.organizationId} />} /> : null}
      </DetailSection>

      {entry.reasonText ? (
        <DetailSection title="Reason">
          <DetailRow label="Note" value={<span className="text-sm text-slate-700">{entry.reasonText}</span>} />
        </DetailSection>
      ) : null}

      <section>
        <h3 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Changes</h3>
        <ChangeView entry={entry} />
      </section>
    </>
  )
}

function AuditDrawer({ entry, open, onClose }: { entry: AuditEntry | null; open: boolean; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useAuditEntry(open ? (entry?.id ?? null) : null)
  if (!entry) return null
  const detail = data ?? entry
  const kind = actionKind(entry.action)
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={humanize(entry.action)}
      subtitle={`${humanize(entry.entityType)} · ${formatTimestamp(entry.createdAt)}`}
      status={
        <StatusPill tone={KIND_TONES[kind]}>
          {kindIcon(kind)}
          {KIND_LABELS[kind]}
        </StatusPill>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load audit entry'} onRetry={() => refetch()} />
      ) : (
        <AuditDrawerBody entry={detail} />
      )}
    </DetailDrawer>
  )
}

const KIND_FILTERS: ActionKind[] = ['create', 'update', 'delete', 'approve', 'reject', 'suspend']

export function AuditPage() {
  const [page, setPage] = useState(0)
  const [activeKind, setActiveKind] = useState<ActionKind | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const { data, isLoading, isError, error, refetch, isFetching } = useAuditLog(page)
  const rows = data ?? []

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((entry) => {
      if (activeKind !== 'all' && actionKind(entry.action) !== activeKind) return false
      if (!needle) return true
      const haystack = `${entry.action} ${entry.actorName} ${entry.actorType} ${entry.entityType} ${entry.entityId} ${entry.reasonText}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [rows, activeKind, query])

  const columns: SimpleColumn<AuditEntry>[] = [
    {
      header: 'Action',
      render: (entry) => {
        const kind = actionKind(entry.action)
        return (
          <div className="flex items-center gap-2.5">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${KIND_ICON_TONES[KIND_TONES[kind]]}`}>{kindIcon(kind)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{humanize(entry.action)}</p>
              <p className="mono truncate text-[0.7rem] text-slate-400">{entry.action}</p>
            </div>
          </div>
        )
      },
    },
    { header: 'Actor', render: (entry) => <ActorBadge entry={entry} /> },
    {
      header: 'Entity',
      render: (entry) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-700">{humanize(entry.entityType)}</p>
          <p className="mono inline-flex items-center gap-1 truncate text-[0.7rem] text-slate-400" title={entry.entityId}>
            <Hash className="size-3 shrink-0" aria-hidden />
            {shortId(entry.entityId)}
          </p>
        </div>
      ),
    },
    {
      header: 'Reason',
      render: (entry) => <span className="line-clamp-2 max-w-[16rem] text-sm text-slate-500">{entry.reasonText || '—'}</span>,
    },
    {
      header: 'When',
      align: 'right',
      render: (entry) => (
        <span className="mono inline-flex items-center justify-end gap-1.5 whitespace-nowrap text-xs text-slate-500" title={formatTimestamp(entry.createdAt)}>
          <Clock className="size-3 text-slate-400" aria-hidden />
          {relativeTime(entry.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeaderWithCount count={filtered.length} />

      <div className="admin-rise space-y-4 p-6 sm:p-8">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load audit log'} onRetry={() => refetch()} />
        ) : (
          <>
            <Card className="flex flex-wrap items-center gap-3 p-3">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search action, actor, entity…"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-ink outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <KindChip label="All" active={activeKind === 'all'} tone="neutral" onClick={() => setActiveKind('all')} />
                {KIND_FILTERS.map((kind) => (
                  <KindChip key={kind} label={KIND_LABELS[kind]} active={activeKind === kind} tone={KIND_TONES[kind]} onClick={() => setActiveKind(kind)} />
                ))}
              </div>
            </Card>

            {filtered.length === 0 ? (
              rows.length === 0 && page === 0 ? (
                <StateBlock icon={<ScrollText className="size-7" aria-hidden />} title="No audit entries" subtitle="Recorded platform actions will appear here." />
              ) : (
                <StateBlock icon={<Search className="size-7" aria-hidden />} title="No matching entries" subtitle="Adjust the filter or search to see more." />
              )
            ) : (
              <SimpleTable<AuditEntry> rows={filtered} getKey={(entry) => entry.id} columns={columns} onRowClick={(entry) => setSelected(entry)} />
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{isFetching ? 'Loading…' : `Page ${page + 1} · ${rows.length} loaded`}</span>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page === 0 || isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                  Previous
                </Button>
                <Button variant="secondary" disabled={rows.length < auditPageSize || isFetching} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <AuditDrawer entry={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </>
  )
}

function PageHeaderWithCount({ count }: { count: number }) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-canvas/85 px-6 py-5 backdrop-blur-md sm:px-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark ring-1 ring-inset ring-brand-ring/60">
          <UserCog className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Audit log</h1>
          <p className="mt-0.5 text-sm text-subtle">Every recorded platform action, newest first · click a row for full detail</p>
        </div>
      </div>
      <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{count} shown</span>
    </header>
  )
}

function KindChip({ label, active, tone, onClick }: { label: string; active: boolean; tone: PillTone; onClick: () => void }) {
  const activeStyles: Record<PillTone, string> = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    neutral: 'bg-slate-800 text-white ring-slate-800',
    info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-xs font-medium ring-1 ring-inset transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 ${
        active ? activeStyles[tone] : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}
