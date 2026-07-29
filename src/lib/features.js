// なぞった線（掌座標系）から特徴量を取り出す。
//
// ユーザーは線をどちら向きに描くか分からないし、途切れた線を
// 2ストローク以上に分けて描くこともある。ここで向きを正規化し、
// ストローク数を「切れ目」として拾う。

import { polylineLength, chordLength, curvature, simplify } from './geometry.js'

/** 線種ごとの正規化の向き。start → end の向きを決める */
export const LINE_ORIENTATION = {
  // 生命線: 親指と人差し指の間（上）から手首（下）へ
  life: { axis: 'y', dir: -1 },
  // 頭脳線: 親指側から小指側へ
  head: { axis: 'x', dir: -1 },
  // 感情線: 小指側から人差し指側へ
  heart: { axis: 'x', dir: +1 },
  // 運命線: 手首（下）から指の付け根（上）へ
  fate: { axis: 'y', dir: +1 },
}

export const LINE_LABELS = {
  life: '生命線',
  head: '頭脳線',
  heart: '感情線',
  fate: '運命線',
}

/** ストロークの向きと並びを正規化して 1 本のポリラインに繋ぐ */
export function orientStrokes(strokes, orientation) {
  const { axis, dir } = orientation
  const cleaned = strokes.filter((s) => s && s.length >= 2)
  const oriented = cleaned.map((s) => {
    const head = s[0][axis]
    const tail = s[s.length - 1][axis]
    return (tail - head) * dir < 0 ? [...s].reverse() : s
  })
  oriented.sort((a, b) => (a[0][axis] - b[0][axis]) * dir)
  return oriented
}

/**
 * 1 本の線の特徴量。
 * @param {string} type life | head | heart | fate
 * @param {Array<Array<{x,y}>>} strokes 掌座標系のストローク列
 */
export function extractLineFeatures(type, strokes) {
  const orientation = LINE_ORIENTATION[type]
  if (!orientation) throw new Error(`未知の線種: ${type}`)

  const oriented = orientStrokes(strokes || [], orientation)
  if (oriented.length === 0) {
    return { type, present: false, breaks: 0, length: 0 }
  }

  const merged = oriented.flatMap((s) => simplify(s, 0.004))
  const start = merged[0]
  const end = merged[merged.length - 1]

  return {
    type,
    present: true,
    // 各ストロークの弧長の合計（切れ目の空白は含めない）
    length: oriented.reduce((sum, s) => sum + polylineLength(s), 0),
    chord: chordLength(merged),
    curve: curvature(merged),
    start,
    end,
    rise: end.y - start.y,
    run: end.x - start.x,
    breaks: oriented.length - 1,
    points: merged,
  }
}

/**
 * 4 本まとめて。
 * @param {Record<string, Array<Array<{x,y}>>>} strokesByLine
 * @param {{hand: 'left'|'right'}} meta
 */
export function extractFeatures(strokesByLine, meta = {}) {
  const lines = {}
  for (const type of Object.keys(LINE_ORIENTATION)) {
    lines[type] = extractLineFeatures(type, strokesByLine[type] || [])
  }
  return { hand: meta.hand === 'left' ? 'left' : 'right', lines }
}
