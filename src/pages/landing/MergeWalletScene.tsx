import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTime, useTransform, type MotionValue } from 'motion/react'
import OneBonusCard from './OneBonusCard'
import MerchantCard, { type Merchant } from './MerchantCard'
import WalletPass from './WalletPass'
import Phone from './Phone'

const BASE = 150
const SY = -72
// the assembled "exploded tower" viewed from a 3/4 angle above (Microsoft-style stack)
const STK_RX = 56
const STK_RY = -5
const GAP_Y = 44
const GAP_Z = 30

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

const MERCHANTS: Merchant[] = [
  { name: 'Daily Brew', cat: 'Café', mark: 'D', num: '4821', grad: 'linear-gradient(140deg,#a06d3c,#3a2417)' },
  { name: 'FreshMart', cat: 'Grocery', mark: 'F', num: '2093', grad: 'linear-gradient(140deg,#23a673,#0a4632)' },
  { name: 'Lumière', cat: 'Beauty', mark: 'L', num: '7754', grad: 'linear-gradient(140deg,#bd5fc4,#46204f)' },
  { name: 'PulseGym', cat: 'Fitness', mark: 'P', num: '0156', grad: 'linear-gradient(140deg,#e87a48,#722619)' },
  { name: 'MediPlus', cat: 'Pharmacy', mark: 'M', num: '3390', grad: 'linear-gradient(140deg,#4a84e6,#172a63)' },
  { name: 'Pageturner', cat: 'Books', mark: 'P', num: '6612', grad: 'linear-gradient(140deg,#6f68e6,#221d63)' },
]

// genuinely chaotic 3D scatter — asymmetric positions, wild rotations, varied depths
const POSE = [
  { px: -350, py: -40, pz: -440, rx: 34, ry: -44, rz: -19 },
  { px: 168, py: -120, pz: -110, rx: -27, ry: 39, rz: 23 },
  { px: -214, py: 110, pz: 150, rx: 42, ry: 19, rz: -26 },
  { px: 330, py: 36, pz: -300, rx: -37, ry: -29, rz: 13 },
  { px: -96, py: 150, pz: 250, rx: 21, ry: 46, rz: -9 },
  { px: 262, py: 132, pz: -30, rx: -44, ry: -15, rz: 29 },
]
const LEV = [
  { ax: 20, ay: 24, az: 44, ar: 8, sx: 0.33, sy: 0.47, sz: 0.4, ph: 0.0 },
  { ax: 24, ay: 18, az: 38, ar: 7, sx: 0.52, sy: 0.37, sz: 0.45, ph: 1.7 },
  { ax: 16, ay: 26, az: 50, ar: 9, sx: 0.29, sy: 0.55, sz: 0.35, ph: 3.1 },
  { ax: 22, ay: 19, az: 36, ar: 7.5, sx: 0.55, sy: 0.41, sz: 0.5, ph: 4.6 },
  { ax: 17, ay: 25, az: 48, ar: 8.5, sx: 0.43, sy: 0.51, sz: 0.31, ph: 2.2 },
  { ax: 23, ay: 18, az: 34, ar: 7, sx: 0.47, sy: 0.39, sz: 0.49, ph: 5.4 },
]

