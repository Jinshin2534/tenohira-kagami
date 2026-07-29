import { describe, it, expect } from 'vitest'
import { polylineLength, chordLength, curvature, signedBulge, simplify, boundingBox } from './geometry.js'
import { arc, segment } from './fixtures.js'

describe('polylineLength', () => {
  it('直線の長さを返す', () => {
    expect(polylineLength(segment({ x: 0, y: 0 }, { x: 3, y: 4 }))).toBeCloseTo(5, 6)
  })

  it('点が足りなければ 0', () => {
    expect(polylineLength([{ x: 1, y: 1 }])).toBe(0)
    expect(polylineLength([])).toBe(0)
  })

  it('円弧の長さは半径×角度に近づく', () => {
    const points = arc({ x: 0, y: 0 }, 2, 0, 90, 200)
    expect(polylineLength(points)).toBeCloseTo(2 * (Math.PI / 2), 3)
  })
})

describe('chordLength', () => {
  it('始点と終点の距離', () => {
    const points = arc({ x: 0, y: 0 }, 1, 0, 180, 50)
    expect(chordLength(points)).toBeCloseTo(2, 3)
  })
})

describe('signedBulge / curvature', () => {
  it('直線はゼロ', () => {
    expect(curvature(segment({ x: 0, y: 0 }, { x: 1, y: 1 }))).toBeCloseTo(0, 6)
  })

  it('進行方向の左に膨らむと正', () => {
    // +x 方向に進みながら +y へ膨らむ
    const points = [{ x: 0, y: 0 }, { x: 0.5, y: 0.3 }, { x: 1, y: 0 }]
    expect(signedBulge(points)).toBeGreaterThan(0)
    expect(curvature(points)).toBeCloseTo(0.3, 6)
  })

  it('右に膨らむと負', () => {
    const points = [{ x: 0, y: 0 }, { x: 0.5, y: -0.3 }, { x: 1, y: 0 }]
    expect(curvature(points)).toBeLessThan(0)
  })

  it('半円の曲率は sagitta/chord = 0.5', () => {
    const points = arc({ x: 0, y: 0 }, 1, 180, 0, 200)
    expect(Math.abs(curvature(points))).toBeCloseTo(0.5, 2)
  })
})

describe('simplify', () => {
  it('直線上の点を間引いて両端を残す', () => {
    const points = segment({ x: 0, y: 0 }, { x: 1, y: 0 }, 40)
    const out = simplify(points, 0.01)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ x: 0, y: 0 })
    expect(out[1]).toEqual({ x: 1, y: 0 })
  })

  it('曲線の形は保つ', () => {
    const points = arc({ x: 0, y: 0 }, 1, 0, 180, 100)
    const out = simplify(points, 0.004)
    expect(out.length).toBeGreaterThan(5)
    expect(out.length).toBeLessThan(points.length)
    expect(Math.abs(curvature(out))).toBeCloseTo(Math.abs(curvature(points)), 2)
  })

  it('2 点以下はそのまま', () => {
    expect(simplify([{ x: 0, y: 0 }])).toHaveLength(1)
  })
})

describe('boundingBox', () => {
  it('外接矩形を返す', () => {
    const box = boundingBox([{ x: -1, y: 2 }, { x: 3, y: -4 }])
    expect(box).toMatchObject({ minX: -1, maxX: 3, minY: -4, maxY: 2, width: 4, height: 6 })
  })

  it('空なら null', () => {
    expect(boundingBox([])).toBeNull()
  })
})
