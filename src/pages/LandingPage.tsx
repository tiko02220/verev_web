import { useEffect, useRef } from 'react'
import OneBonusCard from './landing/OneBonusCard'
import MergeScene from './landing/MergeScene'
import AddCustomerScene from './landing/AddCustomerScene'

const logo = '/assets/logo.png'

const FEATURES = [
  { t: 'One universal card', d: 'A single identity that works across every business on the network — not one card per shop.', icon: 'card' },
  { t: 'Lives in their wallet', d: 'Google Wallet & Apple Wallet, plus NFC and barcode. Always in their pocket, never forgotten.', icon: 'wallet' },
  { t: 'Points, tiers & rewards', d: 'Each merchant runs their own program — points, tiers, coupons and check-ins — on the shared card.', icon: 'star' },
  { t: 'Tap to earn', d: 'One tap at the counter. Checkout in two seconds, no fumbling and no sign-up.', icon: 'nfc' },
  { t: 'One network, real-time', d: 'Customers revisit every business on One Bonus. Balances and rewards update live.', icon: 'globe' },
  { t: 'Nothing to install', d: 'No customer app. A scan or a link, and the card is in their wallet instantly.', icon: 'bolt' },
]

function FeatureIcon({ name }: { name: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'card') return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" /></svg>
  if (name === 'wallet') return <svg {...common}><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M16 12h2" /></svg>
  if (name === 'star') return <svg {...common}><path d="m12 2 2.4 6.9H22l-6 4.3 2.3 7-6.3-4.5L5.7 20l2.3-7-6-4.3h7.6z" /></svg>
  if (name === 'nfc') return <svg {...common}><path d="M6 8a9 9 0 0 1 0 8M9.5 5a14 14 0 0 1 0 14M13 3a18 18 0 0 1 0 18" /></svg>
  if (name === 'globe') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" /></svg>
  return <svg {...common}><path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" /></svg>
}

export default function LandingPage() {
  const cardRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))

    const card = cardRef.current
    const stage = stageRef.current
    const onMove = (e: MouseEvent) => {
      if (!card || !stage) return
      const r = stage.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      card.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`
    }
    const onLeave = () => { if (card) card.style.transform = 'rotateY(0deg) rotateX(0deg)' }
    if (matchMedia('(pointer:fine)').matches && stage) {
      stage.addEventListener('mousemove', onMove)
      stage.addEventListener('mouseleave', onLeave)
    }
    return () => {
      io.disconnect()
      if (stage) { stage.removeEventListener('mousemove', onMove); stage.removeEventListener('mouseleave', onLeave) }
    }
  }, [])

  return (
    <>
      <nav className="nav">
        <div className="nav-in">
          <a className="brand" href="/">
            <img src={logo} alt="" />One<b>Bonus</b>
          </a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#contact" className="btn">Get in touch</a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-mesh" />
        <div className="wrap hero-inner">
          <div className="eyebrow">The loyalty network</div>
          <h1 className="title-hero">One card.<br /><span className="grad-text">Every merchant.</span></h1>
          <p className="intro">The loyalty card your customers actually carry — one identity for every business on the network.</p>
          <div className="hero-cta">
            <a href="#contact" className="btn">Bring it to your business</a>
            <a href="#how" className="btn btn-ghost">See how it works</a>
          </div>
          <div className="hero-trust">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="13" rx="3" /></svg>Google &amp; Apple Wallet</span>
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a9 9 0 0 1 0 8M9.5 5.5a13 13 0 0 1 0 13" /></svg>NFC &amp; barcode</span>
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>No customer app</span>
          </div>
        </div>
        <div className="hero-stage" ref={stageRef}>
          <div className="obcard-wrap" ref={cardRef} style={{ transition: 'transform .2s ease', transformStyle: 'preserve-3d' }}>
            <OneBonusCard />
          </div>
        </div>
      </header>

      <MergeScene />

      <div id="how">
        <AddCustomerScene />
      </div>

      <section id="features" className="section">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">Why One Bonus</div>
            <h2 className="title-1" style={{ marginTop: 16 }}>Built for regulars.</h2>
            <p className="intro">Everything a loyalty program needs, on a card customers never leave at home.</p>
          </div>
          <div className="feat-grid">
            {FEATURES.map((f) => (
              <div className="feat reveal" key={f.t}>
                <div className="feat-ic"><FeatureIcon name={f.icon} /></div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="stats reveal">
            <div className="stat"><div className="stat-n">1</div><div className="stat-c">Universal card across the whole network</div></div>
            <div className="stat"><div className="stat-n">2<span className="u">s</span></div><div className="stat-c">Tap-and-go NFC checkout</div></div>
            <div className="stat"><div className="stat-n">4</div><div className="stat-c">Ways to carry it</div></div>
            <div className="stat"><div className="stat-n">0</div><div className="stat-c">Apps for customers to install</div></div>
          </div>
        </div>
      </section>

      <section id="contact" className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta reveal">
            <h2 className="title-1">Bring One Bonus to your business.</h2>
            <p className="intro" style={{ margin: '16px auto 0', maxWidth: '46ch' }}>Turn first visits into lasting loyalty. We'll help you set it up.</p>
            <div className="contact">
              <a className="ccard" href="tel:+37433648835">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg></span>
                <span><span className="k">Call us</span><span className="v">+374 33 648835</span></span>
              </a>
              <a className="ccard" href="mailto:vectoritllc@gmail.com">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg></span>
                <span><span className="k">Email us</span><span className="v">vectoritllc@gmail.com</span></span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-in">
          <span>Copyright © {new Date().getFullYear()} One Bonus — Vector IT LLC. All rights reserved.</span>
          <div className="footer-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="tel:+37433648835">+374 33 648835</a>
            <a href="mailto:vectoritllc@gmail.com">Email</a>
          </div>
        </div>
      </footer>
    </>
  )
}
