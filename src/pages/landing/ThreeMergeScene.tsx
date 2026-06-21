import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from 'motion/react'

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const D = Math.PI / 180

function applyOpacity(m: THREE.Material | null, op: number) {
  if (!m) return
  const t = op < 0.999
  if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true }
  m.opacity = op
  m.depthWrite = !t
}

type Card = { name: string; cat: string; mark: string; num: string; bg: [string, string] }
const MERCHANTS: Card[] = [
  { name: 'Daily Brew', cat: 'CAFÉ', mark: 'D', num: '•••• 4821', bg: ['#c08a4e', '#6b4527'] },
  { name: 'FreshMart', cat: 'GROCERY', mark: 'F', num: '•••• 2093', bg: ['#2bc488', '#13684a'] },
  { name: 'Lumière', cat: 'BEAUTY', mark: 'L', num: '•••• 7754', bg: ['#d072d6', '#6a3275'] },
  { name: 'PulseGym', cat: 'FITNESS', mark: 'P', num: '•••• 0156', bg: ['#f58a55', '#9c3a24'] },
  { name: 'MediPlus', cat: 'PHARMACY', mark: 'M', num: '•••• 3390', bg: ['#5c93f0', '#2a4a94'] },
  { name: 'Pageturner', cat: 'BOOKS', mark: 'P', num: '•••• 6612', bg: ['#867ef2', '#383094'] },
]
const OB: Card = { name: 'OneBonus', cat: 'UNIVERSAL', mark: '', num: '•••• •••• •••• 0148', bg: ['#34e3a2', '#0c5236'] }

// chaotic 3D scatter (world units) + rotation (deg)
const POSE = [
  { x: -3.6, y: 0.5, z: -2.4, rx: 34, ry: -44, rz: -19 },
  { x: 1.8, y: 1.3, z: -0.6, rx: -27, ry: 39, rz: 23 },
  { x: -2.3, y: -1.2, z: 0.9, rx: 42, ry: 19, rz: -26 },
  { x: 3.3, y: -0.3, z: -1.7, rx: -37, ry: -29, rz: 13 },
  { x: -1.0, y: -1.7, z: 1.4, rx: 21, ry: 46, rz: -9 },
  { x: 2.7, y: -1.5, z: -0.2, rx: -44, ry: -15, rz: 29 },
]
const LEV = [
  { ax: 0.18, ay: 0.22, sx: 0.4, sy: 0.5, ph: 0 },
  { ax: 0.22, ay: 0.16, sx: 0.55, sy: 0.4, ph: 1.7 },
  { ax: 0.15, ay: 0.24, sx: 0.34, sy: 0.58, ph: 3.1 },
  { ax: 0.2, ay: 0.18, sx: 0.58, sy: 0.44, ph: 4.6 },
  { ax: 0.16, ay: 0.23, sx: 0.46, sy: 0.54, ph: 2.2 },
  { ax: 0.21, ay: 0.17, sx: 0.5, sy: 0.42, ph: 5.4 },
]

function roundRect(x: CanvasRenderingContext2D, rx: number, ry: number, w: number, h: number, r: number) {
  x.beginPath()
  x.moveTo(rx + r, ry)
  x.arcTo(rx + w, ry, rx + w, ry + h, r)
  x.arcTo(rx + w, ry + h, rx, ry + h, r)
  x.arcTo(rx, ry + h, rx, ry, r)
  x.arcTo(rx, ry, rx + w, ry, r)
  x.closePath()
}

function drawChip(x: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number) {
  const cg = x.createLinearGradient(cx, cy, cx + cw, cy + ch)
  cg.addColorStop(0, '#fdedba'); cg.addColorStop(0.45, '#e6c878'); cg.addColorStop(0.55, '#cba94f'); cg.addColorStop(1, '#9d7a2e')
  roundRect(x, cx, cy, cw, ch, 16); x.fillStyle = cg; x.fill()
  x.strokeStyle = 'rgba(120,84,20,0.5)'; x.lineWidth = 3
  x.beginPath(); x.moveTo(cx, cy + ch / 2); x.lineTo(cx + cw, cy + ch / 2); x.stroke()
  x.beginPath(); x.moveTo(cx + cw * 0.32, cy); x.lineTo(cx + cw * 0.32, cy + ch); x.stroke()
  x.beginPath(); x.moveTo(cx + cw * 0.68, cy); x.lineTo(cx + cw * 0.68, cy + ch); x.stroke()
  roundRect(x, cx + cw * 0.34, cy + 22, cw * 0.32, ch - 44, 8); x.stroke()
}

