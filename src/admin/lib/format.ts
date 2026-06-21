import type { PillTone } from '../components/ui/primitives'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const NUMBER_FORMATTER = new Intl.NumberFormat('en-US')

export function formatDate(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? '—' : DATE_FORMATTER.format(parsed)
}

export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value)
}

export function humanize(token: string): string {
  return token
    .toLowerCase()
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function orgStatusTone(status: string): PillTone {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'SUSPENDED':
      return 'danger'
    case 'PENDING':
      return 'warning'
    case 'CANCELLED':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function accessStateTone(state: string): PillTone {
  switch (state) {
    case 'ACTIVE':
      return 'success'
    case 'READ_ONLY_GRACE':
      return 'warning'
    case 'SUSPENDED':
      return 'danger'
    case 'CANCELLED':
      return 'neutral'
    default:
      return 'neutral'
  }
}
