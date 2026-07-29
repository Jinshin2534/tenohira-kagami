// WebLLM に渡すプロンプトの組み立てと、返答の掃除。
//
// 方針: 手相の判定は一切 LLM に委ねない。すでに確定した鑑定メモを渡して
// 「占い師の口調で書き直す」だけをさせる。
//
// 小型モデルに複数項目の JSON を書かせると高い確率で崩れるので、
// 1 セクションにつき 1 回、プレーンな文章だけを書かせる。

import { ASPECTS } from './data/interpretations.js'

export const SECTIONS = [
  { key: 'overall', label: '総合' },
  ...Object.entries(ASPECTS).map(([key, label]) => ({ key, label })),
]

export const SYSTEM_PROMPT = [
  'あなたは経験豊かな日本の手相占い師です。',
  '渡された鑑定メモの内容だけを使って、やわらかく落ち着いた語り口の日本語に書き直します。',
  'メモに書かれていない事実（寿命・病名・出来事の予言）や、メモに無い呼び名・たとえ話・点数は決して足しません。',
  '出力は本文だけ。項目名・見出し・箇条書き・前置き・英語は書きません。',
].join('\n')

// メモに線の名前（頭脳線など）や手の左右を混ぜると、小型モデルはそれを
// そのまま復唱したり取り違えたりする。渡すのは解釈の地の文だけにする。
function memoFor(reading, key) {
  if (key === 'overall') {
    const strongest = Object.entries(reading.scores).sort((a, b) => b[1] - a[1])[0][0]
    const picks = (reading.aspects[strongest] || []).slice(0, 2).map((i) => `- ${i.text}`)
    return [`- ${reading.headline}`, ...picks].join('\n')
  }
  const items = reading.aspects[key] || []
  return items.length
    ? items.slice(0, 4).map((i) => `- ${i.text}`).join('\n')
    : '- 特筆すべき特徴なし（平均的で安定している）'
}

/** 1 セクションぶんのプロンプト */
export function buildSectionPrompt(reading, key) {
  const section = SECTIONS.find((s) => s.key === key)
  if (!section) throw new Error(`未知のセクション: ${key}`)
  return [
    `いま書く項目: ${section.label}`,
    '',
    '鑑定メモ:',
    memoFor(reading, key),
    '',
    `上のメモだけを使い、${section.label}について 2 文（120 字程度）の占い文を日本語で書いてください。`,
    '項目名や点数は書かず、本文だけを出力すること。',
  ].join('\n')
}

/**
 * モデルの返答を本文だけにする。
 * 小型モデルは前置き・引用符・見出し・箇条書きを付けがちなので落とす。
 */
export function sanitizeSectionText(raw, { maxLength = 170 } = {}) {
  if (typeof raw !== 'string') return null

  let text = raw
    .replace(/```[\s\S]*?```/g, ' ')        // コードフェンス
    .replace(/^\s*#{1,6}\s*/gm, '')          // 見出し
    .replace(/^\s*[-*・]\s*/gm, '')          // 箇条書き
    .replace(/^\s*(【[^】]*】|「[^」]*」\s*[:：])\s*/gm, '') // 見出しっぽい飾り
    .replace(/\s*\n+\s*/g, '')
    .trim()
    .replace(/^["'“”「『]+/, '')
    .replace(/["'“”」』]+$/, '')
    // 項目名の復唱（例: 「性格」89点。/ 総合」の項目は…）の閉じ括弧だけが残るケース
    .replace(/^[^「『]{0,6}[」』]\s*(\d+\s*点)?[。、:：]?\s*/, '')
    .trim()

  if (!text) return null
  // 日本語がほとんど無い（英語で返ってきた等）ものは採用しない
  const jp = (text.match(/[ぁ-んァ-ヶ一-龠]/g) || []).length
  if (jp < text.length * 0.3) return null

  if (text.length > maxLength) {
    const cut = text.slice(0, maxLength)
    const lastStop = cut.lastIndexOf('。')
    text = lastStop > maxLength * 0.4 ? cut.slice(0, lastStop + 1) : `${cut}…`
  }
  return text
}
