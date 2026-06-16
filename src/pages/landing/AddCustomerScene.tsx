import { useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from 'motion/react'
import Phone from './Phone'
import QrCode from './QrCode'

const STEPS = [
  { t: 'Start from Home', d: 'Tap the Add Customer quick action. No hardware, no terminal to set up.' },
  { t: 'Member details', d: 'First & last name, email and phone. A universal loyalty ID is generated instantly.' },
  { t: 'Customer scans the QR', d: 'They scan the code on your screen with their own phone — nothing to install.' },
  { t: 'Added to their wallet', d: 'The OneBonus card lands in Google or Apple Wallet, ready to tap and earn.' },
]

const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export default function AddCustomerScene() {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  useMotionValueEvent(p, 'change', (v) => setActive(Math.min(3, Math.max(0, Math.floor(v / 0.25 + 0.0001)))))

  const s0 = useTransform(p, [0, 0.2, 0.25], [1, 1, 0])
  const s1 = useTransform(p, [0.2, 0.25, 0.45, 0.5], [0, 1, 1, 0])
  const s2 = useTransform(p, [0.45, 0.5, 0.7, 0.75], [0, 1, 1, 0])
  const s3 = useTransform(p, [0.7, 0.75, 1], [0, 1, 1])

  return (
    <section className="scene" ref={ref} style={{ height: '320vh' }}>
      <div className="scene-sticky">
        <div className="scene-mesh" />
        <div className="wrap" style={{ width: '100%' }}>
          <div className="section-head" style={{ marginBottom: 30 }}>
            <div className="eyebrow">How it works</div>
            <h2 className="title-2" style={{ marginTop: 14 }}>A new customer, in seconds.</h2>
          </div>
          <div className="add-grid">
            <div className="add-steps">
              {STEPS.map((st, i) => (
                <div key={st.t} className={`add-step${active === i ? ' active' : ''}`}>
                  <div className="add-step-num">{i + 1}</div>
                  <div>
                    <h4>{st.t}</h4>
                    <p>{st.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="add-phone-col">
              <Phone compact>
                {/* 1 — Home, Add Customer quick action */}
                <motion.div className="appmock" style={{ opacity: s0 }}>
                  <div className="app-head">
                    <div className="app-greet">Good morning</div>
                    <div className="app-store">Daily Brew</div>
                  </div>
                  <div className="app-body">
                    <div className="app-section">Quick actions</div>
                    <div className="app-qa">
                      <div className="app-qa-card add" style={{ position: 'relative' }}>
                        <div className="app-qa-ic"><svg viewBox="0 0 24 24" {...ic}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg></div>
                        <div><div className="app-qa-t">Add Customer</div><div className="app-qa-s">Register new customer</div></div>
                        <div className="app-tap" style={{ right: 12, bottom: 12 }} />
                      </div>
                      <div className="app-qa-card scan">
                        <div className="app-qa-ic"><svg viewBox="0 0 24 24" {...ic}><path d="M4 7V5a2 2 0 0 1 2-2h2M16 3h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M4 12h16" /></svg></div>
                        <div><div className="app-qa-t">Scan Card</div><div className="app-qa-s">Find a member</div></div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* 2 — New Customer form */}
                <motion.div className="appmock" style={{ opacity: s1 }}>
                  <div className="app-head">
                    <div className="app-back"><svg viewBox="0 0 24 24" {...ic}><path d="m15 18-6-6 6-6" /></svg></div>
                    <div className="app-htitle">New Customer</div>
                    <div className="app-hsub">Register a new member for Daily Brew</div>
                  </div>
                  <div className="app-body">
                    <div className="app-section">Member details</div>
                    <div className="app-field"><div className="lab">First name</div><div className="val">Anna</div></div>
                    <div className="app-field"><div className="lab">Last name</div><div className="val">Grigoryan</div></div>
                    <div className="app-field"><div className="lab">Email address</div><div className="val">anna.g@email.com</div></div>
                    <div className="app-field"><div className="lab">Phone number</div><div className="val">+374 77 12 34 56</div></div>
                    <div className="app-cta">Create</div>
                  </div>
                </motion.div>

                {/* 3 — Customer Card, Digital Wallet tab, QR */}
                <motion.div className="appmock" style={{ opacity: s2 }}>
                  <div className="app-head">
                    <div className="app-back"><svg viewBox="0 0 24 24" {...ic}><path d="m15 18-6-6 6-6" /></svg></div>
                    <div className="app-htitle">Customer Card</div>
                  </div>
                  <div className="app-body">
                    <div className="app-tabs">
                      <div className="app-tab active"><svg viewBox="0 0 24 24" {...ic}><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></svg>Digital Wallet</div>
                      <div className="app-tab"><svg viewBox="0 0 24 24" {...ic}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>Physical Card</div>
                    </div>
                    <div className="app-qrtitle">Customer Scans to Add Card</div>
                    <div className="app-qrwrap"><QrCode size={132} /></div>
                    <div className="app-qrcap">They scan this on their own phone to add the OneBonus card to Google Wallet.</div>
                  </div>
                </motion.div>

                {/* 4 — Card added */}
                <motion.div className="appmock" style={{ opacity: s3 }}>
                  <div className="app-success">
                    <div className="app-check"><svg viewBox="0 0 24 24" {...ic} strokeWidth={3}><path d="M20 6 9 17l-5-5" /></svg></div>
                    <div>
                      <div style={{ fontWeight: 680, fontSize: 18 }}>Card added</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.45 }}>Anna added her OneBonus card to Google Wallet.</div>
                    </div>
                  </div>
                </motion.div>
              </Phone>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
