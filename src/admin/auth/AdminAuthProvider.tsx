import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, setAuthToken, setUnauthorizedHandler } from '../lib/apiClient'
import type { AdminLoginResponse, PlatformAdmin } from '../types/api'
import { AdminAuthContext } from './AdminAuthContext'
import type { AdminAuthValue } from './AdminAuthContext'

const STORAGE_KEY = 'onebonus.admin.token'

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY))
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setAuthToken(null)
    setToken(null)
    setAdmin(null)
  }, [])

  useEffect(() => {
    setAuthToken(token)
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [token, logout])

  useEffect(() => {
    if (!token) return
    let active = true
    api
      .get<PlatformAdmin>('/v1/admin/auth/me')
      .then((value) => {
        if (active) setAdmin(value)
      })
      .catch(() => {
        if (active) logout()
      })
    return () => {
      active = false
    }
  }, [token, logout])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<AdminLoginResponse>('/v1/admin/auth/login', { email, password })
    sessionStorage.setItem(STORAGE_KEY, result.accessToken)
    setAuthToken(result.accessToken)
    setAdmin(result.admin)
    setToken(result.accessToken)
  }, [])

  const isBootstrapping = Boolean(token) && admin === null

  const value = useMemo<AdminAuthValue>(
    () => ({ admin, token, isBootstrapping, login, logout }),
    [admin, token, isBootstrapping, login, logout],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
