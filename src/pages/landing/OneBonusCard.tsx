import Chip from './Chip'

const logo = '/assets/logo.png'

function Contactless() {
  return (
    <svg className="card-contactless" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8.5 8a6 6 0 0 1 0 8M12 5.5a10 10 0 0 1 0 13M15.5 3a14 14 0 0 1 0 18" />
    </svg>
  )
}

export default function OneBonusCard() {
  return (
    <div className="card card-ob">
      <div className="card-holo" />
      <div className="card-sheen" />
      <div className="card-row">
        <span className="card-brand">
          <img src={logo} alt="" />One<b>Bonus</b>
        </span>
        <Contactless />
      </div>
      <Chip />
      <div className="card-number">••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;0148</div>
      <div className="card-foot">
        <div>
          <div className="card-cap">Membership</div>
          <div className="card-val">Universal</div>
        </div>
        <div className="card-net">One Bonus Network</div>
      </div>
    </div>
  )
}
