// 判定コード → 構造化されたリーディング。
// ここまでが「占いの中身」。文章の言い回しは後段の WebLLM が整えるが、
// 中身（点数・どの解釈を採ったか）はこの関数だけで確定する。

import { INTERPRETATIONS, ASPECTS, BASE_SCORE } from './data/interpretations.js'
import { LINE_LABELS } from './features.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export const HAND_MEANING = {
  right: { label: '右手', meaning: 'いまのあなた・後天的に育ててきたもの' },
  left: { label: '左手', meaning: '生まれ持った素質・本来の傾向' },
}

/**
 * @param {ReturnType<import('./rules.js').judge>} judgement
 */
export function buildReading(judgement) {
  // 加点の合計はそのまま足すと上限に張り付くので、係数をかけて幅を残す
  const DELTA_GAIN = 0.55
  const deltas = Object.fromEntries(Object.keys(ASPECTS).map((k) => [k, 0]))
  const scores = Object.fromEntries(Object.keys(ASPECTS).map((k) => [k, BASE_SCORE]))
  const aspects = Object.fromEntries(Object.keys(ASPECTS).map((k) => [k, []]))
  const lines = []

  for (const [type, codes] of Object.entries(judgement.byLine)) {
    const entries = []
    for (const code of codes) {
      const item = INTERPRETATIONS[code]
      if (!item) continue
      entries.push({ code, label: item.label, note: item.note })
      for (const [aspect, text] of Object.entries(item.aspects || {})) {
        if (aspects[aspect]) aspects[aspect].push({ code, source: LINE_LABELS[type], text })
      }
      for (const [aspect, delta] of Object.entries(item.scores || {})) {
        if (aspect in deltas) deltas[aspect] += delta
      }
    }
    lines.push({ type, label: LINE_LABELS[type], entries })
  }

  for (const key of Object.keys(scores)) {
    scores[key] = clamp(Math.round(scores[key] + deltas[key] * DELTA_GAIN), 20, 98)
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [topAspect, topScore] = ranked[0]
  const [lowAspect] = ranked[ranked.length - 1]
  const total = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length)

  return {
    hand: judgement.hand,
    handMeaning: HAND_MEANING[judgement.hand] || HAND_MEANING.right,
    scores,
    total,
    topAspect,
    topScore,
    lowAspect,
    headline: buildHeadline(judgement, topAspect),
    aspects,
    lines,
    codes: judgement.codes,
  }
}

const HEADLINES = {
  personality: '芯のかたちがはっきり出ている手',
  work: '積み上げが力になる手',
  love: '人との縁が濃く出ている手',
  health: '生命力がよく回っている手',
}

function buildHeadline(judgement, topAspect) {
  const base = HEADLINES[topAspect] || 'バランスのとれた手'
  if (judgement.byLine.fate?.includes('fate.absent')) return `${base}（自分で道を選ぶ型）`
  if (judgement.codes.some((c) => c.endsWith('.broken'))) return `${base}（節目を越えてきた型）`
  return base
}

/** WebLLM が使えないときの定型文。読み物として成立する程度には組み立てる */
export function renderFallbackText(reading) {
  const out = {}
  for (const [aspect, items] of Object.entries(reading.aspects)) {
    out[aspect] = items.length
      ? items.map((i) => i.text).join('')
      : `${ASPECTS[aspect]}については、今回なぞった線からは特筆すべき特徴が出ませんでした。良くも悪くも平均的で、安定している状態です。`
  }
  return out
}
