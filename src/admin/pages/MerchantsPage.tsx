import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Store } from 'lucide-react'
import { useMerchants } from '../api/merchants'
import { useDebounce } from '../lib/useDebounce'
import { accessStateTone, formatDate, formatNumber, humanize, orgStatusTone } from '../lib/format'
import { ErrorState, PageHeader, Skeleton, StateBlock, StatusPill } from '../components/ui/primitives'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED', 'CANCELLED'] as const

export function MerchantsPage() {
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

      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, slug, or email"
              aria-label="Search merchants"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {STATUS_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === value ? 'bg-brand-soft text-brand-dark' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {value === 'ALL' ? 'All' : humanize(value)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <MerchantTableSkeleton />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load merchants'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <StateBlock icon={<Store className="size-7" aria-hidden />} title="No merchants found" subtitle="Try a different search or filter." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3 text-right">Stores</th>
                  <th className="px-4 py-3 text-right">Staff</th>
                  <th className="px-4 py-3 text-right">Customers</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.map((merchant) => (
                  <tr key={merchant.organizationId} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/merchants/${merchant.organizationId}`} className="block">
                        <span className="font-medium text-slate-900 hover:text-brand-dark">{merchant.displayName}</span>
                        <span className="mono block text-xs text-slate-400">{merchant.slug}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={orgStatusTone(merchant.status)}>{humanize(merchant.status)}</StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={accessStateTone(merchant.accessState)}>{humanize(merchant.accessState)}</StatusPill>
                    </td>
                    <td className="mono px-4 py-3 text-right text-slate-700">{formatNumber(merchant.storeCount)}</td>
                    <td className="mono px-4 py-3 text-right text-slate-700">{formatNumber(merchant.staffCount)}</td>
                    <td className="mono px-4 py-3 text-right text-slate-700">{formatNumber(merchant.customerCount)}</td>
                    <td className="px-4 py-3 text-slate-600">{merchant.planCode ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(merchant.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function MerchantTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
