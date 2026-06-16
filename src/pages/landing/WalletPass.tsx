const logo = '/assets/logo.png'

export default function WalletPass() {
  return (
    <div className="pass">
      <div className="pass-top">
        <div className="pass-head">
          <img src={logo} alt="" />
          <span className="pass-brand">One<b>Bonus</b></span>
          <span className="pass-tier">MEMBER</span>
        </div>
        <div className="pass-sub">Universal membership · One Bonus Network</div>
      </div>
      <div className="pass-code">
        <div className="pass-bars" />
        <div className="pass-num">VRV-000148</div>
      </div>
    </div>
  )
}
