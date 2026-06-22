import { useMemo, useState } from 'react'
import { Mail, Plus, Send, Trash2, Users } from 'lucide-react'
import { useNotificationSettings, useUpdateNotificationSettings } from '../api/platform'
import { Button, Card, ErrorState, PageHeader, Skeleton, StateBlock, Switch, TextField } from '../components/ui/primitives'
import { ApiError } from '../lib/apiClient'
import type { NotificationSettings } from '../types/api'

const EMPTY: NotificationSettings = { emailEnabled: false, telegramEnabled: false, emails: [], telegramChatIds: [] }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isSameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

interface RecipientListProps {
  values: string[]
  onAdd: (value: string) => string | null
  onRemove: (index: number) => void
  inputLabel: string
  placeholder: string
  inputType?: 'email' | 'text'
  emptyTitle: string
  emptySubtitle: string
  itemIcon: typeof Mail
}

function RecipientList({ values, onAdd, onRemove, inputLabel, placeholder, inputType = 'text', emptyTitle, emptySubtitle, itemIcon: ItemIcon }: RecipientListProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  function commit() {
    const validationError = onAdd(draft)
    if (validationError) {
      setError(validationError)
      return
    }
    setDraft('')
    setError(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label={inputLabel}
            type={inputType}
            placeholder={placeholder}
            value={draft}
            errorText={error ?? undefined}
            onChange={(event) => {
              setDraft(event.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
          />
        </div>
        <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={commit} aria-label={`Add ${inputLabel.toLowerCase()}`}>
          Add
        </Button>
      </div>

      {values.length === 0 ? (
        <StateBlock icon={<Users className="size-6" aria-hidden />} title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        <ul className="space-y-2">
          {values.map((value, index) => (
            <li key={value} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <ItemIcon className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="mono truncate text-sm text-ink">{value}</span>
              </span>
              <Button variant="ghost" className="h-8 px-2 text-slate-400 hover:text-red-600" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => onRemove(index)} aria-label={`Remove ${value}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function NotificationsPage() {
  const { data, isLoading, isError, error, refetch } = useNotificationSettings()
  const mutation = useUpdateNotificationSettings()
  const [form, setForm] = useState<NotificationSettings>(EMPTY)
  const [seeded, setSeeded] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  if (data && !seeded) {
    setSeeded(true)
    setForm(data)
  }

  const isDirty = useMemo(() => {
    if (!data) return false
    return (
      data.emailEnabled !== form.emailEnabled ||
      data.telegramEnabled !== form.telegramEnabled ||
      !isSameList(data.emails, form.emails) ||
      !isSameList(data.telegramChatIds, form.telegramChatIds)
    )
  }, [data, form])

  function addEmail(value: string): string | null {
    const trimmed = value.trim()
    if (!trimmed) return 'Enter an email address.'
    if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.'
    if (form.emails.includes(trimmed)) return 'This email is already in the list.'
    setForm((current) => ({ ...current, emails: [...current.emails, trimmed] }))
    setFeedback(null)
    return null
  }

  function removeEmail(index: number) {
    setForm((current) => ({ ...current, emails: current.emails.filter((_, i) => i !== index) }))
    setFeedback(null)
  }

  function addChatId(value: string): string | null {
    const trimmed = value.trim()
    if (!trimmed) return 'Enter a chat ID.'
    if (form.telegramChatIds.includes(trimmed)) return 'This chat ID is already in the list.'
    setForm((current) => ({ ...current, telegramChatIds: [...current.telegramChatIds, trimmed] }))
    setFeedback(null)
    return null
  }

  function removeChatId(index: number) {
    setForm((current) => ({ ...current, telegramChatIds: current.telegramChatIds.filter((_, i) => i !== index) }))
    setFeedback(null)
  }

  function save() {
    setFeedback(null)
    mutation.mutate(form, {
      onSuccess: () => setFeedback({ tone: 'ok', text: 'Notification settings saved.' }),
      onError: (err) => setFeedback({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not save settings' }),
    })
  }

  return (
    <>
      <PageHeader title="Notifications" subtitle="Where moderation requests are delivered for review" />
      <div className="admin-rise max-w-2xl space-y-5 p-6 sm:p-8">
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load settings'} onRetry={() => refetch()} />
        ) : (
          <>
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                  <Mail className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Email</p>
                    <Switch checked={form.emailEnabled} onChange={(value) => setForm((current) => ({ ...current, emailEnabled: value }))} label="Email notifications" />
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">Every recipient gets an email with the request details and a link to review.</p>
                  <div className="mt-4">
                    <RecipientList
                      values={form.emails}
                      onAdd={addEmail}
                      onRemove={removeEmail}
                      inputLabel="Add email recipient"
                      placeholder="you@onebonus.am"
                      inputType="email"
                      emptyTitle="No email recipients yet"
                      emptySubtitle="Add an address above to start receiving review emails."
                      itemIcon={Mail}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Send className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Telegram</p>
                    <Switch checked={form.telegramEnabled} onChange={(value) => setForm((current) => ({ ...current, telegramEnabled: value }))} label="Telegram notifications" />
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">The bot sends each request with inline Approve / Reject buttons — every recipient can decide right from Telegram.</p>
                  <div className="mt-4">
                    <RecipientList
                      values={form.telegramChatIds}
                      onAdd={addChatId}
                      onRemove={removeChatId}
                      inputLabel="Add Telegram chat ID"
                      placeholder="e.g. 123456789"
                      emptyTitle="No Telegram recipients yet"
                      emptySubtitle="Add a numeric chat ID above to deliver requests to Telegram."
                      itemIcon={Send}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Each recipient must open the bot and press <span className="mono">Start</span> first. Get their numeric chat ID via <span className="mono">/chatid</span>.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-between gap-3">
              {feedback ? (
                <span className={`text-sm ${feedback.tone === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>{feedback.text}</span>
              ) : (
                <span />
              )}
              <Button isLoading={mutation.isPending} disabled={!isDirty} onClick={save}>
                Save settings
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
