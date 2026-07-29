// テストとデモで使う、掌座標系の合成手相データ。
// 実写真がなくても判定ロジックを回せるようにしておく。

/** 円弧上の点列。角度は度数法 */
export function arc(center, radius, fromDeg, toDeg, steps = 24) {
  const points = []
  for (let i = 0; i <= steps; i++) {
    const t = fromDeg + ((toDeg - fromDeg) * i) / steps
    const rad = (t * Math.PI) / 180
    points.push({ x: center.x + radius * Math.cos(rad), y: center.y + radius * Math.sin(rad) })
  }
  return points
}

/** 直線を等分割した点列 */
export function segment(a, b, steps = 12) {
  const points = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  return points
}

/** 標準的な手相のサンプル（掌座標系のストローク） */
export const SAMPLE_PALM = {
  life: [arc({ x: 0.15, y: 0.45 }, 0.42, 60, -75)],
  head: [segment({ x: 0.30, y: 0.62 }, { x: -0.55, y: 0.42 })],
  heart: [segment({ x: -0.55, y: 0.75 }, { x: 0.30, y: 0.88 })],
  fate: [segment({ x: 0.02, y: 0.10 }, { x: 0.05, y: 0.85 })],
}
