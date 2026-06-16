import Chip from './Chip'

export type Merchant = { name: string; cat: string; mark: string; num: string; grad: string }

export default function MerchantCard({ m }: { m: Merchant }) {
  return (
    <div className="card" style={{ background: m.grad }}>
      <div className="card-holo" />
      <div className="card-sheen" />
      <div className="card-row">
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span className="card-mark">{m.mark}</span>
          <span>
            <span className="card-mname">{m.name}</span>
            <span className="card-mcat" style={{ display: 'block' }}>{m.cat}</span>
          </span>
        </span>
      </div>
      <Chip />
      <div className="card-number" style={{ fontSize: 16, opacity: 0.92 }}>•••• {m.num}</div>
      <div className="card-foot">
        <div className="card-cap">Loyalty card</div>
      </div>
    </div>
  )
}
