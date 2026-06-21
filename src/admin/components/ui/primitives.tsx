import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
  icon?: ReactNode
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-dark focus-visible:ring-brand/40',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 focus-visible:ring-slate-300',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-400',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300',
}

export function Button({ variant = 'primary', isLoading = false, icon, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-slate-500" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Loading</span>}
    </div>
  )
}

export function FullScreenLoader() {
  return (
    <div className="admin-root flex min-h-screen items-center justify-center">
      <Spinner label="Loading" />
    </div>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`rounded-card border border-slate-200/70 bg-white shadow-card ${className}`}>{children}</div>
}

export type PillTone = 'success' | 'danger' | 'warning' | 'neutral' | 'info'

const PILL_TONES: Record<PillTone, { wrap: string; dot: string }> = {
  success: { wrap: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: 'bg-emerald-500' },
  danger: { wrap: 'bg-red-50 text-red-700 ring-red-600/15', dot: 'bg-red-500' },
  warning: { wrap: 'bg-amber-50 text-amber-700 ring-amber-600/15', dot: 'bg-amber-500' },
  neutral: { wrap: 'bg-slate-100 text-slate-600 ring-slate-500/15', dot: 'bg-slate-400' },
  info: { wrap: 'bg-sky-50 text-sky-700 ring-sky-600/15', dot: 'bg-sky-500' },
}

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const styles = PILL_TONES[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles.wrap}`}>
      <span className={`size-1.5 rounded-full ${styles.dot}`} aria-hidden />
      {children}
    </span>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-canvas/85 px-6 py-5 backdrop-blur-md sm:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-subtle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

interface StateBlockProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}

export function StateBlock({ icon, title, subtitle, action }: StateBlockProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center">
      {icon ? <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon}</span> : null}
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-subtle">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <StateBlock
      icon={<TriangleAlert className="size-6" aria-hidden />}
      title="Something went wrong"
      subtitle={message}
      action={onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : undefined}
    />
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
}

interface MetricCardProps {
  label: string
  value: string
  icon?: ReactNode
  hint?: string
  tone?: PillTone
}

const METRIC_ICON_TONES: Record<PillTone, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  neutral: 'bg-slate-100 text-slate-500',
  info: 'bg-sky-50 text-sky-600',
}

export function MetricCard({ label, value, icon, hint, tone = 'neutral' }: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</p>
          <p className="mono mt-2 text-[1.7rem] font-semibold leading-none text-ink">{value}</p>
          {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
        </div>
        {icon ? <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${METRIC_ICON_TONES[tone]}`}>{icon}</span> : null}
      </div>
    </Card>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  errorText?: string
}

export function TextField({ label, errorText, id, className = '', ...rest }: TextFieldProps) {
  const fieldId = id ?? rest.name ?? label
  return (
    <label htmlFor={fieldId} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        id={fieldId}
        className={`h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-ink shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15 ${errorText ? 'border-red-400' : ''} ${className}`}
        {...rest}
      />
      {errorText ? <span className="text-xs text-red-600">{errorText}</span> : null}
    </label>
  )
}
