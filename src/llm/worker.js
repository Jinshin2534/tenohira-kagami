// WebLLM を Web Worker で回す。UI スレッドを止めないため。
// 役割は「確定済みの鑑定メモを占い師の口調に書き直す」ことだけ。

import * as webllm from '@mlc-ai/web-llm'

let engine = null

async function ensureEngine(model) {
  if (engine) return engine
  engine = await webllm.CreateMLCEngine(model, {
    initProgressCallback: (report) => {
      self.postMessage({ type: 'progress', text: report.text, progress: report.progress ?? 0 })
    },
  })
  return engine
}

self.onmessage = async (ev) => {
  const { type, id, model, system, user } = ev.data || {}
  if (type !== 'generate') return
  try {
    const e = await ensureEngine(model)
    const reply = await e.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // メモから逸れて作り話を始めないように、温度は低め・長さも短めに抑える
      temperature: 0.45,
      max_tokens: 260,
    })
    self.postMessage({ type: 'done', id, text: reply.choices?.[0]?.message?.content ?? '' })
  } catch (err) {
    self.postMessage({ type: 'error', id, message: String(err?.message || err) })
  }
}
