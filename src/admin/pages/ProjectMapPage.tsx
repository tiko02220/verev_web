import { ExternalLink, Workflow } from 'lucide-react'

export function ProjectMapPage() {
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
        <a
          href="/project-map.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ExternalLink className="size-4" aria-hidden />
          Open full screen
        </a>
      </header>
      <iframe
        title="OneBonus project map"
        src="/project-map.html"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  )
}
