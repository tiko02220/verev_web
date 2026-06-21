import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { AuditEntry, PlatformDashboard } from '../types/api'

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
