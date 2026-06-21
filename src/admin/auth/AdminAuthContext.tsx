import { createContext, useContext } from 'react'
import type { PlatformAdmin } from '../types/api'

export interface AdminAuthValue {
  admin: PlatformAdmin | null
  token: string | null
  isBootstrapping: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AdminAuthContext = createContext<AdminAuthValue | null>(null)

export function useAdminAuth(): AdminAuthValue {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return context
}
