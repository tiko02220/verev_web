import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type {
  AdminApproval,
  AdminCampaign,
  AdminCampaignDetail,
  AdminCampaignFullRequest,
  AdminCampaignResponseModel,
  AdminCreateRewardRequest,
  AdminCustomer,
  AdminLedgerEntry,
  AdminProgram,
  AdminProgramDetail,
  AdminProgramResponseModel,
  AdminRewardDetail,
  AdminRewardInventoryAdjustmentRequest,
  AdminRewardSummary,
  AdminStaff,
  AdminStore,
  AdminTransaction,
  AdminTransactionDetail,
  AdminTransactionSummary,
  AdminUpdateProgramConfigRequest,
  AdminUpdateRewardRequest,
  CreateProgramRequest,
  CreateStaffRequest,
  CreateStoreRequest,
  CreatedStaffResponse,
  DeleteMerchantRequest,
  MerchantBilling,
  MerchantDetail,
  MerchantOverview,
  MerchantSummary,
  PointsAdjustmentRequest,
  PointsAdjustmentResponse,
  TemporaryPasswordResponse,
  UpdateAccessStateRequest,
  UpdateCustomerRequest,
  UpdateProfileRequest,
  UpdateProgramRequest,
  UpdateStoreRequest,
  VoidTransactionRequest,
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

export function useMerchantRewards(organizationId: string) {
  return useQuery({
    queryKey: ['merchant-rewards', organizationId],
    queryFn: () => api.get<AdminRewardSummary[]>('/v1/admin/organizations/rewards', { organizationId }),
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

export function useMerchantApprovals(organizationId: string, page: number) {
  return useQuery({
    queryKey: ['merchant-approvals', organizationId, page],
    queryFn: () =>
      api.get<AdminApproval[]>('/v1/admin/organizations/approvals', {
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

export function useUpdateMerchantProfile(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateProfileRequest) => api.put<MerchantDetail>('/v1/admin/organizations/profile', request, { organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
    },
  })
}

export function useSetCustomerBlocked(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, blocked }: { customerId: string; blocked: boolean }) =>
      api.post<Record<string, string>>(`/v1/admin/organizations/customer/${blocked ? 'block' : 'unblock'}`, undefined, { organizationId, customerId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-customers', organizationId] }),
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

export function useCreateStore(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateStoreRequest) => api.post<AdminStore>('/v1/admin/organizations/store/create', request, { organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-stores', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useDeleteStore(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId }: { storeId: string }) =>
      api.post<AdminStore>('/v1/admin/organizations/store/delete', undefined, { organizationId, storeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-stores', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useCreateStaff(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateStaffRequest) => api.post<CreatedStaffResponse>('/v1/admin/organizations/staff/create', request, { organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-staff', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useDeleteStaff(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ staffId }: { staffId: string }) =>
      api.post<Record<string, string>>('/v1/admin/organizations/staff/delete', undefined, { organizationId, staffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-staff', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useResetStaffPassword(organizationId: string) {
  return useMutation({
    mutationFn: ({ staffId }: { staffId: string }) =>
      api.post<TemporaryPasswordResponse>('/v1/admin/organizations/staff/reset-password', undefined, { organizationId, staffId }),
  })
}

export function useUpdateCustomer(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, request }: { customerId: string; request: UpdateCustomerRequest }) =>
      api.put<AdminCustomer>('/v1/admin/organizations/customer', request, { organizationId, customerId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-customers', organizationId] }),
  })
}

export function useAdjustCustomerPoints(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, request }: { customerId: string; request: PointsAdjustmentRequest }) =>
      api.post<PointsAdjustmentResponse>('/v1/admin/organizations/ledger/adjustment', request, { organizationId, customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-customers', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useCreateProgram(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateProgramRequest) =>
      api.post<AdminProgramResponseModel>('/v1/admin/organizations/program/create', request, { organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-programs', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useSetRewardActive(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rewardId, active }: { rewardId: string; active: boolean }) =>
      api.post<AdminRewardSummary>(`/v1/admin/organizations/reward/${active ? 'enable' : 'disable'}`, undefined, { organizationId, rewardId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-rewards', organizationId] }),
  })
}

export function useDeleteReward(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rewardId }: { rewardId: string }) =>
      api.post<AdminRewardSummary>('/v1/admin/organizations/reward/delete', undefined, { organizationId, rewardId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-rewards', organizationId] }),
  })
}

export function useSetProgramActive(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ programId, active }: { programId: string; active: boolean }) =>
      api.post<AdminProgramResponseModel>(`/v1/admin/organizations/program/${active ? 'enable' : 'disable'}`, undefined, { organizationId, programId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-programs', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useRenameProgram(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ programId, request }: { programId: string; request: UpdateProgramRequest }) =>
      api.put<AdminProgramResponseModel>('/v1/admin/organizations/program', request, { organizationId, programId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-programs', organizationId] }),
  })
}

export function useDeleteProgram(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ programId }: { programId: string }) =>
      api.post<Record<string, string>>('/v1/admin/organizations/program/delete', undefined, { organizationId, programId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-programs', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useSetCampaignActive(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, active }: { campaignId: string; active: boolean }) =>
      api.post<AdminCampaignResponseModel>(`/v1/admin/organizations/campaign/${active ? 'enable' : 'disable'}`, undefined, { organizationId, campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-campaigns', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useDeleteCampaign(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId }: { campaignId: string }) =>
      api.post<Record<string, string>>('/v1/admin/organizations/campaign/delete', undefined, { organizationId, campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-campaigns', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useVoidTransaction(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ transactionId, request }: { transactionId: string; request: VoidTransactionRequest }) =>
      api.post<AdminTransactionSummary>('/v1/admin/organizations/transaction/void', request, { organizationId, transactionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-transactions', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-customers', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useMerchantTransactionDetail(organizationId: string, transactionId: string | null) {
  return useQuery({
    queryKey: ['merchant-transaction-detail', organizationId, transactionId],
    queryFn: () => api.get<AdminTransactionDetail>('/v1/admin/organizations/transaction', { organizationId, transactionId: transactionId ?? '' }),
    enabled: Boolean(transactionId),
  })
}

export function useRewardDetail(organizationId: string, rewardId: string | null) {
  return useQuery({
    queryKey: ['merchant-reward-detail', organizationId, rewardId],
    queryFn: () => api.get<AdminRewardDetail>('/v1/admin/organizations/reward/get', { organizationId, rewardId: rewardId ?? '' }),
    enabled: Boolean(rewardId),
  })
}

export function useCampaignDetail(organizationId: string, campaignId: string | null) {
  return useQuery({
    queryKey: ['merchant-campaign-detail', organizationId, campaignId],
    queryFn: () => api.get<AdminCampaignDetail>('/v1/admin/organizations/campaign/get', { organizationId, campaignId: campaignId ?? '' }),
    enabled: Boolean(campaignId),
  })
}

export function useProgramDetail(organizationId: string, programId: string | null) {
  return useQuery({
    queryKey: ['merchant-program-detail', organizationId, programId],
    queryFn: () => api.get<AdminProgramDetail>('/v1/admin/organizations/program/get', { organizationId, programId: programId ?? '' }),
    enabled: Boolean(programId),
  })
}

export function useCreateReward(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: AdminCreateRewardRequest) =>
      api.post<AdminRewardSummary>('/v1/admin/organizations/reward/create', request, { organizationId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-rewards', organizationId] }),
  })
}

export function useUpdateReward(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rewardId, request }: { rewardId: string; request: AdminUpdateRewardRequest }) =>
      api.put<AdminRewardSummary>('/v1/admin/organizations/reward', request, { organizationId, rewardId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-rewards', organizationId] }),
  })
}

export function useAdjustRewardInventory(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rewardId, request }: { rewardId: string; request: AdminRewardInventoryAdjustmentRequest }) =>
      api.post<AdminRewardSummary>('/v1/admin/organizations/reward/inventory', request, { organizationId, rewardId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-rewards', organizationId] }),
  })
}

export function useCreateCampaign(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: AdminCampaignFullRequest) =>
      api.post<AdminCampaignResponseModel>('/v1/admin/organizations/campaign/create', request, { organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-campaigns', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['merchant-overview', organizationId] })
    },
  })
}

export function useUpdateCampaignFull(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, request }: { campaignId: string; request: AdminCampaignFullRequest }) =>
      api.put<AdminCampaignResponseModel>('/v1/admin/organizations/campaign/full', request, { organizationId, campaignId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-campaigns', organizationId] }),
  })
}

export function useUpdateProgramConfig(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ programId, request }: { programId: string; request: AdminUpdateProgramConfigRequest }) =>
      api.put<AdminProgramResponseModel>('/v1/admin/organizations/program/config', request, { organizationId, programId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant-programs', organizationId] }),
  })
}
