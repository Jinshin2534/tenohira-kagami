import './style.css'

import { createPalmFrame } from './lib/palmFrame.js'
import { extractFeatures, LINE_LABELS } from './lib/features.js'
import { judge } from './lib/rules.js'
import { buildReading, renderFallbackText } from './lib/reading.js'
import { ASPECTS } from './lib/data/interpretations.js'
import { SAMPLE_PALM } from './lib/fixtures.js'
import { loadHistory, saveEntry, clearHistory, makeEntry } from './lib/history.js'

import { createStage, LINE_COLORS } from './ui/stage.js'
import { startCamera, stopCamera, grabFrame, canvasFromFile } from './ui/camera.js'
import { detectAnchors } from './ui/landmarks.js'
import { renderCard, downloadCanvas } from './ui/card.js'
import { generateReadingText, isSupported as llmSupported } from './llm/client.js'

const LINE_ORDER = ['life', 'head', 'heart', 'fate']
const ANCHOR_ORDER = [
  { key: 'wrist', label: '手首の中央' },
  { key: 'indexMcp', label: '人差し指の付け根' },
  { key: 'pinkyMcp', label: '小指の付け根' },
]

const $ = (id) => document.getElementById(id)

const state = {
  hand: 'right',
  photo: null,
  anchors: null,
  frame: null,
  manualPicks: [],
  strokes: Object.fromEntries(LINE_ORDER.map((t) => [t, []])),
  lineIndex: 0,
  reading: null,
  text: null,
  stream: null,
}

const stage = createStage($('stage'))

