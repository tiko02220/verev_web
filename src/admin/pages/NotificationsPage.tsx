import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { useNotificationSettings, useUpdateNotificationSettings } from '../api/platform'
import { Button, Card, ErrorState, PageHeader, Skeleton, Switch, TextField } from '../components/ui/primitives'
import { ApiError } from '../lib/apiClient'
import type { NotificationSettings } from '../types/api'

const EMPTY: NotificationSettings = { notificationEmail: '', telegramChatId: '', emailEnabled: false, telegramEnabled: false }

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

  function setField<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }))
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
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                  <Mail className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Email</p>
                    <Switch checked={form.emailEnabled} onChange={(value) => setField('emailEnabled', value)} label="Email notifications" />
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">Receive an email with the request details and a link to review.</p>
                  <div className="mt-4">
                    <TextField label="Notification email" type="email" placeholder="you@onebonus.am" value={form.notificationEmail} onChange={(event) => setField('notificationEmail', event.target.value)} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Send className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Telegram</p>
                    <Switch checked={form.telegramEnabled} onChange={(value) => setField('telegramEnabled', value)} label="Telegram notifications" />
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">The bot sends each request with inline Approve / Reject buttons — tap to decide right from Telegram.</p>
                  <div className="mt-4">
                    <TextField label="Telegram chat ID" placeholder="e.g. 123456789" value={form.telegramChatId} onChange={(event) => setField('telegramChatId', event.target.value)} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Open your chat with the bot and send <span className="mono">/start</span>, then paste the numeric chat ID here. Only this chat can approve or reject.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-between">
              {feedback ? (
                <span className={`text-sm ${feedback.tone === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>{feedback.text}</span>
              ) : (
                <span />
              )}
              <Button isLoading={mutation.isPending} onClick={save}>
                Save settings
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
