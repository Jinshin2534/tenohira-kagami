import { describe, it, expect, beforeEach } from 'vitest'
import { loadHistory, saveEntry, deleteEntry, clearHistory, makeEntry, STORAGE_KEY } from './history.js'
import { buildReading } from './reading.js'
import { judge } from './rules.js'
import { extractFeatures } from './features.js'
import { SAMPLE_PALM } from './fixtures.js'

function memoryStorage(initial = {}, { limit = Infinity } = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      if (v.length > limit) throw new Error('QuotaExceededError')
      data[k] = v
    },
    removeItem: (k) => { delete data[k] },
    _data: data,
  }
}

const reading = buildReading(judge(extractFeatures(SAMPLE_PALM, { hand: 'right' })))
const entry = (id) => makeEntry(reading, { id, createdAt: '2026-07-29T10:00:00.000Z', thumbnail: 'data:image/png;base64,AAAA' })

let storage
beforeEach(() => { storage = memoryStorage() })

describe('loadHistory', () => {
  it('空なら空配列', () => {
    expect(loadHistory(storage)).toEqual([])
  })

  it('壊れた JSON でも落ちない', () => {
    expect(loadHistory(memoryStorage({ [STORAGE_KEY]: '{{{' }))).toEqual([])
  })

  it('配列でない値は無視する', () => {
    expect(loadHistory(memoryStorage({ [STORAGE_KEY]: '{"a":1}' }))).toEqual([])
  })
})

describe('saveEntry', () => {
  it('新しいものが先頭に来る', () => {
    saveEntry(entry('a'), storage)
    const list = saveEntry(entry('b'), storage)
    expect(list.map((e) => e.id)).toEqual(['b', 'a'])
    expect(loadHistory(storage).map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('同じ id は上書きされる', () => {
    saveEntry(entry('a'), storage)
    const list = saveEntry(entry('a'), storage)
    expect(list).toHaveLength(1)
  })

  it('30 件を超えたら古いものから捨てる', () => {
    let list = []
    for (let i = 0; i < 35; i++) list = saveEntry(entry(`id-${i}`), storage)
    expect(list).toHaveLength(30)
    expect(list[0].id).toBe('id-34')
  })

  it('容量オーバーならサムネイルを捨てて保存する', () => {
    const small = memoryStorage({}, { limit: 2000 })
    const bulky = { ...entry('a'), thumbnail: 'data:image/png;base64,' + 'A'.repeat(5000) }
    const list = saveEntry(bulky, small)
    expect(list[0].thumbnail).toBeUndefined()
    expect(list[0].headline).toBeTruthy()
  })
})

describe('deleteEntry / clearHistory', () => {
  it('1 件消せる', () => {
    saveEntry(entry('a'), storage)
    saveEntry(entry('b'), storage)
    expect(deleteEntry('a', storage).map((e) => e.id)).toEqual(['b'])
  })

  it('全消しできる', () => {
    saveEntry(entry('a'), storage)
    expect(clearHistory(storage)).toEqual([])
    expect(loadHistory(storage)).toEqual([])
  })
})

describe('makeEntry', () => {
  it('鑑定結果の要点だけを保存形式にする', () => {
    const e = entry('x')
    expect(e).toMatchObject({ id: 'x', hand: 'right', total: reading.total })
    expect(e.scores).toEqual(reading.scores)
    expect(e.codes).toEqual(reading.codes)
  })
})