// ── 画面遷移 ───────────────────────────────
function show(name) {
  for (const el of document.querySelectorAll('.screen')) {
    el.dataset.active = el.id === `screen-${name}` ? 'true' : 'false'
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── 1. 撮影 ───────────────────────────────
for (const btn of document.querySelectorAll('#hand-select button')) {
  btn.addEventListener('click', () => {
    state.hand = btn.dataset.hand
    for (const b of document.querySelectorAll('#hand-select button')) b.classList.toggle('on', b === btn)
  })
}

$('btn-camera').addEventListener('click', async () => {
  try {
    state.stream = await startCamera($('video'))
    $('btn-camera').hidden = true
    $('btn-shutter').hidden = false
    $('capture-error').hidden = true
  } catch (err) {
    showCaptureError(`カメラを起動できませんでした（${err.message}）。「写真を選ぶ」から進めます。`)
  }
})

$('btn-shutter').addEventListener('click', () => {
  try {
    usePhoto(grabFrame($('video')))
  } catch (err) {
    showCaptureError(err.message)
  }
})

$('file').addEventListener('change', async (ev) => {
  const file = ev.target.files?.[0]
  if (!file) return
  try {
    usePhoto(await canvasFromFile(file))
  } catch {
    showCaptureError('この画像は読み込めませんでした。別の写真をお試しください。')
  }
})

$('btn-sample').addEventListener('click', () => runSample())

$('btn-back-capture').addEventListener('click', () => show('capture'))

function showCaptureError(message) {
  const el = $('capture-error')
  el.textContent = message
  el.hidden = false
}

// ── 2. 基準合わせ ─────────────────────────
async function usePhoto(canvas) {
  stopCamera(state.stream)
  state.stream = null
  state.photo = canvas
  state.anchors = null
  state.frame = null
  state.manualPicks = []
  state.strokes = Object.fromEntries(LINE_ORDER.map((t) => [t, []]))
  state.lineIndex = 0

  stage.setPhoto(canvas)
  enterAnchorStep()
  show('edit')

  $('edit-hint').textContent = '手の形を読み取っています…'
  try {
    const found = await detectAnchors(canvas)
    if (found) {
      setAnchors(found.anchors)
      $('edit-hint').textContent = '手首・人差し指・小指の位置を自動で取りました。ズレていたら「自分で指定する」で直せます。'
      return
    }
    startManualAnchors('手を読み取れませんでした。3 か所をタップして教えてください。')
  } catch {
    startManualAnchors('自動検出を使えない環境でした。3 か所をタップして教えてください。')
  }
}

function enterAnchorStep() {
  $('step-anchor').className = 'on'
  $('step-trace').className = ''
  $('edit-title').textContent = '手の基準点を合わせます'
  $('anchor-controls').hidden = false
  $('trace-controls').hidden = true
  $('btn-anchor-next').disabled = true
  stage.setMode('view')
}

function setAnchors(anchors) {
  state.anchors = anchors
  state.frame = createPalmFrame(anchors)
  stage.setMode('view')
  stage.render({ anchors, strokes: {}, guide: null, activeLine: null })
  $('btn-anchor-next').disabled = false
}

function startManualAnchors(message) {
  state.manualPicks = []
  state.anchors = null
  state.frame = null
  $('btn-anchor-next').disabled = true
  stage.setMode('anchor')
  stage.render({ anchors: null, strokes: {}, guide: null })
  $('edit-hint').textContent = `${message ? message + ' ' : ''}まず「${ANCHOR_ORDER[0].label}」をタップ。`
}

$('btn-anchor-manual').addEventListener('click', () => startManualAnchors(''))

stage.onTap((point) => {
  if (state.manualPicks.length >= ANCHOR_ORDER.length) return
  state.manualPicks.push(point)
  const picked = Object.fromEntries(state.manualPicks.map((p, i) => [ANCHOR_ORDER[i].key, p]))
  stage.render({ anchors: state.manualPicks.length === 3 ? picked : null })
  if (state.manualPicks.length === 3) {
    try {
      setAnchors(picked)
      $('edit-hint').textContent = '基準点を置きました。ズレていたら「自分で指定する」でやり直せます。'
    } catch {
      $('edit-hint').textContent = '3 点が近すぎます。もう一度、離れた位置をタップしてください。'
      startManualAnchors('')
    }
  } else {
    const next = ANCHOR_ORDER[state.manualPicks.length]
    $('edit-hint').textContent = `次は「${next.label}」をタップ。`
    // 途中経過のマーカーを出す
    stage.render({ anchors: null })
    drawPartialPicks()
  }
})

function drawPartialPicks() {
  const ctx = stage.canvas.getContext('2d')
  const r = Math.max(stage.canvas.width, stage.canvas.height) / 64
  for (const p of state.manualPicks) {
    ctx.save()
    ctx.fillStyle = '#845ef7'
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = r / 4
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}

$('btn-anchor-next').addEventListener('click', () => enterTraceStep())

// ── 3. なぞる ─────────────────────────────
function enterTraceStep() {
  $('step-anchor').className = 'done'
  $('step-trace').className = 'on'
  $('anchor-controls').hidden = true
  $('trace-controls').hidden = false
  state.lineIndex = 0
  stage.setMode('trace')
  renderTrace()
}

const activeLine = () => LINE_ORDER[state.lineIndex]

function guidePoints() {
  if (!$('guide-toggle').checked || !state.frame) return null
  const sample = SAMPLE_PALM[activeLine()]?.[0]
  if (!sample) return null
  return sample.map((p) => state.frame.toImage(p))
}

function renderTrace() {
  const type = activeLine()
  $('edit-title').textContent = `${LINE_LABELS[type]}をなぞる`
  $('edit-hint').textContent = TRACE_HINTS[type]
  $('btn-next-line').textContent = state.lineIndex === LINE_ORDER.length - 1 ? '鑑定する' : '次へ'
  $('btn-undo').disabled = state.strokes[type].length === 0

  const chips = LINE_ORDER.map((t, i) => {
    const on = i === state.lineIndex
    const done = state.strokes[t].length > 0
    const style = on
      ? `background:${LINE_COLORS[t]};border-color:${LINE_COLORS[t]}`
      : done
        ? `color:${LINE_COLORS[t]}`
        : ''
    return `<span class="line-chip ${on ? 'on' : ''} ${done ? 'done' : ''}" style="${style}">${LINE_LABELS[t]}</span>`
  }).join('')
  $('line-chips').innerHTML = chips

  stage.render({ anchors: state.anchors, strokes: state.strokes, guide: guidePoints(), activeLine: type })
}

const TRACE_HINTS = {
  life: '親指と人差し指の間から、親指のふくらみを回り込んで手首へ下りる線。指でなぞってください。',
  head: '手のひらの真ん中を横切る線。親指側から小指側へ。',
  heart: '指の付け根の下を横切る線。小指側から人差し指のほうへ。',
  fate: '手首から指の付け根へ縦に上がる線。無い人も珍しくないので、見当たらなければスキップを。',
}

stage.onStroke((points) => {
  state.strokes[activeLine()].push(points)
  renderTrace()
})

$('guide-toggle').addEventListener('change', renderTrace)

$('btn-undo').addEventListener('click', () => {
  state.strokes[activeLine()].pop()
  renderTrace()
})

$('btn-skip').addEventListener('click', () => {
  state.strokes[activeLine()] = []
  advance()
})

$('btn-next-line').addEventListener('click', () => advance())

function advance() {
  if (state.lineIndex < LINE_ORDER.length - 1) {
    state.lineIndex += 1
    renderTrace()
  } else {
    finish()
  }
}

// ── 4. 鑑定 ───────────────────────────────
function toPalmStrokes() {
  const out = {}
  for (const type of LINE_ORDER) {
    out[type] = state.strokes[type].map((s) => s.map((p) => state.frame.toPalm(p)))
  }
  return out
}

function finish() {
  const reading = buildReading(judge(extractFeatures(toPalmStrokes(), { hand: state.hand })))
  presentReading(reading, thumbnailOf(state.photo))
}

function thumbnailOf(photo) {
  if (!photo) return undefined
  const size = 160
  const c = document.createElement('canvas')
  const k = size / Math.max(photo.width, photo.height)
  c.width = Math.round(photo.width * k)
  c.height = Math.round(photo.height * k)
  c.getContext('2d').drawImage(photo, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.6)
}

function presentReading(reading, thumbnail) {
  state.reading = reading
  state.text = renderFallbackText(reading)
  renderResult()
  show('result')

  saveEntry(
    makeEntry(reading, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      thumbnail,
      text: state.text,
    }),
  )

  if (llmSupported()) runLlm(reading)
}

async function runLlm(reading) {
  const status = $('llm-status')
  if (status) status.textContent = 'AI占い師が文章を整えています…（初回はモデルの読み込みに数分かかります）'

  const setStatus = (text, idle = false) => {
    const el = $('llm-status')
    if (!el) return
    el.textContent = text
    if (idle) el.dataset.idle = 'true'
  }

  const generated = await generateReadingText(reading, {
    // 書き上がったセクションから順に差し替えていく
    onSection: (key, text) => {
      if (state.reading !== reading) return
      state.text = { ...state.text, [key]: text }
      renderResult()
    },
    onProgress: ({ progress, done, total }) => {
      if (state.reading !== reading) return
      const pct = Math.round((progress || 0) * 100)
      setStatus(
        pct < 100 && done === 0
          ? `AI占い師を呼び出しています… ${pct}%（初回だけ時間がかかります）`
          : `AI占い師が言葉を選んでいます… ${done}/${total}`,
      )
    },
  })

  if (state.reading !== reading) return // 別の鑑定に移っていたら捨てる
  setStatus(
    generated ? 'AI占い師が言葉を整えました。' : 'この端末ではAI生成を使えないので、定型の鑑定文でお届けします。',
    true,
  )
}

function renderResult() {
  const r = state.reading
  const text = state.text || {}
  const llmLine = llmSupported()
    ? `<p class="llm-status" id="llm-status">AI占い師が文章を整えています…</p>`
    : `<p class="llm-status" id="llm-status" data-idle="true">定型の鑑定文でお届けしています。</p>`

  const scores = Object.entries(ASPECTS)
    .map(
      ([key, label]) => `
        <div class="score-row">
          <span>${label}</span>
          <span class="score-bar"><i style="width:${r.scores[key]}%"></i></span>
          <b>${r.scores[key]}</b>
        </div>`,
    )
    .join('')

  const blocks = [['overall', '総合'], ...Object.entries(ASPECTS)]
    .filter(([key]) => text[key])
    .map(
      ([key, label]) => `
        <div class="reading-block">
          <h3>${label}</h3>
          <p>${escapeHtml(text[key])}</p>
        </div>`,
    )
    .join('')

  const details = r.lines
    .map(
      (line) => `
        <div class="line-card" style="border-color:${LINE_COLORS[line.type]}">
          <h4>${line.label}</h4>
          <ul>${line.entries.map((e) => `<li><b>${e.label}</b> — ${e.note}</li>`).join('')}</ul>
        </div>`,
    )
    .join('')

  $('result').innerHTML = `
    <h2 class="headline">${r.headline}</h2>
    <p class="headline-sub">${r.handMeaning.label}の鑑定 — ${r.handMeaning.meaning} ／ 総合 ${r.total} 点</p>
    <div class="scores">${scores}</div>
    ${llmLine}
    ${blocks}
    <div class="lines-detail">
      <h2>線ごとの読み解き</h2>
      ${details}
    </div>`
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

$('btn-save-card').addEventListener('click', () => {
  if (!state.reading) return
  downloadCanvas(renderCard(state.reading, state.text || {}), `tenohira-${Date.now()}.png`)
})

$('btn-restart').addEventListener('click', () => show('capture'))

// ── 履歴 ─────────────────────────────────
function renderHistory() {
  const items = loadHistory()
  $('history-list').innerHTML = items.length
    ? items
        .map(
          (e) => `
        <div class="history-item">
          <div>
            <h4>${escapeHtml(e.headline)}</h4>
            <p>${new Date(e.createdAt).toLocaleString('ja-JP')} ／ ${e.hand === 'left' ? '左手' : '右手'}</p>
          </div>
          <span class="total">${e.total}</span>
        </div>`,
        )
        .join('')
    : '<p class="empty">まだ鑑定の記録がありません。</p>'
}

$('btn-open-history').addEventListener('click', () => {
  renderHistory()
  show('history')
})
$('btn-history-back').addEventListener('click', () => show('capture'))
$('btn-history-clear').addEventListener('click', () => {
  clearHistory()
  renderHistory()
})

// ── サンプル（カメラ無しで一通り試す / ヘッドレス検証用） ──
function samplePhoto() {
  const c = document.createElement('canvas')
  c.width = 720
  c.height = 900
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#241a2e'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = '#d9a679'
  ctx.beginPath()
  ctx.ellipse(360, 560, 250, 300, 0, 0, Math.PI * 2)
  ctx.fill()
  for (const x of [230, 310, 390, 470]) {
    ctx.beginPath()
    ctx.roundRect(x - 32, 150, 64, 220, 32)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.roundRect(560, 520, 64, 190, 32)
  ctx.fill()
  return c
}

function runSample() {
  const photo = samplePhoto()
  const anchors = { wrist: { x: 360, y: 800 }, indexMcp: { x: 250, y: 330 }, pinkyMcp: { x: 470, y: 350 } }
  state.photo = photo
  state.anchors = anchors
  state.frame = createPalmFrame(anchors)
  state.strokes = Object.fromEntries(
    LINE_ORDER.map((t) => [t, (SAMPLE_PALM[t] || []).map((s) => s.map((p) => state.frame.toImage(p)))]),
  )
  stage.setPhoto(photo)
  state.lineIndex = 0
  finish()
}

// ヘッドレス検証・デバッグ用の入口
window.__app = {
  state,
  show,
  stage,
  runSample,
  samplePhoto,
  usePhoto,
  /** 掌座標のストロークを直接流し込んで鑑定する */
  readPalmStrokes(strokes, hand = 'right') {
    const reading = buildReading(judge(extractFeatures(strokes, { hand })))
    presentReading(reading, undefined)
    return reading
  },
  get reading() {
    return state.reading
  },
  get text() {
    return state.text
  },
}

show('capture')
