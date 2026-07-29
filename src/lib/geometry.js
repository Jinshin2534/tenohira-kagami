// 2D 幾何のユーティリティ。純粋関数のみ。
// 点は {x, y}、線は点の配列（ポリライン）で表す。

export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y })
export const scale = (a, k) => ({ x: a.x * k, y: a.y * k })
export const dot = (a, b) => a.x * b.x + a.y * b.y
export const cross = (a, b) => a.x * b.y - a.y * b.x
export const norm = (a) => Math.hypot(a.x, a.y)

export function normalize(a) {
  const n = norm(a)
  if (n === 0) return { x: 0, y: 0 }
  return { x: a.x / n, y: a.y / n }
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** ポリラインの弧長 */
export function polylineLength(points) {
  if (!points || points.length < 2) return 0
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i])
  return total
}

/** 始点と終点を結ぶ直線（弦）の長さ */
export function chordLength(points) {
  if (!points || points.length < 2) return 0
  return distance(points[0], points[points.length - 1])
}

/**
 * 弦からの符号付き最大ずれ。
 * 正 = 弦の進行方向に対して左側（反時計回り側）に膨らんでいる。
 * 戻り値は絶対量（座標系の単位そのまま）。
 */
export function signedBulge(points) {
  if (!points || points.length < 3) return 0
  const a = points[0]
  const b = points[points.length - 1]
  const ab = sub(b, a)
  const len = norm(ab)
  if (len === 0) return 0
  const u = scale(ab, 1 / len)
  let best = 0
  for (const p of points) {
    const d = cross(u, sub(p, a)) // 左側が正
    if (Math.abs(d) > Math.abs(best)) best = d
  }
  return best
}

/**
 * 曲がりの強さ。弦の長さで割った無次元量。
 * 0 に近いほど直線、大きいほど大きく弧を描く。
 */
export function curvature(points) {
  const c = chordLength(points)
  if (c === 0) return 0
  return signedBulge(points) / c
}

/** ポリラインの外接矩形 */
export function boundingBox(points) {
  if (!points || points.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/**
 * 折れ点を間引く（Ramer-Douglas-Peucker）。
 * なぞり入力のノイズを落として特徴量を安定させる。
 */
export function simplify(points, tolerance = 0.005) {
  if (!points || points.length < 3) return points ? [...points] : []
  const first = 0
  const last = points.length - 1
  const keep = new Array(points.length).fill(false)
  keep[first] = true
  keep[last] = true

  const stack = [[first, last]]
  while (stack.length) {
    const [s, e] = stack.pop()
    let maxDist = -1
    let index = -1
    const a = points[s]
    const b = points[e]
    const ab = sub(b, a)
    const len = norm(ab)
    for (let i = s + 1; i < e; i++) {
      const p = points[i]
      const d = len === 0 ? distance(p, a) : Math.abs(cross(scale(ab, 1 / len), sub(p, a)))
      if (d > maxDist) {
        maxDist = d
        index = i
      }
    }
    if (maxDist > tolerance && index > 0) {
      keep[index] = true
      stack.push([s, index], [index, e])
    }
  }
  return points.filter((_, i) => keep[i])
}
