// 鑑定履歴の localStorage 保存。ストレージは外から注入できるようにして
// テストからも実ブラウザからも同じコードを通す。

export const STORAGE_KEY = 'tenohira-kagami/history/v1'
const MAX_ENTRIES = 30

function readRaw(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadHistory(storage = globalThis.localStorage) {
  if (!storage) return []
  return readRaw(storage)
}

/**
 * 1 件追加して保存し、保存後の一覧を返す。
 * @param {{id:string, createdAt:string, hand:string, headline:string, scores:object, total:number, codes:string[], thumbnail?:string, text?:object}} entry
 */
export function saveEntry(entry, storage = globalThis.localStorage) {
  if (!storage) return []
  const next = [entry, ...readRaw(storage).filter((e) => e.id !== entry.id)].slice(0, MAX_ENTRIES)
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 画像込みで容量オーバーしたらサムネイルを捨ててもう一度だけ試す
    const slim = next.map(({ thumbnail, ...rest }) => rest)
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(slim))
      return slim
    } catch {
      return next
    }
  }
  return next
}

export function deleteEntry(id, storage = globalThis.localStorage) {
  if (!storage) return []
  const next = readRaw(storage).filter((e) => e.id !== id)
  storage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function clearHistory(storage = globalThis.localStorage) {
  if (storage) storage.removeItem(STORAGE_KEY)
  return []
}

/** 保存用のエントリを作る。id と日時は呼び出し側から渡す（純粋に保つため） */
export function makeEntry(reading, { id, createdAt, thumbnail, text }) {
  return {
    id,
    createdAt,
    hand: reading.hand,
    headline: reading.headline,
    scores: reading.scores,
    total: reading.total,
    codes: reading.codes,
    thumbnail,
    text,
  }
}
