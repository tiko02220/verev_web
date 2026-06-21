import type { ApiEnvelope } from '../types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

let authToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  readonly status: number
  readonly code: number | null

  constructor(message: string, status: number, code: number | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type QueryParams = Record<string, string | number | boolean | undefined>

interface RequestOptions {
  query?: QueryParams
  body?: unknown
}

async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(BASE_URL + path, window.location.origin)
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') headers['X-Idempotency-Key'] = crypto.randomUUID()

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 401) unauthorizedHandler?.()

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok || !envelope || envelope.error) {
    const message = envelope?.error?.message ?? `Request failed (${response.status})`
    throw new ApiError(message, response.status, envelope?.error?.code ?? null)
  }
  return envelope.data as T
}

export const api = {
  get: <T>(path: string, query?: QueryParams): Promise<T> => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: QueryParams): Promise<T> => request<T>('POST', path, { body, query }),
  put: <T>(path: string, body?: unknown, query?: QueryParams): Promise<T> => request<T>('PUT', path, { body, query }),
  del: <T>(path: string, query?: QueryParams): Promise<T> => request<T>('DELETE', path, { query }),
}
