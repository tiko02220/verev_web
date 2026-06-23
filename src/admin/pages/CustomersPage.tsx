import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UsersRound } from 'lucide-react'
import { globalCustomersPageSize, useGlobalCustomers } from '../api/customers'
import { useDebounce } from '../lib/useDebounce'
import { formatDate, formatNumber } from '../lib/format'
import { Button, ErrorState, PageHeader, Skeleton, StateBlock } from '../components/ui/primitives'
import { SimpleTable } from '../components/ui/SimpleTable'
import type { SimpleColumn } from '../components/ui/SimpleTable'
import type { PlatformCustomerSummary } from '../types/api'

function fullName(customer: PlatformCustomerSummary): string {
  return `${customer.firstName} ${customer.lastName}`.trim() || '—'
}

export function CustomersPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const search = useDebounce(searchInput, 300)
  const { data, isLoading, isError, error, refetch, isFetching } = useGlobalCustomers(search.trim(), page)
  const rows = data ?? []
  const hasNextPage = rows.length === globalCustomersPageSize

  function onSearchChange(value: string) {
    setSearchInput(value)
    setPage(0)
  }

  const columns: SimpleColumn<PlatformCustomerSummary>[] = [
    {
      header: 'Name',
      render: (customer) => (
        <div>
          <span className="block font-medium text-ink">{fullName(customer)}</span>
          <span className="mono block text-xs text-slate-400">{customer.loyaltyId}</span>
        </div>
      ),
    },
    { header: 'Loyalty ID', render: (customer) => <span className="mono text-slate-600">{customer.loyaltyId}</span> },
    { header: 'Phone', render: (customer) => <span className="mono text-slate-600">{customer.phoneNumber}</span> },
    { header: 'Email', render: (customer) => <span className="text-slate-600">{customer.email || '—'}</span> },
    { header: 'Merchants', align: 'right', render: (customer) => <span className="mono text-slate-700">{formatNumber(customer.organizationCount)}</span> },
    { header: 'Enrolled', render: (customer) => <span className="text-slate-500">{formatDate(customer.enrolledDate)}</span> },
  ]

  return (
    <>
      <PageHeader title="Customers" subtitle="Every loyalty member across the platform" />

      <div className="admin-rise space-y-4 p-6 sm:p-8">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, phone, email, or loyalty ID"
            aria-label="Search customers"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load customers'} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <StateBlock
            icon={<UsersRound className="size-6" aria-hidden />}
            title="No customers found"
            subtitle={search ? 'Try a different search.' : undefined}
          />
        ) : (
          <>
            <SimpleTable<PlatformCustomerSummary>
              rows={rows}
              getKey={(customer) => customer.customerId}
              columns={columns}
              onRowClick={(customer) => navigate(`/admin/customers/${customer.customerId}`)}
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
    </>
  )
}
