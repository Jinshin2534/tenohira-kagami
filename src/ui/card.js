// 結果を 1 枚の画像に書き出す（保存・共有用）。

import { ASPECTS } from '../lib/data/interpretations.js'

const W = 1080
const H = 1350

function wrapText(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const ch of text) {
    if (ch === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    const next = line + ch
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

export function renderCard(reading, text = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#1b1235')
  bg.addColorStop(0.55, '#2a1b46')
  bg.addColorStop(1, '#120d24')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 飾り罫
  ctx.strokeStyle = 'rgba(233,196,106,0.5)'
  ctx.lineWidth = 3
  ctx.strokeRect(40, 40, W - 80, H - 80)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#e9c46a'
  ctx.font = '600 44px "Hiragino Mincho ProN", "Yu Mincho", serif'
  ctx.fillText('掌 鑑', W / 2, 140)

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '26px "Hiragino Sans", sans-serif'
  ctx.fillText(`${reading.handMeaning.label}の鑑定 — ${reading.handMeaning.meaning}`, W / 2, 190)

  ctx.fillStyle = '#ffffff'
  ctx.font = '600 52px "Hiragino Mincho ProN", "Yu Mincho", serif'
  for (const [i, line] of wrapText(ctx, reading.headline, W - 200).entries()) {
    ctx.fillText(line, W / 2, 280 + i * 66)
  }

  // 点数バー
  let y = 420
  ctx.textAlign = 'left'
  for (const [key, label] of Object.entries(ASPECTS)) {
    const score = reading.scores[key]
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '30px "Hiragino Sans", sans-serif'
    ctx.fillText(label, 110, y + 8)

    const barX = 230
    const barW = W - barX - 190
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(barX, y - 18, barW, 26)
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0)
    grad.addColorStop(0, '#e9c46a')
    grad.addColorStop(1, '#f4a261')
    ctx.fillStyle = grad
    ctx.fillRect(barX, y - 18, (barW * score) / 100, 26)

    ctx.fillStyle = '#e9c46a'
    ctx.font = '600 32px "Hiragino Sans", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(String(score), W - 110, y + 8)
    ctx.textAlign = 'left'
    y += 76
  }

  // 総合文
  const body = text.overall || text.personality || ''
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = '32px "Hiragino Sans", sans-serif'
  const lines = wrapText(ctx, body, W - 220).slice(0, 8)
  let by = y + 60
  for (const line of lines) {
    ctx.fillText(line, 110, by)
    by += 52
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '24px "Hiragino Sans", sans-serif'
  ctx.fillText('てのひらかがみ — 手相占い', W / 2, H - 90)

  return canvas
}

export function downloadCanvas(canvas, filename) {
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}