function Card3D({ p, time, m, idx, k }: { p: MotionValue<number>; time: MotionValue<number>; m: Merchant; idx: number; k: number }) {
  const c = POSE[idx]
  const l = LEV[idx]
  const o = idx - 2.5
  const eStart = idx * 0.03
  const eEnd = eStart + 0.18
  const gStart = 0.36 + idx * 0.012
  const gEnd = gStart + 0.2
  // assembled tower target
  const tx = o * 6
  const ty = o * GAP_Y + SY
  const tz = o * -GAP_Z

  const cStart = 0.66
  const cEnd = 0.8

  const e = (pv: number) => easeOut(clamp01((pv - eStart) / (eEnd - eStart)))
  const gp = (pv: number) => easeInOut(clamp01((pv - gStart) / (gEnd - gStart)))
  // rotations resolve to parallel BEFORE positions stack -> tilted planes never intersect
  const gr = (pv: number) => easeInOut(clamp01((pv - gStart) / ((gEnd - gStart) * 0.55)))
  // compress: the assembled tower collapses + straightens into one, fusing into the OneBonus card
  const gc = (pv: number) => easeInOut(clamp01((pv - cStart) / (cEnd - cStart)))

  const x = useTransform([p, time], ([pv, tv]: number[]) => {
    const g = gp(pv), c2 = gc(pv), ee = e(pv), t = tv / 1000
    const xt = (c.px * k) * (1 - g) + tx * g + Math.sin(t * l.sx + l.ph) * l.ax * (1 - g) * ee
    return xt * (1 - c2)
  })
  const y = useTransform([p, time], ([pv, tv]: number[]) => {
    const g = gp(pv), c2 = gc(pv), ee = e(pv), t = tv / 1000
    const yt = (c.py + BASE) * (1 - g) + ty * g + (1 - ee) * 70 + Math.cos(t * l.sy + l.ph) * l.ay * (1 - g) * ee
    return yt * (1 - c2)
  })
  const z = useTransform([p, time], ([pv, tv]: number[]) => {
    const g = gp(pv), c2 = gc(pv), ee = e(pv), t = tv / 1000
    const zt = c.pz * (1 - g) + tz * g + Math.sin(t * l.sz + l.ph * 1.3) * l.az * (1 - g) * ee
    return zt * (1 - c2)
  })
  const rotateX = useTransform([p, time], ([pv, tv]: number[]) => {
    const r = gr(pv), c2 = gc(pv), ee = e(pv), t = tv / 1000
    return ((c.rx + Math.sin(t * l.sx + l.ph) * l.ar) * (1 - r) * ee + STK_RX * r) * (1 - c2)
  })
  const rotateY = useTransform([p, time], ([pv, tv]: number[]) => {
    const r = gr(pv), c2 = gc(pv), ee = e(pv), t = tv / 1000
    return ((c.ry + Math.cos(t * l.sy + l.ph) * l.ar) * (1 - r) * ee + STK_RY * r) * (1 - c2)
  })
  const rotateZ = useTransform([p, time], ([pv, tv]: number[]) => {
    const r = gr(pv), c2 = gc(pv), ee = e(pv), t = tv / 1000
    return ((c.rz + Math.sin(t * l.sz + l.ph) * (l.ar * 0.5)) * (1 - r) * ee) * (1 - c2)
  })
  const scale = useTransform(p, (pv) => k * (0.6 + 0.4 * e(pv)) * (1 - gc(pv) * 0.06))
  const opacity = useTransform(p, [eStart, eEnd, 0.76, 0.82], [0, 1, 1, 0])

  return (
    <motion.div className="card3d" style={{ x, y, z, rotateX, rotateY, rotateZ, scale, opacity }}>
      <MerchantCard m={m} />
    </motion.div>
  )
}

