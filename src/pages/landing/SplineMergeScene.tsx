import { Suspense, lazy, useRef } from 'react'
import { useScroll, useSpring, useMotionValueEvent } from 'motion/react'
import type { Application } from '@splinetool/runtime'
import MergeWalletScene from './MergeWalletScene'

const Spline = lazy(() => import('@splinetool/react-spline'))
const SCENE = import.meta.env.VITE_SPLINE_MERGE_URL as string | undefined

export default function SplineMergeScene() {
  // Until a published Spline scene URL is set, fall back to the CSS scene so nothing breaks.
  if (!SCENE) return <MergeWalletScene />
  return <SplineImpl scene={SCENE} />
}

function SplineImpl({ scene }: { scene: string }) {
  const ref = useRef<HTMLElement>(null)
  const app = useRef<Application | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 300, damping: 40, mass: 0.3 })

  // Drive a number variable named "progress" (0..1) in the Spline scene; bind it to the
  // animation timeline in the Spline editor so the whole merge scrubs with scroll.
  useMotionValueEvent(p, 'change', (v) => {
    app.current?.setVariable?.('progress', v)
  })

  return (
    <section className="scene" ref={ref} style={{ height: '340vh' }}>
      <div className="scene-sticky spline-stage">
        <Suspense fallback={null}>
          <Spline
            scene={scene}
            onLoad={(a) => { app.current = a }}
            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
          />
        </Suspense>
      </div>
    </section>
  )
}
