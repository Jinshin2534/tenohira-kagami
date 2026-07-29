import { describe, it, expect } from 'vitest'
import { buildReading, renderFallbackText } from './reading.js'
import { judge } from './rules.js'
import { extractFeatures } from './features.js'
import { SAMPLE_PALM } from './fixtures.js'

const readingFor = (strokes, hand = 'right') =>
  buildReading(judge(extractFeatures(strokes, { hand })))

describe('buildReading', () => {
  it('4 分野の点数が 20〜98 に収まる', () => {
    const r = readingFor(SAMPLE_PALM)
    for (const [aspect, score] of Object.entries(r.scores)) {
      expect(score, aspect).toBeGreaterThanOrEqual(20)
      expect(score, aspect).toBeLessThanOrEqual(98)
      expect(Number.isInteger(score)).toBe(true)
    }
  })

  it('線ごとの解説が 4 本ぶん揃う', () => {
    const r = readingFor(SAMPLE_PALM)
    expect(r.lines.map((l) => l.type)).toEqual(['life', 'head', 'heart', 'fate'])
    for (const line of r.lines) {
      expect(line.entries.length).toBeGreaterThan(0)
      for (const e of line.entries) expect(e.label).toBeTruthy()
    }
  })

  it('最高点の分野が topAspect になる', () => {
    const r = readingFor(SAMPLE_PALM)
    const max = Math.max(...Object.values(r.scores))
    expect(r.scores[r.topAspect]).toBe(max)
    expect(r.topScore).toBe(max)
  })

  it('手の左右で意味づけが変わる', () => {
    expect(readingFor(SAMPLE_PALM, 'left').handMeaning.label).toBe('左手')
    expect(readingFor(SAMPLE_PALM, 'right').handMeaning.label).toBe('右手')
  })

  it('運命線が無ければ見出しにその型が出る', () => {
    const r = readingFor({ ...SAMPLE_PALM, fate: [] })
    expect(r.headline).toContain('自分で道を選ぶ')
  })

  it('線を 1 本も描かなくても壊れない', () => {
    const r = readingFor({ life: [], head: [], heart: [], fate: [] })
    expect(r.total).toBeGreaterThan(0)
    expect(r.lines).toHaveLength(4)
  })

  it('同じ入力なら同じ結果', () => {
    expect(readingFor(SAMPLE_PALM)).toEqual(readingFor(SAMPLE_PALM))
  })
})

describe('renderFallbackText', () => {
  it('4 分野すべてに文章が入る', () => {
    const text = renderFallbackText(readingFor(SAMPLE_PALM))
    for (const key of ['personality', 'work', 'love', 'health']) {
      expect(text[key], key).toBeTruthy()
    }
  })

  it('材料が無い分野にも文章を入れる', () => {
    const text = renderFallbackText({
      aspects: { personality: [], work: [], love: [], health: [] },
    })
    expect(text.health).toContain('健康')
    expect(text.love).toContain('恋愛')
  })
})
