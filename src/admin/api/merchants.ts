import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type {
  AdminCampaign,
  AdminCustomer,
  AdminLedgerEntry,
  AdminProgram,
  AdminStaff,
  AdminStore,
  AdminTransaction,
  DeleteMerchantRequest,
  MerchantBilling,
  MerchantDetail,
  MerchantOverview,
  MerchantSummary,
  UpdateAccessStateRequest,
  UpdateStoreRequest,
} from '../types/api'

export interface MerchantFilters {
  search?: string
  status?: string
}

export function useMerchants(filters: MerchantFilters) {
  return useQuery({
    queryKey: ['merchants', filters],
    queryFn: () =>
      api.get<MerchantSummary[]>('/v1/admin/organizations', {
        search: filters.search || undefined,
        status: filters.status || undefined,
      }),
  })
}

export function useMerchant(organizationId: string) {
  return useQuery({
    queryKey: ['merchant', organizationId],
    queryFn: () => api.get<MerchantDetail>('/v1/admin/organizations/get', { organizationId }),
  })
}

export function useMerchantOverview(organizationId: string) {
  return useQuery({
    queryKey: ['merchant-overview', organizationId],
    queryFn: () => api.get<MerchantOverview>('/v1/admin/organizations/overview', { organizationId }),
  })
}

export function useMerchantStores(organizationId: string) {
  return useQuery({
    queryKey: ['merchant-stores', organizationId],
    queryFn: () => api.get<AdminStore[]>('/v1/admin/organizations/stores', { organizationId }),
  })
}

export function useMerchantStaff(organizationId: string) {
  return useQuery({
    queryKey: ['merchant-staff', organizationId],
    queryFn: () => api.get<AdminStaff[]>('/v1/admin/organizations/staff', { organizationId }),
  })
}

const CUSTOMERS_PAGE_SIZE = 50

export function useMerchantCustomers(organizationId: string, search: string, page: number) {
  return useQuery({
    queryKey: ['merchant-customers', organizationId, search, page],
    queryFn: () =>
      api.get<AdminCustomer[]>('/v1/admin/organizations/customers', {
        organizationId,
        search: search || undefined,
        limit: CUSTOMERS_PAGE_SIZE,
        offset: page * CUSTOMERS_PAGE_SIZE,
      }),
  })
}

export const customersPageSize = CUSTOMERS_PAGE_SIZE

const LEDGER_PAGE_SIZE = 50
export const ledgerPageSize = LEDGER_PAGE_SIZE

export function useMerchantPrograms(organizationId: string) {
  return useQuery({
    queryKey: ['merchant-programs', organizationId],
    queryFn: () => api.get<AdminProgram[]>('/v1/admin/organizations/programs', { organizationId }),
  })
}

export function useMerchantCampaigns(organizationId: string) {
  return useQuery({
    queryKey: ['merchant-campaigns', organizationId],
    queryFn: () => api.get<AdminCampaign[]>('/v1/admin/organizations/campaigns', { organizationId }),
  })
}

export function useMerchantTransactions(organizationId: string, page: number) {
  return useQuery({
    queryKey: ['merchant-transactions', organizationId, page],
    queryFn: () =>
      api.get<AdminTransaction[]>('/v1/admin/organizations/transactions', {
        organizationId,
        limit: LEDGER_PAGE_SIZE,
        offset: page * LEDGER_PAGE_SIZE,
      }),
  })
}

export function useMerchantBilling(organizationId: string) {
  return useQuery({
    queryKey: ['merchant-billing', organizationId],
    queryFn: () => api.get<MerchantBilling>('/v1/admin/organizations/billing', { organizationId }),
  })
}

export function useMerchantLedger(organizationId: string, page: number) {
  return useQuery({
    queryKey: ['merchant-ledger', organizationId, page],
    queryFn: () =>
      api.get<AdminLedgerEntry[]>('/v1/admin/organizations/ledger', {
        organizationId,
        limit: LEDGER_PAGE_SIZE,
        offset: page * LEDGER_PAGE_SIZE,
      }),
  })
}

export function useUpdateAccessState(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateAccessStateRequest) =>
      api.post<Record<string, string>>('/v1/admin/organizations/access-state', request, { organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
    },
  })
}

export function useSetStoreActive(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, active }: { storeId: string; active: boolean }) =>
      api.post<AdminStore>(`/v1/admin/organizations/store/${active ? 'activate' : 'deactivate'}`, undefined, {
        organizationId,
        storeId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-stores', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useUpdateStore(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, request }: { storeId: string; request: UpdateStoreRequest }) =>
      api.put<AdminStore>('/v1/admin/organizations/store', request, { organizationId, storeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-stores', organizationId] }),
  })
}

export function useSetStaffActive(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ staffId, active }: { staffId: string; active: boolean }) =>
      api.post<AdminStaff>(`/v1/admin/organizations/staff/${active ? 'activate' : 'deactivate'}`, undefined, {
        organizationId,
        staffId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-staff', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useUpdateStaffRole(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ staffId, role }: { staffId: string; role: string }) =>
      api.put<AdminStaff>('/v1/admin/organizations/staff/role', { role }, { organizationId, staffId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-staff', organizationId] }),
  })
}

export function useDeleteMerchant(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: DeleteMerchantRequest) =>
      api.post<Record<string, string>>('/v1/admin/organizations/delete', request, { organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
      queryClient.removeQueries({ queryKey: ['merchant', organizationId] })
    },
  })
}
