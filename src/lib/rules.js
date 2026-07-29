// 特徴量 → 判定コード。
//
// ここが「手相学の判定」の全て。文章生成（WebLLM）は後段の飾りで、
// 何をどう読んだかはこの純粋関数だけで決まる。同じ手相なら必ず同じ判定になる。
//
// しきい値はすべて掌スケール基準（1.0 = 手首から指の付け根までの距離）。

export const THRESHOLDS = {
  life: { long: 0.95, short: 0.70, wide: 0.22, narrow: 0.10 },
  head: { long: 0.85, short: 0.55, steep: -0.30, sloped: -0.14 },
  heart: { long: 0.80, short: 0.55, curved: 0.10, reachIndex: 0.22, reachMiddle: -0.02 },
  fate: { long: 0.70, short: 0.40, offCenter: 0.15 },
}

const band = (value, { high, low, codes }) =>
  value >= high ? codes[0] : value < low ? codes[2] : codes[1]

function judgeLife(f) {
  if (!f.present) return ['life.absent']
  const t = THRESHOLDS.life
  const codes = [
    band(f.length, { high: t.long, low: t.short, codes: ['life.long', 'life.medium', 'life.short'] }),
  ]
  const bulge = Math.abs(f.curve)
  codes.push(bulge >= t.wide ? 'life.wide' : bulge < t.narrow ? 'life.narrow' : 'life.moderate')
  if (f.breaks >= 1) codes.push('life.broken')
  return codes
}

function judgeHead(f) {
  if (!f.present) return ['head.absent']
  const t = THRESHOLDS.head
  const codes = [
    band(f.length, { high: t.long, low: t.short, codes: ['head.long', 'head.medium', 'head.short'] }),
  ]
  codes.push(f.rise <= t.steep ? 'head.steep' : f.rise <= t.sloped ? 'head.sloped' : 'head.straight')
  if (f.breaks >= 1) codes.push('head.broken')
  return codes
}

function judgeHeart(f) {
  if (!f.present) return ['heart.absent']
  const t = THRESHOLDS.heart
  const codes = [
    band(f.length, { high: t.long, low: t.short, codes: ['heart.long', 'heart.medium', 'heart.short'] }),
  ]
  codes.push(f.curve >= t.curved ? 'heart.curved' : 'heart.straight')
  codes.push(
    f.end.x >= t.reachIndex
      ? 'heart.reach.index'
      : f.end.x >= t.reachMiddle
        ? 'heart.reach.middle'
        : 'heart.reach.short',
  )
  if (f.breaks >= 1) codes.push('heart.broken')
  return codes
}

function judgeFate(f) {
  if (!f.present) return ['fate.absent']
  const t = THRESHOLDS.fate
  const codes = [
    band(f.length, { high: t.long, low: t.short, codes: ['fate.long', 'fate.medium', 'fate.short'] }),
  ]
  codes.push(
    f.start.x >= t.offCenter
      ? 'fate.origin.thumb'
      : f.start.x <= -t.offCenter
        ? 'fate.origin.pinky'
        : 'fate.origin.center',
  )
  if (f.breaks >= 1) codes.push('fate.broken')
  return codes
}

const JUDGES = { life: judgeLife, head: judgeHead, heart: judgeHeart, fate: judgeFate }

/**
 * @param {ReturnType<import('./features.js').extractFeatures>} features
 * @returns {{hand:string, codes:string[], byLine:Record<string,string[]>}}
 */
export function judge(features) {
  const byLine = {}
  for (const [type, fn] of Object.entries(JUDGES)) {
    byLine[type] = fn(features.lines[type])
  }
  return {
    hand: features.hand,
    byLine,
    codes: Object.values(byLine).flat(),
  }
}
