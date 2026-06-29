import './admin.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { AdminAuthProvider } from './auth/AdminAuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminShell } from './components/AdminShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MerchantsPage } from './pages/MerchantsPage'
import { MerchantDetailPage } from './pages/MerchantDetailPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerDetailPage } from './pages/CustomerDetailPage'
import { AuditPage } from './pages/AuditPage'
import { AppUpdatesPage } from './pages/AppUpdatesPage'
import { AdminsPage } from './pages/AdminsPage'
import { ModerationPage } from './pages/ModerationPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ProjectMapPage } from './pages/ProjectMapPage'

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
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:customerId" element={<CustomerDetailPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="project-map" element={<ProjectMapPage />} />
              <Route path="moderation" element={<ModerationPage />} />
              <Route path="app-updates" element={<AppUpdatesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="admins" element={<AdminsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </AdminAuthProvider>
    </QueryClientProvider>
  )
}
