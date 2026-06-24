import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, CreditCard, ImageOff, Megaphone, X } from 'lucide-react'
import {
  useDecideAdvertising,
  useDecideCardDesign,
  usePendingAdvertising,
  usePendingCardDesigns,
} from '../api/platform'
import { formatDate, formatNumber, humanize } from '../lib/format'
import { Button, Card, ErrorState, PageHeader, Skeleton, StateBlock } from '../components/ui/primitives'
import { ConfirmDialog } from '../components/ui/Dialog'
import { ApiError } from '../lib/apiClient'
import type { ModerationAdvertising, ModerationCardDesign } from '../types/api'

const TABS = [
  { key: 'advertising', label: 'Advertising' },
  { key: 'card-designs', label: 'Card designs' },
] as const

export function ModerationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'advertising'
  const advertising = usePendingAdvertising()
  const cardDesigns = usePendingCardDesigns()

  function count(n: number | undefined) {
    return n && n > 0 ? <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">{n}</span> : null
  }

  return (
    <>
      <PageHeader title="Moderation" subtitle="Review and approve merchant-submitted advertising and card designs" />
      <div className="admin-rise p-6 sm:p-8">
        <nav className="mb-6 flex gap-1 border-b border-slate-200" aria-label="Moderation queues">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSearchParams({ tab: item.key })}
              className={`-mb-px flex cursor-pointer items-center border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === item.key ? 'border-brand text-brand-dark' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
              {count(item.key === 'advertising' ? advertising.data?.length : cardDesigns.data?.length)}
            </button>
          ))}
        </nav>

        {tab === 'card-designs' ? <CardDesignsQueue query={cardDesigns} /> : <AdvertisingQueue query={advertising} />}
      </div>
    </>
  )
}

interface QueueProps<T> {
  query: { data: T[] | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }
}

function AdvertisingQueue({ query }: QueueProps<ModerationAdvertising>) {
  const decide = useDecideAdvertising()
  const [rejecting, setRejecting] = useState<ModerationAdvertising | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  if (query.isLoading) return <Skeleton className="h-64 w-full" />
  if (query.isError) return <ErrorState message={query.error instanceof Error ? query.error.message : 'Failed to load'} onRetry={query.refetch} />
  const rows = query.data ?? []
  if (rows.length === 0) return <StateBlock icon={<Megaphone className="size-6" aria-hidden />} title="No advertising awaiting review" subtitle="New merchant advertising appears here for approval." />

  return (
    <div className="space-y-4">
      {rows.map((advertising) => (
        <Card key={advertising.advertisingId} className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row">
            <Thumbnail src={advertising.imageUri} className="h-32 w-full shrink-0 sm:w-48" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-subtle">
                    {advertising.merchantName}
                    {advertising.storeName ? ` · ${advertising.storeName}` : ''}
                  </p>
                  <h3 className="text-base font-semibold text-ink">{advertising.name}</h3>
                </div>
                <span className="text-xs text-slate-400">Submitted {formatDate(advertising.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{advertising.description || '—'}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <Field label="Type" value={humanize(advertising.offerType)} />
                <Field label="Value" value={formatNumber(advertising.offerValue)} />
                <Field label="Window" value={`${formatDate(advertising.startDate)} → ${formatDate(advertising.endDate)}`} />
                <Field label="Min purchase" value={formatNumber(advertising.minimumPurchaseAmount)} />
                <Field label="Usage limit" value={advertising.usageLimit > 0 ? formatNumber(advertising.usageLimit) : 'Unlimited'} />
                <Field label="Visibility" value={humanize(advertising.visibility)} />
                <Field label="Audience" value={audienceLabel(advertising)} />
              </dl>
            </div>
          </div>
          <Actions
            isPending={decide.isPending && decide.variables?.advertisingId === advertising.advertisingId}
            onApprove={() => {
              setErrorText(null)
              decide.mutate({ advertisingId: advertising.advertisingId, approve: true }, { onError: (e) => setErrorText(e instanceof ApiError ? e.message : 'Failed') })
            }}
            onReject={() => setRejecting(advertising)}
          />
        </Card>
      ))}
      {errorText ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      <ConfirmDialog
        open={rejecting !== null}
        title="Reject advertising"
        description="This advertising will not go live. Optionally tell the merchant why."
        confirmLabel="Reject"
        tone="danger"
        withReason
        isLoading={decide.isPending}
        onConfirm={(reason) => {
          if (!rejecting) return
          decide.mutate({ advertisingId: rejecting.advertisingId, approve: false, reason: reason || undefined }, { onSuccess: () => setRejecting(null) })
        }}
        onClose={() => setRejecting(null)}
      />
    </div>
  )
}

function CardDesignsQueue({ query }: QueueProps<ModerationCardDesign>) {
  const decide = useDecideCardDesign()
  const [rejecting, setRejecting] = useState<ModerationCardDesign | null>(null)

  if (query.isLoading) return <Skeleton className="h-64 w-full" />
  if (query.isError) return <ErrorState message={query.error instanceof Error ? query.error.message : 'Failed to load'} onRetry={query.refetch} />
  const rows = query.data ?? []
  if (rows.length === 0) return <StateBlock icon={<CreditCard className="size-6" aria-hidden />} title="No card designs awaiting review" subtitle="New merchant card designs appear here for approval." />

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {rows.map((design) => (
        <Card key={design.organizationId} className="overflow-hidden">
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{design.merchantName}</p>
              <span className="text-xs text-slate-400">{formatDate(design.updatedAt)}</span>
            </div>
            <CardPreview design={design} />
          </div>
          <Actions
            isPending={decide.isPending && decide.variables?.organizationId === design.organizationId}
            onApprove={() => decide.mutate({ organizationId: design.organizationId, approve: true })}
            onReject={() => setRejecting(design)}
          />
        </Card>
      ))}
      <ConfirmDialog
        open={rejecting !== null}
        title="Reject card design"
        description="Tell the merchant why this card design isn’t approved."
        confirmLabel="Reject"
        tone="danger"
        withReason
        isLoading={decide.isPending}
        onConfirm={(reason) => {
          if (!rejecting) return
          decide.mutate({ organizationId: rejecting.organizationId, approve: false, reason: reason || undefined }, { onSuccess: () => setRejecting(null) })
        }}
        onClose={() => setRejecting(null)}
      />
    </div>
  )
}

function CardPreview({ design }: { design: ModerationCardDesign }) {
  if (design.cardImageUrl) {
    return (
      <img
        src={design.cardImageUrl}
        alt={`${design.cardName} card design`}
        className="aspect-[1.6/1] w-full rounded-2xl object-cover shadow-inner"
      />
    )
  }
  const background = design.cardBackgroundUrl
    ? { backgroundImage: `url(${design.cardBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${design.primaryColor || '#15803d'}, ${design.secondaryColor || '#0b5d45'})` }
  return (
    <div className="relative flex aspect-[1.6/1] w-full flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-inner" style={background}>
      <div className="absolute inset-0 bg-black/15" aria-hidden />
      <div className="relative flex items-start justify-between">
        <span className="text-sm font-semibold drop-shadow">{design.cardName}</span>
        {design.logoUrl ? (
          <img src={design.logoUrl} alt="" className="size-10 rounded-lg bg-white/90 object-contain p-1" />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-lg bg-white/20">
            <ImageOff className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <div className="relative flex items-center gap-2">
        <span className="size-4 rounded-full border border-white/40" style={{ background: design.primaryColor || '#15803d' }} />
        <span className="size-4 rounded-full border border-white/40" style={{ background: design.secondaryColor || '#0b5d45' }} />
        <span className="mono text-xs text-white/80">{design.primaryColor || '—'} / {design.secondaryColor || '—'}</span>
      </div>
    </div>
  )
}

function Thumbnail({ src, className = '' }: { src: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 ${className}`}>
        <ImageOff className="size-6" aria-hidden />
      </div>
    )
  }
  return <img src={src} alt="" className={`rounded-xl object-cover ${className}`} />
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  )
}

function Actions({ isPending, onApprove, onReject }: { isPending: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200/70 bg-slate-50/50 px-5 py-3">
      <Button variant="secondary" className="text-red-600" icon={<X className="size-4" aria-hidden />} onClick={onReject} disabled={isPending}>
        Reject
      </Button>
      <Button icon={<Check className="size-4" aria-hidden />} isLoading={isPending} onClick={onApprove}>
        Approve
      </Button>
    </div>
  )
}

function audienceLabel(advertising: ModerationAdvertising): string {
  if (advertising.audienceAll) return 'All customers'
  const parts: string[] = []
  if (advertising.audienceGender && advertising.audienceGender !== 'ALL') parts.push(humanize(advertising.audienceGender))
  if (advertising.audienceAgeMin !== null || advertising.audienceAgeMax !== null) {
    parts.push(`age ${advertising.audienceAgeMin ?? 0}–${advertising.audienceAgeMax ?? '∞'}`)
  }
  if (advertising.audienceTierName) parts.push(advertising.audienceTierName)
  return parts.length > 0 ? parts.join(', ') : 'Targeted'
}
