import './admin.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { AdminAuthProvider } from './auth/AdminAuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminShell } from './components/AdminShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MerchantsPage } from './pages/MerchantsPage'
import { MerchantDetailPage } from './pages/MerchantDetailPage'
import { AuditPage } from './pages/AuditPage'

export default function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <div className="admin-root">
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="merchants" element={<MerchantsPage />} />
              <Route path="merchants/:merchantId" element={<MerchantDetailPage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </AdminAuthProvider>
    </QueryClientProvider>
  )
}
