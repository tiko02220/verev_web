import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import { auditPageSize, useAuditLog } from '../api/platform'
import { formatDate, humanize } from '../lib/format'
import { Button, ErrorState, PageHeader, Skeleton, StateBlock, StatusPill } from '../components/ui/primitives'
import type { PillTone } from '../components/ui/primitives'
import { SimpleTable } from '../components/ui/SimpleTable'
import type { SimpleColumn } from '../components/ui/SimpleTable'
import type { AuditEntry } from '../types/api'

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

export function AuditPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch, isFetching } = useAuditLog(page)
  const rows = data ?? []

  const columns: SimpleColumn<AuditEntry>[] = [
    { header: 'When', render: (entry) => <span className="text-slate-500">{formatDate(entry.createdAt)}</span> },
    { header: 'Action', render: (entry) => <span className="mono text-slate-800">{entry.action}</span> },
    { header: 'Actor', render: (entry) => <StatusPill tone={actorTone(entry.actorType)}>{humanize(entry.actorType)}</StatusPill> },
    { header: 'Entity', render: (entry) => <span className="text-slate-600">{humanize(entry.entityType)}</span> },
    { header: 'Reason', render: (entry) => <span className="text-slate-500">{entry.reasonText || '—'}</span> },
  ]

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every recorded platform action, newest first" />
      <div className="space-y-4 p-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load audit log'} onRetry={() => refetch()} />
        ) : rows.length === 0 && page === 0 ? (
          <StateBlock icon={<ScrollText className="size-7" aria-hidden />} title="No audit entries" />
        ) : (
          <>
            <SimpleTable<AuditEntry> rows={rows} getKey={(entry) => entry.id} columns={columns} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{isFetching ? 'Loading…' : `Page ${page + 1}`}</span>
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
    </>
  )
}
