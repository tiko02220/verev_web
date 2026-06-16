import type { ReactNode } from 'react'

export default function Phone({ children, compact }: { children?: ReactNode; compact?: boolean }) {
  return (
    <div className={`phone${compact ? ' phone-sm' : ''}`}>
      <div className="phone-screen">
        <div className="phone-island" />
        <div className="phone-statusbar">
          <span>9:41</span>
          <span>5G</span>
        </div>
        {children}
      </div>
    </div>
  )
}