export default function MergeWalletScene() {
  const ref = useRef<HTMLElement>(null)
  const [k, setK] = useState(1)
  useEffect(() => {
    const upd = () => setK(Math.max(0.5, Math.min(1, window.innerWidth / 1180)))
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  const time = useTime()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 340, damping: 42, mass: 0.3, restDelta: 0.0004 })

  const capA = useTransform(p, [0, 0.05, 0.34, 0.4], [0, 1, 1, 0])
  const capB = useTransform(p, [0.4, 0.47, 0.62, 0.68], [0, 1, 1, 0])
  const capC = useTransform(p, [0.78, 0.83, 0.88, 0.93], [0, 1, 1, 0])
  const capD = useTransform(p, [0.93, 0.97, 1, 1], [0, 1, 1, 1])

  // OneBonus card emerges face-on from the compressed stack (same spot), then recedes into the phone
  const obRotateX = useTransform(p, [0.74, 0.9, 1], [13, 3, 0])
  const obRotateY = useTransform(p, [0.74, 1], [-8, 0])
  const obScale = useTransform(p, [0.74, 0.84, 0.93, 1], [0.8, 1.04, 1, 0.54])
  const obOpacity = useTransform(p, [0.76, 0.84, 0.93, 0.98], [0, 1, 1, 0])
  const obY = useTransform(p, [0.74, 0.93, 1], [0, 0, -110])
  const obZ = useTransform(p, [0.74, 0.86, 1], [-20, 0, 130])

  const sweepX = useTransform(p, [0.82, 0.92], ['-130%', '130%'])
  const sweepOpacity = useTransform(p, [0.8, 0.86, 0.92], [0, 0.85, 0])

  const phoneY = useTransform(p, [0.88, 0.99], [920, 124])
  const phoneScale = useTransform(p, [0.88, 0.99], [0.94, 1])
  const phoneOpacity = useTransform(p, [0.88, 0.94], [0, 1])

  const passOpacity = useTransform(p, [0.95, 1], [0, 1])
  const passY = useTransform(p, [0.95, 1], [16, 0])

  return (
    <section className="scene" ref={ref} style={{ height: '380vh' }}>
      <div className="scene-sticky">
        <div className="scene-mesh" />

        <div className="scene-cap">
          <div className="scene-cap-stack">
            <motion.div className="scene-cap-item" style={{ opacity: capA }}>
              <div className="scene-step-eyebrow">The problem</div>
              <h2 className="title-2">A wallet full of cards.</h2>
              <p className="intro" style={{ marginTop: 10 }}>Every shop hands out its own.</p>
            </motion.div>
            <motion.div className="scene-cap-item" style={{ opacity: capB }}>
              <div className="scene-step-eyebrow">The shift</div>
              <h2 className="title-2">They come together.</h2>
              <p className="intro" style={{ marginTop: 10 }}>Every merchant on the network, merged onto a single identity.</p>
            </motion.div>
            <motion.div className="scene-cap-item" style={{ opacity: capC }}>
              <div className="scene-step-eyebrow">One card</div>
              <h2 className="title-2"><span className="grad-text">Every merchant. One card.</span></h2>
              <p className="intro" style={{ marginTop: 10 }}>No app to install. No plastic to carry.</p>
            </motion.div>
            <motion.div className="scene-cap-item" style={{ opacity: capD }}>
              <div className="scene-step-eyebrow">Always with them</div>
              <h2 className="title-2">Right in their wallet.</h2>
              <p className="intro" style={{ marginTop: 10 }}>Google Wallet, Apple Wallet, NFC and barcode — always one tap away.</p>
            </motion.div>
          </div>
        </div>

        <div className="merge-arena">
          {MERCHANTS.map((m, i) => (
            <Card3D key={m.name} p={p} time={time} m={m} idx={i} k={k} />
          ))}
          <motion.div className="card3d card3d-ob" style={{ y: obY, z: obZ, rotateX: obRotateX, rotateY: obRotateY, scale: obScale, opacity: obOpacity }}>
            <OneBonusCard />
            <div className="merge-sweep-clip">
              <motion.div className="merge-sweep" style={{ x: sweepX, opacity: sweepOpacity }} />
            </div>
          </motion.div>
        </div>

        <div className="merge-phone-layer">
          <motion.div style={{ y: phoneY, scale: phoneScale, opacity: phoneOpacity }}>
            <Phone>
              <div className="wallet-head"><h4>Wallet</h4><p>1 pass</p></div>
              <div className="wallet-slot">
                <motion.div style={{ opacity: passOpacity, y: passY }}>
                  <WalletPass />
                </motion.div>
              </div>
            </Phone>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
