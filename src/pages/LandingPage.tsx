import { useEffect, useRef } from 'react'

const logo = '/assets/logo.png'

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
      { threshold: 0.18, rootMargin: '0px 0px -7% 0px' },
    )
    document.querySelectorAll('.rise').forEach((el) => io.observe(el))

    const card = cardRef.current
    const stage = stageRef.current
    let tick = false

    const onScroll = () => {
      if (tick || !card) return
      tick = true
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 640)
        card.style.transform = `translateY(${y * -0.05}px) scale(${1 - y * 0.0001})`
        tick = false
      })
    }

    const onMove = (e: MouseEvent) => {
      if (!card || !stage) return
      const r = stage.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const yy = (e.clientY - r.top) / r.height - 0.5
      card.style.transform = `rotateY(${x * 12}deg) rotateX(${-yy * 12}deg)`
    }
    const onLeave = () => {
      if (card) card.style.transform = 'rotateY(0) rotateX(0)'
    }

    const fine = matchMedia('(pointer:fine)').matches
    if (fine && stage) {
      stage.addEventListener('mousemove', onMove)
      stage.addEventListener('mouseleave', onLeave)
    }
    const motionOk = matchMedia('(prefers-reduced-motion: no-preference)').matches
    if (motionOk) window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      io.disconnect()
      if (stage) {
        stage.removeEventListener('mousemove', onMove)
        stage.removeEventListener('mouseleave', onLeave)
      }
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <>
      <nav>
        <div className="nav-in">
          <a className="brand" href="/">
            <img src={logo} alt="" />
            One<b>Bonus</b>
          </a>
          <div className="nav-r">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#contact" className="pill">
              Get in touch
            </a>
          </div>
        </div>
      </nav>

      <header className="hero b-dark">
        <div className="w">
          <div className="eyebrow">One Bonus</div>
          <h1 className="title-hero">
            One card.
            <br />
            Every merchant.
          </h1>
          <p className="intro">The loyalty card your customers actually carry.</p>
          <div className="links">
            <a href="#contact" className="lnk">
              Get in touch{' '}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </a>
            <a href="#how" className="lnk">
              See how it works{' '}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </a>
          </div>
        </div>
        <div className="stage" ref={stageRef}>
          <div className="halo"></div>
          <div className="reflect"></div>
          <div className="card3d" ref={cardRef}>
            <div className="lcard">
              <div className="lc-top">
                <img src={logo} alt="" />
                <span className="nm">
                  One<b>Bonus</b>
                </span>
                <span className="chip">MEMBER</span>
              </div>
              <div className="lc-lbl">Member</div>
              <div className="lc-member">Anna Grigoryan</div>
              <div className="lc-bar">
                <div className="bars"></div>
                <div className="bcode">VRV-000148</div>
              </div>
            </div>
          </div>
        </div>
        <div className="cue">
          <div className="m"></div>
        </div>
      </header>

      <section className="sec b-dark">
        <div className="w rise">
          <h2 className="title-1">It lives in their wallet.</h2>
          <p className="intro">
            Add it to Google Wallet or Apple Wallet — or carry a tap-to-pay NFC card. It's always with them.
          </p>
          <div className="badges">
            <span className="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="13" rx="3" />
                <path d="M16 12h2" />
              </svg>
              Google Wallet
            </span>
            <span className="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="13" rx="3" />
              </svg>
              Apple Wallet
            </span>
            <span className="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 8a9 9 0 0 1 0 8M9.5 5.5a13 13 0 0 1 0 13M3 11a5 5 0 0 1 0 2" />
              </svg>
              NFC card
            </span>
            <span className="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M7 9v6M11 9v6M15 9v6" />
              </svg>
              Barcode
            </span>
          </div>
        </div>
      </section>

      <section id="how" className="sec b-light">
        <div className="w rise">
          <div className="eyebrow">How it works</div>
          <h2 className="title-1" style={{ marginTop: 10 }}>
            Live in three steps.
          </h2>
          <p className="intro">No hardware to wait for. Nothing for your customers to install.</p>
        </div>
        <div className="w-l">
          <div className="steps">
            <div className="stp rise">
              <div className="n">1</div>
              <h3>Issue the card</h3>
              <p>Create a customer's One Bonus card in seconds, right from the merchant app.</p>
            </div>
            <div className="stp rise">
              <div className="n">2</div>
              <h3>Customer adds it</h3>
              <p>They scan a QR or open a link, and it lands in their Google or Apple Wallet instantly.</p>
            </div>
            <div className="stp rise">
              <div className="n">3</div>
              <h3>Tap &amp; earn</h3>
              <p>One card works at every merchant on the network — rewards apply at checkout.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec b-dark">
        <div className="w rise">
          <h2 className="title-1">Tap. Earn. Done.</h2>
          <p className="intro">
            One tap at the counter and points are on. Checkout in two seconds — no fumbling, no sign-up.
          </p>
          <div className="ring">
            <i></i>
            <i></i>
            <i></i>
            <div className="core">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 8a9 9 0 0 1 0 8M9.5 5a14 14 0 0 1 0 14M13 3a18 18 0 0 1 0 18" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="sec b-near">
        <div className="w rise">
          <div className="eyebrow">Why One Bonus</div>
          <h2 className="title-1" style={{ marginTop: 10 }}>
            Built for regulars.
          </h2>
        </div>
        <div className="w-l">
          <div className="feat">
            <div className="tile rise">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <path d="M2 10h20" />
                </svg>
              </div>
              <h3>One universal card</h3>
              <p>A single card per customer that works across every business on the network.</p>
            </div>
            <div className="tile rise">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="13" rx="3" />
                  <path d="M16 12h2" />
                </svg>
              </div>
              <h3>Lives in their wallet</h3>
              <p>Google Wallet &amp; Apple Wallet, plus NFC and barcode — always in their pocket.</p>
            </div>
            <div className="tile rise">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m12 2 2.4 6.9H22l-6 4.3 2.3 7-6.3-4.5L5.7 20l2.3-7-6-4.3h7.6z" />
                </svg>
              </div>
              <h3>Points &amp; rewards</h3>
              <p>Points, tiers, coupons and check-ins — each merchant runs their own program.</p>
            </div>
            <div className="tile rise">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
                </svg>
              </div>
              <h3>One network, real-time</h3>
              <p>Customers revisit every business on One Bonus. Balances update live.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-l b-dark">
        <div className="specs">
          <div className="spec rise">
            <div className="n">1</div>
            <div className="c">Universal card across the network</div>
          </div>
          <div className="spec rise">
            <div className="n">
              2<span className="u">s</span>
            </div>
            <div className="c">Tap-and-go NFC checkout</div>
          </div>
          <div className="spec rise">
            <div className="n">4</div>
            <div className="c">Ways to carry it</div>
          </div>
          <div className="spec rise">
            <div className="n">0</div>
            <div className="c">Apps for customers to install</div>
          </div>
        </div>
      </section>

      <section id="contact" className="sec b-dark">
        <div className="w rise">
          <h2 className="title-1">Bring One Bonus to your business.</h2>
          <p className="intro">Turn first visits into lasting loyalty. We'll help you set it up.</p>
        </div>
        <div className="contact rise">
          <a className="ccard" href="tel:+37433648835">
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            <span>
              <span className="k">Call us</span>
              <span className="v">+374 33 648835</span>
            </span>
          </a>
          <a className="ccard" href="mailto:vectoritllc@gmail.com">
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
            </span>
            <span>
              <span className="k">Email us</span>
              <span className="v">vectoritllc@gmail.com</span>
            </span>
          </a>
        </div>
      </section>

      <footer>
        <div className="foot-in">
          <span>
            Copyright © {new Date().getFullYear()} One Bonus — Vector IT LLC. All rights reserved.
          </span>
          <div className="foot-links">
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
