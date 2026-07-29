// 写真 + なぞった線 + 基準点をまとめて描く 1 枚のキャンバス。
// 入力（ドラッグでなぞる / タップで基準点を置く）もここが受け持つ。

export const LINE_COLORS = {
  life: '#ff6b6b',
  head: '#4dabf7',
  heart: '#f06595',
  fate: '#fcc419',
}

export function createStage(canvas) {
  const ctx = canvas.getContext('2d')
  let photo = null
  let mode = 'view' // view | trace | anchor
  let view = { anchors: null, strokes: {}, guide: null, activeLine: null, landmarks: null }
  let current = null
  const handlers = { stroke: [], tap: [] }

  function setPhoto(photoCanvas) {
    photo = photoCanvas
    canvas.width = photoCanvas.width
    canvas.height = photoCanvas.height
    fitToViewport()
    render(view)
  }

  // 縦長の写真で画面からはみ出さないように、枠の幅のほうを絞る。
  // （キャンバス自体をレターボックスにすると、指の座標と描画がズレる）
  // 高さの上限は CSS の vh に任せる: JS から window.innerHeight を読むと
  // ヘッドレス環境で 0 が返ることがある。
  function fitToViewport() {
    if (!photo || !canvas.parentElement) return
    canvas.parentElement.style.setProperty('--stage-aspect', String(photo.width / photo.height))
  }

  function toCanvasPoint(ev) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((ev.clientX - rect.left) / rect.width) * canvas.width,
      y: ((ev.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const unit = () => Math.max(canvas.width, canvas.height) / 320

  function drawPolyline(points, { color, width, dash = null, alpha = 1 }) {
    if (!points || points.length < 2) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    if (dash) ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.stroke()
    ctx.restore()
  }

  function drawMarker(p, label, color) {
    const r = unit() * 5
    ctx.save()
    ctx.fillStyle = color
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = unit() * 1.4
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (label) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = `${unit() * 7}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(label, p.x, p.y - r - unit() * 3)
    }
    ctx.restore()
  }

  function render(next = view) {
    view = { ...view, ...next }
    if (!photo) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(photo, 0, 0)

    if (view.anchors) {
      const { wrist, indexMcp, pinkyMcp } = view.anchors
      drawPolyline([indexMcp, pinkyMcp], { color: 'rgba(255,255,255,0.55)', width: unit() * 1.2, dash: [unit() * 3, unit() * 3] })
      drawPolyline([wrist, { x: (indexMcp.x + pinkyMcp.x) / 2, y: (indexMcp.y + pinkyMcp.y) / 2 }], {
        color: 'rgba(255,255,255,0.55)',
        width: unit() * 1.2,
        dash: [unit() * 3, unit() * 3],
      })
      drawMarker(wrist, '手首', '#845ef7')
      drawMarker(indexMcp, '人差し指', '#22b8cf')
      drawMarker(pinkyMcp, '小指', '#22b8cf')
    }

    if (view.guide) {
      drawPolyline(view.guide, {
        color: LINE_COLORS[view.activeLine] || '#ffffff',
        width: unit() * 3.5,
        dash: [unit() * 4, unit() * 5],
        alpha: 0.5,
      })
    }

    for (const [type, strokes] of Object.entries(view.strokes || {})) {
      const active = type === view.activeLine
      for (const s of strokes) {
        drawPolyline(s, {
          color: LINE_COLORS[type],
          width: unit() * (active ? 3.4 : 2.6),
          alpha: active ? 1 : 0.65,
        })
      }
    }

    if (current) {
      drawPolyline(current, { color: LINE_COLORS[view.activeLine] || '#fff', width: unit() * 3.4 })
    }
  }

  function emit(name, payload) {
    for (const fn of handlers[name]) fn(payload)
  }

  canvas.addEventListener('pointerdown', (ev) => {
    if (mode === 'anchor') {
      emit('tap', toCanvasPoint(ev))
      return
    }
    if (mode !== 'trace') return
    ev.preventDefault()
    canvas.setPointerCapture(ev.pointerId)
    current = [toCanvasPoint(ev)]
    render()
  })

  canvas.addEventListener('pointermove', (ev) => {
    if (mode !== 'trace' || !current) return
    const p = toCanvasPoint(ev)
    const last = current[current.length - 1]
    if (Math.hypot(p.x - last.x, p.y - last.y) < unit() * 1.5) return
    current.push(p)
    render()
  })

  function finishStroke() {
    if (!current) return
    const stroke = current
    current = null
    // 点が動いていない（ただのタップ）は無視
    if (stroke.length >= 3) emit('stroke', stroke)
    render()
  }

  canvas.addEventListener('pointerup', finishStroke)
  canvas.addEventListener('pointercancel', () => { current = null; render() })
  canvas.addEventListener('pointerleave', finishStroke)

  return {
    canvas,
    setPhoto,
    getPhoto: () => photo,
    render,
    setMode: (m) => { mode = m; canvas.dataset.mode = m },
    onStroke: (fn) => handlers.stroke.push(fn),
    onTap: (fn) => handlers.tap.push(fn),
    /** テスト・ヘッドレス検証用: 実ポインタなしで入力を流し込む */
    pushStroke: (points) => emit('stroke', points),
    pushTap: (point) => emit('tap', point),
  }
}
