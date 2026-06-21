import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type {
  AppUpdateConfig,
  AuditEntry,
  CreateAdminRequest,
  PlatformAdminUser,
  PlatformDashboard,
  UpsertAppUpdateRequest,
} from '../types/api'

const AUDIT_PAGE_SIZE = 50
export const auditPageSize = AUDIT_PAGE_SIZE

export function useDashboard() {
  return useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: () => api.get<PlatformDashboard>('/v1/admin/dashboard'),
  })
}

export function useAuditLog(page: number) {
  return useQuery({
    queryKey: ['platform-audit', page],
    queryFn: () =>
      api.get<AuditEntry[]>('/v1/admin/audit', {
        limit: AUDIT_PAGE_SIZE,
        offset: page * AUDIT_PAGE_SIZE,
      }),
  })
}

export function useAppUpdates() {
  return useQuery({
    queryKey: ['app-updates'],
    queryFn: () => api.get<AppUpdateConfig[]>('/v1/admin/app-updates'),
  })
}

export function useUpsertAppUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ platform, request }: { platform: string; request: UpsertAppUpdateRequest }) =>
      api.put<AppUpdateConfig>('/v1/admin/app-updates', request, { platform }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-updates'] }),
  })
}

export function useAdmins() {
  return useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get<PlatformAdminUser[]>('/v1/admin/admins'),
  })
}

export function useCreateAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateAdminRequest) => api.post<PlatformAdminUser>('/v1/admin/admins', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admins'] }),
  })
}

export function useUpdateAdminRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ adminId, role }: { adminId: string; role: string }) =>
      api.put<PlatformAdminUser>('/v1/admin/admins/role', { role }, { adminId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admins'] }),
  })
}

export function useSetAdminStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ adminId, active }: { adminId: string; active: boolean }) =>
      api.post<PlatformAdminUser>(`/v1/admin/admins/${active ? 'reactivate' : 'suspend'}`, undefined, { adminId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admins'] }),
  })
}
