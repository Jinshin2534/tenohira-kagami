// WebLLM のクライアント側。WebGPU が無ければ静かに諦める（定型文にフォールバック）。
// セクションごとに 1 回ずつ生成し、届いた順に画面へ返す。

import { SYSTEM_PROMPT, SECTIONS, buildSectionPrompt, sanitizeSectionText } from '../lib/prompt.js'

export const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'

export function isSupported() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

let worker = null
let seq = 0

function getWorker() {
  if (!worker) worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
  return worker
}

function requestOne({ user, onProgress, timeoutMs }) {
  const id = ++seq
  const w = getWorker()

  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(null), timeoutMs)

    function finish(value) {
      clearTimeout(timer)
      w.removeEventListener('message', onMessage)
      resolve(value)
    }

    function onMessage(ev) {
      const msg = ev.data || {}
      if (msg.type === 'progress') return onProgress({ progress: msg.progress || 0 })
      if (msg.id !== id) return
      if (msg.type === 'done') return finish(msg.text ?? '')
      if (msg.type === 'error') {
        console.warn('[llm] 生成に失敗しました:', msg.message)
        return finish(null)
      }
    }

    w.addEventListener('message', onMessage)
    w.postMessage({ type: 'generate', id, model: MODEL_ID, system: SYSTEM_PROMPT, user })
  })
}

/**
 * 鑑定文をセクションごとに生成する。
 * 失敗したセクションは飛ばすだけ（呼び出し側は定型文のまま表示すればよい）。
 *
 * @param {object} reading
 * @param {{onSection?:(key:string, text:string)=>void, onProgress?:(s:{progress:number, done:number, total:number})=>void}} hooks
 * @returns {Promise<Record<string,string>|null>} 生成できたぶんだけ。ひとつも取れなければ null
 */
export async function generateReadingText(reading, { onSection = () => {}, onProgress = () => {} } = {}) {
  if (!isSupported()) return null

  const out = {}
  for (const [index, section] of SECTIONS.entries()) {
    const raw = await requestOne({
      user: buildSectionPrompt(reading, section.key),
      onProgress: ({ progress }) => onProgress({ progress, done: index, total: SECTIONS.length }),
      // 1 回目はモデルの読み込みを含むので長めに待つ
      timeoutMs: index === 0 ? 8 * 60 * 1000 : 90 * 1000,
    })
    const text = sanitizeSectionText(raw)
    if (text) {
      out[section.key] = text
      onSection(section.key, text)
    }
    onProgress({ progress: 1, done: index + 1, total: SECTIONS.length })
  }
  return Object.keys(out).length ? out : null
}
