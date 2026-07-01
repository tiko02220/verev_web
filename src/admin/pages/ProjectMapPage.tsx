import { useEffect, useState } from 'react'
import { ExternalLink, Workflow } from 'lucide-react'
import { useAdminAuth } from '../auth/AdminAuthContext'

type MapView = { status: 'loading' | 'ready' | 'failed'; src: string | null }

export function ProjectMapPage() {
  const { token } = useAdminAuth()
  const [view, setView] = useState<MapView>({ status: 'loading', src: null })

  useEffect(() => {
    if (!token) return
    let objectUrl: string | null = null
    let cancelled = false
    fetch('/project-map.html', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error(`status ${response.status}`)
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setView({ status: 'ready', src: objectUrl })
      })
      .catch(() => {
        if (!cancelled) setView({ status: 'failed', src: null })
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [token])

  const src = view.status === 'ready' ? view.src : null

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-canvas/85 px-6 py-5 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark ring-1 ring-inset ring-brand-ring/60">
            <Workflow className="size-[18px]" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">Project map</h1>
            <p className="text-sm text-subtle">Architecture, user flows, screen flows, data model, realtime and API across the platform</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (src) window.open(src, '_blank', 'noopener,noreferrer')
          }}
          disabled={!src}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ExternalLink className="size-4" aria-hidden />
          Open full screen
        </button>
      </header>
      {view.status === 'failed' ? (
        <div className="flex flex-1 items-center justify-center px-6 text-sm text-subtle">Couldn’t load the project map. Refresh and try again.</div>
      ) : src ? (
        <iframe title="OneBonus project map" src={src} className="min-h-0 w-full flex-1 border-0 bg-white" />
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-sm text-subtle">Loading…</div>
      )}
    </div>
  )
}
