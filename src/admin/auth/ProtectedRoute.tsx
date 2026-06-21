import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'
import { FullScreenLoader } from '../components/ui/primitives'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, admin, isBootstrapping } = useAdminAuth()
  const location = useLocation()

  if (isBootstrapping) return <FullScreenLoader />
  if (!token || !admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
