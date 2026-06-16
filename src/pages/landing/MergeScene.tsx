import { Component, Suspense, lazy, type ReactNode } from 'react'
import MergeWalletScene from './MergeWalletScene'

const ThreeMergeScene = lazy(() => import('./ThreeMergeScene'))

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <MergeWalletScene /> : this.props.children
  }
}

// Real 3D (WebGL) merge scene; falls back to the CSS scene while loading or if WebGL is unavailable.
export default function MergeScene() {
  return (
    <Boundary>
      <Suspense fallback={<MergeWalletScene />}>
        <ThreeMergeScene />
      </Suspense>
    </Boundary>
  )
}
