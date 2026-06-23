import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Store } from 'lucide-react'
import { useMerchants } from '../api/merchants'
import { useDebounce } from '../lib/useDebounce'
import { accessStateTone, formatDate, formatNumber, humanize, orgStatusTone } from '../lib/format'
import { ErrorState, PageHeader, Skeleton, StateBlock, StatusPill } from '../components/ui/primitives'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED', 'CANCELLED'] as const

export function MerchantsPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const search = useDebounce(searchInput, 300)

  const filters = useMemo(
    () => ({ search: search.trim() || undefined, status: status === 'ALL' ? undefined : status }),
    [search, status],
  )
  const { data, isLoading, isError, error, refetch } = useMerchants(filters)

  return (
    <>
      <PageHeader title="Merchants" subtitle="Every organization on the platform" />

      <div className="admin-rise space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, slug, or email"
              aria-label="Search merchants"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {STATUS_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  status === value ? 'bg-brand-soft text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {value === 'ALL' ? 'All' : humanize(value)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load merchants'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <StateBlock icon={<Store className="size-6" aria-hidden />} title="No merchants found" subtitle="Try a different search or filter." />
        ) : (
          <div className="overflow-hidden rounded-card border border-slate-200/70 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-3.5">
              <p className="text-sm font-medium text-ink">
                {formatNumber(data.length)} {data.length === 1 ? 'merchant' : 'merchants'}
              </p>
            </div>
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 text-left">Merchant</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Stores</th>
                    <th className="px-5 py-3 text-right">Staff</th>
                    <th className="px-5 py-3 text-right">Customers</th>
                    <th className="px-5 py-3 text-left">Plan</th>
                    <th className="px-5 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((merchant) => (
                    <tr
                      key={merchant.organizationId}
                      onClick={() => navigate(`/admin/merchants/${merchant.organizationId}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate(`/admin/merchants/${merchant.organizationId}`)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-semibold text-brand-dark ring-1 ring-inset ring-brand-ring/60">
                            {(merchant.displayName.charAt(0) || '?').toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-ink">{merchant.displayName}</span>
                            <span className="mono block truncate text-xs text-slate-400">{merchant.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {merchant.accessState !== 'ACTIVE' ? (
                          <StatusPill tone={accessStateTone(merchant.accessState)}>{humanize(merchant.accessState)}</StatusPill>
                        ) : (
                          <StatusPill tone={orgStatusTone(merchant.status)}>{humanize(merchant.status)}</StatusPill>
                        )}
                      </td>
                      <td className="mono px-5 py-3.5 text-right text-slate-700">{formatNumber(merchant.storeCount)}</td>
                      <td className="mono px-5 py-3.5 text-right text-slate-700">{formatNumber(merchant.staffCount)}</td>
                      <td className="mono px-5 py-3.5 text-right text-slate-700">{formatNumber(merchant.customerCount)}</td>
                      <td className="px-5 py-3.5 text-slate-600">{merchant.planCode ? humanize(merchant.planCode) : '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(merchant.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-slate-200/70 bg-white p-4 shadow-card">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 py-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-16" />
        </div>
      ))}
    </div>
  )
}
