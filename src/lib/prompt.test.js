import { describe, it, expect } from 'vitest'
import { buildSectionPrompt, sanitizeSectionText, SECTIONS, SYSTEM_PROMPT } from './prompt.js'
import { buildReading } from './reading.js'
import { judge } from './rules.js'
import { extractFeatures } from './features.js'
import { SAMPLE_PALM } from './fixtures.js'

const reading = buildReading(judge(extractFeatures(SAMPLE_PALM, { hand: 'right' })))

describe('SECTIONS', () => {
  it('総合＋4 分野', () => {
    expect(SECTIONS.map((s) => s.key)).toEqual(['overall', 'personality', 'work', 'love', 'health'])
  })
})

describe('buildSectionPrompt', () => {
  it('その分野の鑑定メモを含む', () => {
    const prompt = buildSectionPrompt(reading, 'work')
    expect(prompt).toContain('仕事')
    expect(prompt).toContain(reading.aspects.work[0].text)
  })

  it('点数・線の名前・手の左右は渡さない（小型モデルが復唱・取り違えするため）', () => {
    const prompt = buildSectionPrompt(reading, 'work')
    expect(prompt).not.toMatch(/\d+\s*点/)
    expect(prompt).not.toMatch(/生命線|頭脳線|感情線|運命線/)
    expect(prompt).not.toMatch(/右手|左手/)
  })

  it('他の分野のメモは混ぜない', () => {
    const prompt = buildSectionPrompt(reading, 'health')
    const loveOnly = reading.aspects.love.find((i) => !reading.aspects.health.some((h) => h.text === i.text))
    expect(prompt).not.toContain(loveOnly.text)
  })

  it('総合は全体の見立てを渡す', () => {
    expect(buildSectionPrompt(reading, 'overall')).toContain(reading.headline)
  })

  it('材料が無い分野でも組み立てられる', () => {
    const empty = { ...reading, aspects: { ...reading.aspects, love: [] } }
    expect(buildSectionPrompt(empty, 'love')).toContain('特筆すべき特徴なし')
  })

  it('プレーンな本文だけを求める（JSON は求めない）', () => {
    expect(SYSTEM_PROMPT).toContain('本文だけ')
    expect(buildSectionPrompt(reading, 'love')).not.toContain('JSON')
  })

  it('未知のセクションはエラー', () => {
    expect(() => buildSectionPrompt(reading, 'money')).toThrow()
  })
})

describe('sanitizeSectionText', () => {
  it('そのまま使える文章は素通し', () => {
    const text = 'あなたの手には粘り強さが表れています。長く続ける力が味方になるでしょう。'
    expect(sanitizeSectionText(text)).toBe(text)
  })

  it('見出し・箇条書き・コードフェンスを落とす', () => {
    const raw = '## 恋愛\n- あなたは情に厚い人です。\n- 相手をよく見ています。'
    expect(sanitizeSectionText(raw)).toBe('恋愛あなたは情に厚い人です。相手をよく見ています。')
  })

  it('前後の引用符を外す', () => {
    expect(sanitizeSectionText('「あなたは粘り強い人です。」')).toBe('あなたは粘り強い人です。')
  })

  it('英語で返ってきたものは採用しない', () => {
    expect(sanitizeSectionText('Sure! Here is your fortune reading for today.')).toBeNull()
  })

  it('空・非文字列は null', () => {
    expect(sanitizeSectionText('   ')).toBeNull()
    expect(sanitizeSectionText(null)).toBeNull()
    expect(sanitizeSectionText(undefined)).toBeNull()
  })

  it('長すぎる文章は句点で切り詰める', () => {
    const long = 'あなたの手には粘り強さが表れています。'.repeat(20)
    const out = sanitizeSectionText(long, { maxLength: 60 })
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.endsWith('。')).toBe(true)
  })

  it('句点が無い長文は末尾に … を付ける', () => {
    const out = sanitizeSectionText('あ'.repeat(300), { maxLength: 50 })
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('sanitizeSectionText / 項目名の復唱', () => {
  it('先頭に残った項目名の閉じ括弧と点数を落とす', () => {
    expect(sanitizeSectionText('性格」89点。あなたは粘り強い人です。')).toBe('あなたは粘り強い人です。')
    expect(sanitizeSectionText('総合」の項目は、あなたの今を映します。')).toBe('の項目は、あなたの今を映します。')
  })

  it('本文中の鉤括弧は壊さない', () => {
    const text = 'あなたは周囲から「安定した人」と見られます。落ち着いた歩みが信頼を呼びます。'
    expect(sanitizeSectionText(text)).toBe(text)
  })
})
