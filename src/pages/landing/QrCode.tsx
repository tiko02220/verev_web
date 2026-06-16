const N = 25

function Finder({ x, y, c }: { x: number; y: number; c: number }) {
  return (
    <>
      <rect x={x * c} y={y * c} width={7 * c} height={7 * c} rx={c} fill="#0b0b0b" />
      <rect x={(x + 1) * c} y={(y + 1) * c} width={5 * c} height={5 * c} rx={c * 0.6} fill="#fff" />
      <rect x={(x + 2) * c} y={(y + 2) * c} width={3 * c} height={3 * c} rx={c * 0.4} fill="#0b0b0b" />
    </>
  )
}

export default function QrCode({ size = 150 }: { size?: number }) {
  const c = size / N
  const isFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
  const mods: [number, number][] = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (isFinder(x, y)) continue
      if ((x * 7 + y * 5 + x * y) % 3 === 0) mods.push([x, y])
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      {mods.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x * c} y={y * c} width={c} height={c} fill="#0b0b0b" />
      ))}
      <Finder x={0} y={0} c={c} />
      <Finder x={N - 7} y={0} c={c} />
      <Finder x={0} y={N - 7} c={c} />
    </svg>
  )
}
