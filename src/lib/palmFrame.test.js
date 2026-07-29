import { describe, it, expect } from 'vitest'
import { createPalmFrame, toPalmPolyline, anchorsFromLandmarks } from './palmFrame.js'

const anchors = {
  wrist: { x: 200, y: 400 },
  indexMcp: { x: 140, y: 120 },
  pinkyMcp: { x: 280, y: 140 },
}

const rotateScale = (p, deg, k, origin = { x: 0, y: 0 }) => {
  const rad = (deg * Math.PI) / 180
  const dx = p.x - origin.x
  const dy = p.y - origin.y
  return {
    x: origin.x + k * (dx * Math.cos(rad) - dy * Math.sin(rad)),
    y: origin.y + k * (dx * Math.sin(rad) + dy * Math.cos(rad)),
  }
}

describe('createPalmFrame', () => {
  it('手首が原点、指の付け根のラインが y=1', () => {
    const frame = createPalmFrame(anchors)
    const o = frame.toPalm(anchors.wrist)
    expect(o.x).toBeCloseTo(0, 6)
    expect(o.y).toBeCloseTo(0, 6)
    const mid = { x: (anchors.indexMcp.x + anchors.pinkyMcp.x) / 2, y: (anchors.indexMcp.y + anchors.pinkyMcp.y) / 2 }
    const p = frame.toPalm(mid)
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(1, 6)
  })

  it('x 軸は小指側→親指側（人差し指側が正）', () => {
    const frame = createPalmFrame(anchors)
    expect(frame.toPalm(anchors.indexMcp).x).toBeGreaterThan(0)
    expect(frame.toPalm(anchors.pinkyMcp).x).toBeLessThan(0)
  })

  it('toImage は toPalm の逆変換', () => {
    const frame = createPalmFrame(anchors)
    const p = { x: 231, y: 275 }
    const round = frame.toImage(frame.toPalm(p))
    expect(round.x).toBeCloseTo(p.x, 6)
    expect(round.y).toBeCloseTo(p.y, 6)
  })

  it('写真の回転・拡大に影響されない（これが座標系の存在理由）', () => {
    const frame = createPalmFrame(anchors)
    const point = { x: 250, y: 300 }
    const before = frame.toPalm(point)

    const moved = Object.fromEntries(
      Object.entries(anchors).map(([k, v]) => [k, rotateScale(v, 37, 2.4, { x: 50, y: 50 })]),
    )
    const frame2 = createPalmFrame(moved)
    const after = frame2.toPalm(rotateScale(point, 37, 2.4, { x: 50, y: 50 }))

    expect(after.x).toBeCloseTo(before.x, 6)
    expect(after.y).toBeCloseTo(before.y, 6)
  })

  it('鏡像でも掌座標は一致する（左右どちらの手でも同じルールで読める）', () => {
    const mirror = (p) => ({ x: -p.x, y: p.y })
    const frame = createPalmFrame(anchors)
    const frameM = createPalmFrame({
      wrist: mirror(anchors.wrist),
      indexMcp: mirror(anchors.indexMcp),
      pinkyMcp: mirror(anchors.pinkyMcp),
    })
    const point = { x: 250, y: 300 }
    const a = frame.toPalm(point)
    const b = frameM.toPalm(mirror(point))
    expect(b.x).toBeCloseTo(a.x, 6)
    expect(b.y).toBeCloseTo(a.y, 6)
  })

  it('縮退した基準点はエラー', () => {
    expect(() => createPalmFrame({ wrist: { x: 0, y: 0 }, indexMcp: { x: 0, y: 0 }, pinkyMcp: { x: 0, y: 0 } })).toThrow()
  })
})

describe('toPalmPolyline', () => {
  it('点列をまとめて変換する', () => {
    const frame = createPalmFrame(anchors)
    const out = toPalmPolyline(frame, [anchors.wrist, anchors.indexMcp])
    expect(out).toHaveLength(2)
    expect(out[0].x).toBeCloseTo(0, 6)
    expect(out[0].y).toBeCloseTo(0, 6)
  })
})

describe('anchorsFromLandmarks', () => {
  it('0/5/17 番のランドマークを画素座標にして取り出す', () => {
    const lm = Array.from({ length: 21 }, (_, i) => ({ x: i / 100, y: i / 200 }))
    const out = anchorsFromLandmarks(lm, 1000, 800)
    expect(out.wrist).toEqual({ x: 0, y: 0 })
    expect(out.indexMcp).toEqual({ x: 50, y: 20 })
    expect(out.pinkyMcp).toEqual({ x: 170, y: 68 })
  })

  it('点が足りなければ null', () => {
    expect(anchorsFromLandmarks([{ x: 0, y: 0 }], 100, 100)).toBeNull()
  })
})