function roundedCardGeo(w: number, h: number, r: number, depth = 0): THREE.BufferGeometry {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  let geo: THREE.BufferGeometry
  if (depth > 0) {
    geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 3, curveSegments: 22 })
    geo.center()
  } else {
    geo = new THREE.ShapeGeometry(s, 22)
  }
  const pos = geo.attributes.position
  const uv = geo.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h)
  uv.needsUpdate = true
  return geo
}
const CARD_GEO = roundedCardGeo(3, 1.893, 0.14, 0.07)

function makeTexture(card: Card, ob: boolean): THREE.CanvasTexture {
  const W = 1024, H = 646, P = 70
  const font = '-apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif'
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const x = cv.getContext('2d')!
  const g = x.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, card.bg[0]); g.addColorStop(0.55, card.bg[0]); g.addColorStop(1, card.bg[1])
  x.fillStyle = g; x.fillRect(0, 0, W, H)
  x.save(); x.strokeStyle = 'rgba(255,255,255,0.025)'; x.lineWidth = 1.4
  for (let k = 0; k < 9; k++) {
    x.beginPath()
    for (let px = 0; px <= W; px += 8) {
      const py = H * 0.16 + k * 56 + Math.sin(px / 95 + k * 0.6) * 24 + Math.sin(px / 240) * 34
      if (px === 0) x.moveTo(px, py); else x.lineTo(px, py)
    }
    x.stroke()
  }
  x.restore()
  if (ob) {
    x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 2.4
    for (let r = 40; r <= 300; r += 38) { x.beginPath(); x.arc(W * 0.76, H * 0.46, r, 0, Math.PI * 2); x.stroke() }
  } else {
    x.fillStyle = 'rgba(255,255,255,0.06)'; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.font = `800 380px ${font}`; x.fillText(card.mark, W * 0.76, H * 0.54)
  }
  // top-left sheen
  const sh = x.createLinearGradient(0, 0, W * 0.7, H * 0.5)
  sh.addColorStop(0, 'rgba(255,255,255,0.32)'); sh.addColorStop(0.4, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = sh; x.fillRect(0, 0, W, H)
  const ed = x.createLinearGradient(0, 0, 0, H)
  ed.addColorStop(0, 'rgba(255,255,255,0.22)'); ed.addColorStop(0.5, 'rgba(255,255,255,0.06)'); ed.addColorStop(1, 'rgba(255,255,255,0.1)')
  x.strokeStyle = ed; x.lineWidth = 2.5
  roundRect(x, 3, 3, W - 6, H - 6, 34); x.stroke()
  x.textBaseline = 'alphabetic'
  if (ob) {
    x.textAlign = 'left'; x.font = `600 56px ${font}`
    x.fillStyle = '#fff'; x.fillText('One', P, P + 44)
    const ow = x.measureText('One ').width
    x.fillStyle = '#ffc44d'; x.fillText('Bonus', P + ow, P + 44)
  } else {
    roundRect(x, P, P, 76, 76, 18); x.fillStyle = 'rgba(255,255,255,0.24)'; x.fill()
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.font = `800 40px ${font}`; x.fillText(card.mark, P + 38, P + 40)
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'
    x.font = `660 44px ${font}`; x.fillText(card.name, P + 96, P + 30)
    x.font = `600 20px ${font}`; x.fillStyle = 'rgba(255,255,255,0.74)'
    x.fillText(card.cat.split('').join(' '), P + 96, P + 62)
  }
  x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 5; x.lineCap = 'round'
  for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(W - P - 6, P + 36, 14 + i * 12, -0.62, 0.62); x.stroke() }
  drawChip(x, P, ob ? 196 : 200, 150, 112)
  x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = '#fff'
  x.font = `600 ${ob ? 58 : 52}px ${font}`; x.fillText(card.num, P, H - 138)
  x.font = `600 22px ${font}`; x.fillStyle = 'rgba(255,255,255,0.66)'
  x.fillText(ob ? 'MEMBERSHIP' : 'LOYALTY CARD', P, H - 84)
  if (ob) {
    x.fillStyle = '#fff'; x.font = `640 42px ${font}`; x.fillText('Universal', P, H - 38)
    x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,0.62)'; x.font = `600 22px ${font}`
    x.fillText('ONE BONUS NETWORK', W - P, H - 42)
  } else {
    x.fillStyle = '#fff'; x.font = `620 30px ${font}`; x.fillText('Member', P, H - 40)
    x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = `600 20px ${font}`
    x.fillText(card.name.toUpperCase(), W - P, H - 42)
  }
  const t = new THREE.CanvasTexture(cv)
  t.anisotropy = 16
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function CardMesh({ tex, idx, prog, ob }: { tex: THREE.CanvasTexture; idx: number; prog: { current: number }; ob?: boolean }) {
  const grp = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshPhysicalMaterial>(null)
  const c = POSE[idx] ?? POSE[0]
  const l = LEV[idx] ?? LEV[0]
  const eStart = idx * 0.03

  useFrame((state) => {
    if (!grp.current) return
    const p = prog.current
    const tm = state.clock.elapsedTime
    const TILT_X = 16 * D
    if (ob) {
      const flip = clamp01((p - 0.7) / 0.06)
      const fly = easeInOut(clamp01((p - 0.85) / 0.13))
      const flipRY = flip * Math.PI - Math.PI
      grp.current.position.set(0, lerp(-0.2, 1.0, fly), 0.12)
      grp.current.rotation.set(TILT_X, lerp(flipRY, -5 * D, fly), 0)
      grp.current.scale.setScalar(lerp(1, 0.62, fly) * (1 - 0.12 * Math.sin(flip * Math.PI) * (1 - fly)))
      applyOpacity(mat.current, clamp01((flip - 0.45) / 0.1))
      return
    }
    const e = easeOut(clamp01((p - eStart) / 0.12))
    const gStart = 0.4 + idx * 0.012
    const gp = easeInOut(clamp01((p - gStart) / 0.18))
    const gr = easeInOut(clamp01((p - 0.28) / 0.1))
    const gc = easeInOut(clamp01((p - 0.62) / 0.1))
    const flip = clamp01((p - 0.7) / 0.06)
    const dr = idx === 1 ? 2 : idx === 2 ? 1 : idx
    const o = dr - 2.5
    const lev = (1 - gp) * e
    const lx = Math.sin(tm * l.sx + l.ph) * l.ax * lev
    const ly = Math.cos(tm * l.sy + l.ph) * l.ay * lev
    const towerX = o * 0.06
    const towerY = -o * 0.42 + 0.15
    const towerZ = -o * 0.3
    const chaosZ = 2.4 - dr * 0.95
    grp.current.position.set(
      lerp(lerp(c.x * 1.35, towerX, gp) + lx, 0, gc),
      lerp(lerp(c.y * 1.3, towerY, gp) + (1 - e) * -0.6 + ly, -0.2, gc),
      lerp(lerp(chaosZ, towerZ, gp), -dr * 0.09, gc),
    )
    grp.current.rotation.set(
      lerp(lerp(c.rx * 0.5 * D, 22 * D, gr), TILT_X, gc),
      lerp(c.ry * 0.5 * D, -5 * D, gr) + flip * Math.PI,
      lerp(c.rz * 0.5 * D, 0, gr),
    )
    grp.current.scale.setScalar(lerp(0.6, 1, e) * (1 - 0.12 * Math.sin(flip * Math.PI)))
    const op = clamp01((p - eStart) / 0.12) * (1 - clamp01((flip - 0.45) / 0.1))
    applyOpacity(mat.current, op)
  })

  return (
    <group ref={grp}>
      <mesh geometry={CARD_GEO}>
        <meshPhysicalMaterial ref={mat} map={tex} roughness={0.32} metalness={0.1} clearcoat={0.8} clearcoatRoughness={0.18} envMapIntensity={0.9} transparent />
      </mesh>
    </group>
  )
}

