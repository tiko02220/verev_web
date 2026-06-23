import type { ReactNode } from 'react'

export interface SimpleColumn<T> {
  header: string
  align?: 'left' | 'right'
  stopClick?: boolean
  render: (row: T) => ReactNode
}

interface SimpleTableProps<T> {
  rows: T[]
  columns: SimpleColumn<T>[]
  getKey: (row: T) => string
  onRowClick?: (row: T) => void
}

export function SimpleTable<T>({ rows, columns, getKey, onRowClick }: SimpleTableProps<T>) {
  return (
    <div className="admin-scroll overflow-x-auto rounded-card border border-slate-200/70 bg-white shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200/70 bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {columns.map((column) => (
              <th key={column.header} className={`px-5 py-3 font-semibold ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              className={`border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70 ${onRowClick ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40' : ''}`}
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  onClick={column.stopClick ? (event) => event.stopPropagation() : undefined}
                  className={`px-5 py-3.5 align-middle ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
