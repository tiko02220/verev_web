import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type {
  AppUpdateConfig,
  AuditEntry,
  CreateAdminRequest,
  ModerationCardDesign,
  ModerationPromotion,
  NotificationSettings,
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

export function usePendingPromotions() {
  return useQuery({
    queryKey: ['moderation-promotions'],
    queryFn: () => api.get<ModerationPromotion[]>('/v1/admin/moderation/promotions'),
  })
}

export function useDecidePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, approve, reason }: { campaignId: string; approve: boolean; reason?: string }) =>
      approve
        ? api.post<Record<string, string>>('/v1/admin/moderation/promotions/approve', {}, { campaignId })
        : api.post<Record<string, string>>('/v1/admin/moderation/promotions/reject', { reason }, { campaignId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation-promotions'] }),
  })
}

export function usePendingCardDesigns() {
  return useQuery({
    queryKey: ['moderation-card-designs'],
    queryFn: () => api.get<ModerationCardDesign[]>('/v1/admin/moderation/card-designs'),
  })
}

export function useDecideCardDesign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, approve, reason }: { storeId: string; approve: boolean; reason?: string }) =>
      approve
        ? api.post<Record<string, string>>('/v1/admin/moderation/card-designs/approve', {}, { storeId })
        : api.post<Record<string, string>>('/v1/admin/moderation/card-designs/reject', { reason }, { storeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation-card-designs'] }),
  })
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => api.get<NotificationSettings>('/v1/admin/notification-settings'),
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: NotificationSettings) => api.put<NotificationSettings>('/v1/admin/notification-settings', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-settings'] }),
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
