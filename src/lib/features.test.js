import { describe, it, expect } from 'vitest'
import { extractLineFeatures, extractFeatures, orientStrokes, LINE_ORIENTATION } from './features.js'
import { segment, SAMPLE_PALM } from './fixtures.js'

describe('orientStrokes', () => {
  it('逆向きに描かれたストロークを揃える', () => {
    const s = segment({ x: 0, y: 0 }, { x: 0, y: 1 }, 4)
    const out = orientStrokes([[...s].reverse()], LINE_ORIENTATION.fate)
    expect(out[0][0].y).toBeCloseTo(0, 6)
    expect(out[0][out[0].length - 1].y).toBeCloseTo(1, 6)
  })

  it('描いた順ではなく位置の順に並べ替える', () => {
    const upper = segment({ x: 0, y: 0.6 }, { x: 0, y: 0.9 }, 3)
    const lower = segment({ x: 0, y: 0.1 }, { x: 0, y: 0.4 }, 3)
    const out = orientStrokes([upper, lower], LINE_ORIENTATION.fate)
    expect(out[0][0].y).toBeCloseTo(0.1, 6)
    expect(out[1][0].y).toBeCloseTo(0.6, 6)
  })

  it('点が 1 つだけのストロークは捨てる', () => {
    expect(orientStrokes([[{ x: 0, y: 0 }]], LINE_ORIENTATION.fate)).toHaveLength(0)
  })
})

describe('extractLineFeatures', () => {
  it('描く向きが逆でも同じ特徴量になる', () => {
    const stroke = SAMPLE_PALM.life[0]
    const a = extractLineFeatures('life', [stroke])
    const b = extractLineFeatures('life', [[...stroke].reverse()])
    expect(b.length).toBeCloseTo(a.length, 6)
    expect(b.start.y).toBeCloseTo(a.start.y, 6)
    expect(b.end.y).toBeCloseTo(a.end.y, 6)
    expect(b.curve).toBeCloseTo(a.curve, 6)
  })

  it('生命線は上（指側）から下（手首側）へ正規化される', () => {
    const f = extractLineFeatures('life', SAMPLE_PALM.life)
    expect(f.start.y).toBeGreaterThan(f.end.y)
    expect(f.present).toBe(true)
    expect(f.breaks).toBe(0)
  })

  it('感情線は小指側から人差し指側へ正規化される', () => {
    const f = extractLineFeatures('heart', SAMPLE_PALM.heart)
    expect(f.start.x).toBeLessThan(f.end.x)
  })

  it('頭脳線は親指側から小指側へ正規化される', () => {
    const f = extractLineFeatures('head', SAMPLE_PALM.head)
    expect(f.start.x).toBeGreaterThan(f.end.x)
    expect(f.rise).toBeLessThan(0)
  })

  it('ストロークが分かれていれば切れ目として数える', () => {
    const f = extractLineFeatures('fate', [
      segment({ x: 0, y: 0.1 }, { x: 0, y: 0.4 }, 4),
      segment({ x: 0, y: 0.55 }, { x: 0, y: 0.85 }, 4),
    ])
    expect(f.breaks).toBe(1)
    // 切れ目の空白は長さに含めない
    expect(f.length).toBeCloseTo(0.6, 6)
  })

  it('描かれていなければ present:false', () => {
    const f = extractLineFeatures('fate', [])
    expect(f).toMatchObject({ present: false, length: 0 })
  })

  it('未知の線種はエラー', () => {
    expect(() => extractLineFeatures('mystery', [])).toThrow()
  })
})

describe('extractFeatures', () => {
  it('4 本ぶんまとめて返す', () => {
    const f = extractFeatures(SAMPLE_PALM, { hand: 'left' })
    expect(Object.keys(f.lines).sort()).toEqual(['fate', 'head', 'heart', 'life'])
    expect(f.hand).toBe('left')
  })

  it('hand の指定がなければ right', () => {
    expect(extractFeatures(SAMPLE_PALM).hand).toBe('right')
  })
})
