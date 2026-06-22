import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { PlatformCustomerDetail, PlatformCustomerSummary } from '../types/api'

const CUSTOMERS_PAGE_SIZE = 50
export const globalCustomersPageSize = CUSTOMERS_PAGE_SIZE

export function useGlobalCustomers(search: string, page: number) {
  return useQuery({
    queryKey: ['global-customers', search, page],
    queryFn: () =>
      api.get<PlatformCustomerSummary[]>('/v1/admin/customers', {
        search: search || undefined,
        limit: CUSTOMERS_PAGE_SIZE,
        offset: page * CUSTOMERS_PAGE_SIZE,
      }),
  })
}

export function useGlobalCustomer(customerId: string) {
  return useQuery({
    queryKey: ['global-customer', customerId],
    queryFn: () => api.get<PlatformCustomerDetail>('/v1/admin/customers/get', { customerId }),
    enabled: customerId.length > 0,
  })
}