function CameraRig({ prog }: { prog: { current: number } }) {
  useFrame((state) => {
    const camera = state.camera
    const size = state.size
    const p = prog.current
    const aspect = size.width / size.height
    const zBase = aspect < 0.85 ? 15 : aspect < 1.3 ? 13 : 11.5
    const intro = easeOut(clamp01(p / 0.22))
    const push = easeInOut(clamp01((p - 0.56) / 0.22))
    const frame = easeInOut(clamp01((p - 0.82) / 0.14))
    camera.position.x = Math.sin(clamp01(p / 0.82) * Math.PI) * 0.7
    camera.position.y = lerp(lerp(2.5, 1.25, push), 0.35, frame)
    camera.position.z = lerp(zBase + (1 - intro) * 1.3 - push * 1.9, zBase + 4.6, frame)
    camera.lookAt(0, lerp(-0.18, 0.45, frame), 0)
    camera.updateProjectionMatrix()
  })
  return null
}

function makePhoneScreen(): THREE.CanvasTexture {
  const W = 600, H = 1288
  const font = '-apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif'
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const x = cv.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#16271f'); g.addColorStop(0.5, '#0c1714'); g.addColorStop(1, '#0a1310')
  x.fillStyle = g; x.fillRect(0, 0, W, H)
  const rg = x.createRadialGradient(W / 2, 120, 0, W / 2, 120, 460)
  rg.addColorStop(0, 'rgba(52,224,138,0.14)'); rg.addColorStop(1, 'rgba(52,224,138,0)')
  x.fillStyle = rg; x.fillRect(0, 0, W, 300)
  x.fillStyle = '#fff'; x.textBaseline = 'middle'
  x.font = `600 28px ${font}`; x.textAlign = 'left'; x.fillText('9:41', 52, 62)
  x.textAlign = 'right'; x.font = `600 26px ${font}`; x.fillText('5G', W - 116, 62)
  roundRect(x, W - 92, 50, 42, 22, 6); x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 2.4; x.stroke()
  x.fillStyle = '#fff'; roundRect(x, W - 88, 53, 30, 16, 3); x.fill()
  x.fillStyle = '#000'; roundRect(x, W / 2 - 74, 32, 148, 40, 20); x.fill()
  x.textAlign = 'left'; x.textBaseline = 'alphabetic'
  x.fillStyle = '#fff'; x.font = `700 70px ${font}`; x.fillText('Wallet', 52, 178)
  x.fillStyle = '#34e08a'; x.font = `600 30px ${font}`; x.fillText('OneBonus network', 52, 222)
  x.fillStyle = 'rgba(255,255,255,0.38)'; x.font = `700 24px ${font}`; x.fillText('R E C E N T', 52, 556)
  const names = ['Daily Brew', 'FreshMart', 'PulseGym']
  const subs = ['Café · today', 'Grocery · today', 'Fitness · yesterday']
  const amts = ['+50', '+20', '✓']
  const marks = ['D', 'F', 'P']
  const ic: [string, string][] = [['#c08a4e', '#6b4527'], ['#2bc488', '#13684a'], ['#f58a55', '#9c3a24']]
  for (let i = 0; i < 3; i++) {
    const ry = 588 + i * 132
    roundRect(x, 44, ry, W - 88, 108, 28); x.fillStyle = 'rgba(255,255,255,0.06)'; x.fill()
    const ig = x.createLinearGradient(72, ry + 22, 132, ry + 86)
    ig.addColorStop(0, ic[i][0]); ig.addColorStop(1, ic[i][1])
    x.beginPath(); x.arc(106, ry + 54, 34, 0, Math.PI * 2); x.fillStyle = ig; x.fill()
    x.fillStyle = '#fff'; x.font = `700 30px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(marks[i], 106, ry + 55)
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.font = `600 30px ${font}`; x.fillText(names[i], 162, ry + 48)
    x.fillStyle = 'rgba(255,255,255,0.4)'; x.font = `500 22px ${font}`; x.fillText(subs[i], 162, ry + 80)
    x.fillStyle = '#34e08a'; x.font = `700 30px ${font}`; x.textAlign = 'right'; x.fillText(amts[i], W - 76, ry + 64); x.textAlign = 'left'
  }
  x.fillStyle = 'rgba(255,255,255,0.5)'; roundRect(x, W / 2 - 72, H - 34, 144, 9, 4); x.fill()
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 16; t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Phone({ prog }: { prog: { current: number } }) {
  const grp = useRef<THREE.Group>(null)
  const scrMat = useRef<THREE.MeshBasicMaterial>(null)
  const screen = useMemo(() => makePhoneScreen(), [])
  const { scene } = useGLTF('/models/phone.glb', true)
  const fit = useMemo(() => {
    const m = scene.clone(true)
    m.rotation.y = Math.PI
    m.updateMatrixWorld(true)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((raw) => {
        const sm = raw as THREE.MeshStandardMaterial
        if ('envMapIntensity' in sm) sm.envMapIntensity = 0.35
        if ('roughness' in sm && sm.roughness != null) sm.roughness = Math.min(1, sm.roughness + 0.25)
      })
    })
    const box = new THREE.Box3().setFromObject(m)
    const size = new THREE.Vector3(); box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    const k = 7 / size.y
    const wrap = new THREE.Group()
    wrap.add(m)
    wrap.scale.setScalar(k)
    wrap.position.set(-center.x * k, -center.y * k, -center.z * k)
    return { model: wrap, frontZ: (size.z * k) / 2, screenGeo: roundedCardGeo(size.x * k * 0.9, size.y * k * 0.935, 0.42) }
  }, [scene])
  useEffect(() => () => screen.dispose(), [screen])
  useFrame(() => {
    if (!grp.current) return
    const p = prog.current
    const appear = clamp01((p - 0.85) / 0.12)
    grp.current.visible = appear > 0.001
    grp.current.position.set(0, lerp(-0.5, -0.35, easeOut(appear)), -0.7)
    grp.current.scale.setScalar(0.86 * lerp(0.9, 1, easeOutBack(appear)))
    grp.current.rotation.set(8 * D, -5 * D, 0)
    applyOpacity(scrMat.current, clamp01((p - 0.85) / 0.07))
  })
  return (
    <group ref={grp} visible={false}>
      <primitive object={fit.model} />
      <mesh geometry={fit.screenGeo} position={[0, 0, fit.frontZ + 0.04]}>
        <meshBasicMaterial ref={scrMat} map={screen} toneMapped={false} transparent polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
    </group>
  )
}
useGLTF.preload('/models/phone.glb', true)

function Scene({ prog }: { prog: { current: number } }) {
  const merchantTex = useMemo(() => MERCHANTS.map((m) => makeTexture(m, false)), [])
  const obTex = useMemo(() => makeTexture(OB, true), [])
  useEffect(() => () => { merchantTex.forEach((t) => t.dispose()); obTex.dispose() }, [merchantTex, obTex])
  return (
    <>
      <CameraRig prog={prog} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 7]} intensity={1.3} color="#ffffff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3.2} position={[0, 4, 5]} scale={[10, 5, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2} position={[-6, 1, 3]} rotation={[0, Math.PI / 3, 0]} scale={[5, 8, 1]} color="#cfeaff" />
        <Lightformer form="rect" intensity={1.6} position={[6, 0, 3]} rotation={[0, -Math.PI / 3, 0]} scale={[4, 8, 1]} color="#a7ffcf" />
        <Lightformer form="ring" intensity={1.4} position={[1, -2, 6]} scale={5} color="#34e08a" />
      </Environment>
      {MERCHANTS.map((_m, i) => (
        <CardMesh key={i} tex={merchantTex[i]} idx={i} prog={prog} />
      ))}
      <CardMesh tex={obTex} idx={0} prog={prog} ob />
      <Phone prog={prog} />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.82} luminanceSmoothing={0.2} intensity={0.35} mipmapBlur />
        <SMAA />
      </EffectComposer>
    </>
  )
}

export default function ThreeMergeScene() {
  const ref = useRef<HTMLElement>(null)
  const prog = useRef(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 320, damping: 40, mass: 0.3 })
  useMotionValueEvent(p, 'change', (v) => { prog.current = v })

  const capA = useTransform(p, [0, 0.05, 0.3, 0.36], [0, 1, 1, 0])
  const capB = useTransform(p, [0.36, 0.42, 0.6, 0.66], [0, 1, 1, 0])
  const capC = useTransform(p, [0.66, 0.71, 0.8, 0.84], [0, 1, 1, 0])
  const capD = useTransform(p, [0.86, 0.91, 1, 1], [0, 1, 1, 1])
  const debug = typeof window !== 'undefined' && window.location.hash.includes('debug')
  const progText = useTransform(p, (v) => `merge ${v.toFixed(3)}`)

  return (
    <section className="scene" ref={ref} style={{ height: '440vh' }}>
      <div className="scene-sticky">
        {debug && (
          <motion.div style={{ position: 'fixed', top: 80, left: 16, zIndex: 60, color: '#34e08a', font: '700 15px ui-monospace, monospace', background: 'rgba(0,0,0,0.7)', padding: '6px 10px', borderRadius: 8, pointerEvents: 'none' }}>
            {progText}
          </motion.div>
        )}
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
              <div className="scene-step-eyebrow">In their pocket</div>
              <h2 className="title-2">Always in their wallet.</h2>
              <p className="intro" style={{ marginTop: 10 }}>Google Wallet &amp; Apple Wallet — tap and go.</p>
            </motion.div>
          </div>
        </div>
        <div className="three-stage">
          <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} camera={{ position: [0, 2, 11.5], fov: 42 }}>
            <Scene prog={prog} />
          </Canvas>
        </div>
      </div>
    </section>
  )
}
