import { describe, it, expect } from 'vitest'
import { judge } from './rules.js'
import { extractFeatures } from './features.js'
import { INTERPRETATIONS } from './data/interpretations.js'
import { arc, segment, SAMPLE_PALM } from './fixtures.js'

const codesFor = (strokes, hand = 'right') => judge(extractFeatures(strokes, { hand })).codes

describe('judge / 生命線', () => {
  it('大きく張り出した長い弧 → 長い・張り出し大', () => {
    const codes = codesFor({ ...SAMPLE_PALM, life: [arc({ x: 0.15, y: 0.45 }, 0.42, 60, -75)] })
    expect(codes).toContain('life.long')
    expect(codes).toContain('life.wide')
  })

  it('小さい弧 → 短い', () => {
    const codes = codesFor({ ...SAMPLE_PALM, life: [arc({ x: 0.15, y: 0.45 }, 0.26, 60, -75)] })
    expect(codes).toContain('life.short')
  })

  it('ほぼ直線 → 張り出し小', () => {
    const codes = codesFor({ ...SAMPLE_PALM, life: [segment({ x: 0.30, y: 0.80 }, { x: 0.22, y: 0.05 })] })
    expect(codes).toContain('life.narrow')
  })

  it('描かれていなければ absent のみ', () => {
    const codes = codesFor({ ...SAMPLE_PALM, life: [] })
    expect(codes).toContain('life.absent')
    expect(codes).not.toContain('life.long')
  })

  it('2 ストロークなら切れ目', () => {
    const codes = codesFor({
      ...SAMPLE_PALM,
      life: [arc({ x: 0.15, y: 0.45 }, 0.42, 60, 10), arc({ x: 0.15, y: 0.45 }, 0.42, -10, -75)],
    })
    expect(codes).toContain('life.broken')
  })
})

describe('judge / 頭脳線', () => {
  it('水平に長い → 長い・まっすぐ', () => {
    const codes = codesFor({ ...SAMPLE_PALM, head: [segment({ x: 0.30, y: 0.62 }, { x: -0.60, y: 0.60 })] })
    expect(codes).toContain('head.long')
    expect(codes).toContain('head.straight')
  })

  it('ゆるやかに下がる → sloped', () => {
    const codes = codesFor({ ...SAMPLE_PALM, head: [segment({ x: 0.30, y: 0.62 }, { x: -0.55, y: 0.42 })] })
    expect(codes).toContain('head.sloped')
  })

  it('大きく下がる → steep', () => {
    const codes = codesFor({ ...SAMPLE_PALM, head: [segment({ x: 0.30, y: 0.62 }, { x: -0.45, y: 0.25 })] })
    expect(codes).toContain('head.steep')
  })

  it('短ければ short', () => {
    const codes = codesFor({ ...SAMPLE_PALM, head: [segment({ x: 0.20, y: 0.60 }, { x: -0.25, y: 0.58 })] })
    expect(codes).toContain('head.short')
  })
})

describe('judge / 感情線', () => {
  it('人差し指の下まで届く長い線', () => {
    const codes = codesFor({ ...SAMPLE_PALM, heart: [segment({ x: -0.55, y: 0.75 }, { x: 0.30, y: 0.88 })] })
    expect(codes).toContain('heart.long')
    expect(codes).toContain('heart.reach.index')
    expect(codes).toContain('heart.straight')
  })

  it('上向きに膨らめば curved', () => {
    const codes = codesFor({
      ...SAMPLE_PALM,
      heart: [arc({ x: -0.12, y: 0.55 }, 0.45, 155, 25)],
    })
    expect(codes).toContain('heart.curved')
  })

  it('手前で終われば reach.short', () => {
    const codes = codesFor({ ...SAMPLE_PALM, heart: [segment({ x: -0.55, y: 0.75 }, { x: -0.20, y: 0.80 })] })
    expect(codes).toContain('heart.reach.short')
    expect(codes).toContain('heart.short')
  })
})

describe('judge / 運命線', () => {
  it('手首中央から長く伸びる', () => {
    const codes = codesFor({ ...SAMPLE_PALM, fate: [segment({ x: 0.02, y: 0.10 }, { x: 0.05, y: 0.85 })] })
    expect(codes).toContain('fate.long')
    expect(codes).toContain('fate.origin.center')
  })

  it('小指側から立ち上がる', () => {
    const codes = codesFor({ ...SAMPLE_PALM, fate: [segment({ x: -0.30, y: 0.15 }, { x: 0.05, y: 0.85 })] })
    expect(codes).toContain('fate.origin.pinky')
  })

  it('親指側から立ち上がる', () => {
    const codes = codesFor({ ...SAMPLE_PALM, fate: [segment({ x: 0.28, y: 0.15 }, { x: 0.05, y: 0.85 })] })
    expect(codes).toContain('fate.origin.thumb')
  })

  it('無い人もいる', () => {
    const codes = codesFor({ ...SAMPLE_PALM, fate: [] })
    expect(codes).toEqual(expect.arrayContaining(['fate.absent']))
  })
})

describe('judge の性質', () => {
  it('同じ入力なら必ず同じ判定（占いとしての一貫性）', () => {
    const a = judge(extractFeatures(SAMPLE_PALM, { hand: 'right' }))
    const b = judge(extractFeatures(SAMPLE_PALM, { hand: 'right' }))
    expect(b).toEqual(a)
  })

  it('生成されるコードはすべて解釈データに存在する', () => {
    const variants = [
      SAMPLE_PALM,
      { ...SAMPLE_PALM, life: [], head: [], heart: [], fate: [] },
      { ...SAMPLE_PALM, life: [segment({ x: 0.30, y: 0.80 }, { x: 0.22, y: 0.05 })] },
      { ...SAMPLE_PALM, head: [segment({ x: 0.30, y: 0.62 }, { x: -0.45, y: 0.25 })] },
      { ...SAMPLE_PALM, heart: [segment({ x: -0.55, y: 0.75 }, { x: -0.20, y: 0.80 })] },
      { ...SAMPLE_PALM, fate: [segment({ x: -0.30, y: 0.15 }, { x: 0.05, y: 0.85 })] },
    ]
    for (const v of variants) {
      for (const code of codesFor(v)) {
        expect(INTERPRETATIONS[code], `未定義の解釈コード: ${code}`).toBeDefined()
      }
    }
  })
})
