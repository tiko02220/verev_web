import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  status?: ReactNode
  children: ReactNode
  actions?: ReactNode
}

export function DetailDrawer({ open, onClose, title, subtitle, status, children, actions }: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="admin-root fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="admin-drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-canvas shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-slate-200/70 bg-white px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
              {status}
            </div>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-subtle">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
        {actions ? <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200/70 bg-white px-6 py-4">{actions}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <dl className="rounded-xl border border-slate-200/70 bg-white px-4 shadow-card">{children}</dl>
    </section>
  )
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const display = value === null || value === undefined || value === '' ? '—' : value
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="shrink-0 text-sm text-subtle">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-ink">{display}</dd>
    </div>
  )
}
