// 判定コード → 手相学的な解釈。
//
// aspects のキーは personality / work / love / health。
// scores は各分野の点数（基準 60）への増減。
//
// 注記: 生命線の長さは寿命ではなく体力・生命力の強さを見るもの、という
// 現代の一般的な読み方に揃えている。

export const ASPECTS = {
  personality: '性格',
  work: '仕事',
  love: '恋愛',
  health: '健康',
}

export const BASE_SCORE = 60

export const INTERPRETATIONS = {
  // ── 生命線 ─────────────────────────────
  'life.absent': {
    label: '生命線が見当たらない',
    note: '線が薄い、あるいは他の線と重なって読み取りにくい状態。体力そのものの否定ではありません。',
    aspects: { health: '体調の波を自覚しにくいタイプ。疲れは数字（睡眠時間や歩数）で管理すると安定します。' },
    scores: { health: -4 },
  },
  'life.long': {
    label: '生命線が長い',
    note: '親指の付け根を大きく回り込み、手首近くまで伸びています。生命力・回復力の強さを表します。',
    aspects: {
      health: '基礎体力があり、少々の無理では倒れない粘り強さ。回復も早いほうです。',
      personality: '物事を長く続けられる持久力があり、周囲からは「安定した人」と見られます。',
    },
    scores: { health: 14, personality: 6 },
  },
  'life.medium': {
    label: '生命線が標準的な長さ',
    note: '手のひらの中ほどまで、はっきりと伸びています。',
    aspects: { health: '体力は平均的で安定。生活リズムが崩れなければ調子を保てます。' },
    scores: { health: 4 },
  },
  'life.short': {
    label: '生命線が短い',
    note: '短さは寿命とは関係ありません。エネルギーの使い方が集中型であることを示します。',
    aspects: {
      health: '一気に燃やして一気に切れるタイプ。休息を先にスケジュールに入れておくのが吉。',
      personality: '短期集中で結果を出す瞬発力の持ち主。だらだら続く物事は苦手。',
    },
    scores: { health: -6, personality: 4 },
  },
  'life.wide': {
    label: '生命線の張り出しが大きい',
    note: '親指側へ大きく弧を描いています。手のひらの「生命の丘」が広いほど活動的とされます。',
    aspects: {
      health: '活動量が多く、動いているほうが調子が良いタイプ。',
      personality: '外向的で行動が早く、people person。誘われたらまず行く人。',
      work: 'フットワークの軽さが武器。現場を動き回る仕事で力を発揮します。',
    },
    scores: { health: 8, personality: 8, work: 6 },
  },
  'life.moderate': {
    label: '生命線が自然な弧を描く',
    note: 'ほどよい張り出し。エネルギーの出し入れのバランスが取れています。',
    aspects: { personality: '動と静の切り替えが上手で、自分のペースを守れる人。' },
    scores: { personality: 4, health: 4 },
  },
  'life.narrow': {
    label: '生命線の張り出しが小さい',
    note: '親指に沿うように、直線に近い形で下りています。',
    aspects: {
      health: '省エネ体質。無理に活動量を増やすより、質のいい休息で整うタイプ。',
      personality: '内省的で、ひとりの時間からエネルギーを回復します。',
    },
    scores: { personality: 2, health: -2 },
  },
  'life.broken': {
    label: '生命線に切れ目がある',
    note: '切れ目は環境や生活が大きく変わる節目を示すとされます。凶兆ではありません。',
    aspects: {
      health: '生活が変わったタイミングで体調も揺れやすいので、変化の直後こそ丁寧に。',
      personality: '人生の途中で価値観を作り直せる、変化に強い人。',
    },
    scores: { health: -6, personality: 6 },
  },

  // ── 頭脳線 ─────────────────────────────
  'head.absent': {
    label: '頭脳線が見当たらない',
    note: '感情線と一体化している（いわゆるます掛け型）可能性もあります。',
    aspects: { work: '型にはまらない考え方をする人。定型業務より、自分で手順を作れる仕事が向きます。' },
    scores: { work: 2 },
  },
  'head.long': {
    label: '頭脳線が長い',
    note: '手のひらを横切って小指側まで伸びています。思考の射程の長さを表します。',
    aspects: {
      personality: '考えを深くまで掘り下げる人。納得するまで動かない慎重さがあります。',
      work: '設計・分析・企画など、じっくり考える仕事で本領を発揮します。',
    },
    scores: { work: 12, personality: 6 },
  },
  'head.medium': {
    label: '頭脳線が標準的な長さ',
    note: '手のひらの中ほどまで伸びています。',
    aspects: { work: '考えることと動くことのバランスが良く、実務で崩れにくいタイプ。' },
    scores: { work: 5 },
  },
  'head.short': {
    label: '頭脳線が短い',
    note: '短さは判断の速さを示します。頭の良し悪しとは無関係です。',
    aspects: {
      personality: '直感で決めて、走りながら考える人。迷う時間が短いのが強み。',
      work: 'スピード勝負の現場、判断の数が多い仕事に強い。',
    },
    scores: { work: 4, personality: 6 },
  },
  'head.straight': {
    label: '頭脳線がまっすぐ',
    note: '小指側へ水平に近い角度で伸びています。現実的な思考の型です。',
    aspects: {
      personality: '感情より事実で判断する、地に足のついた考え方。',
      work: '数字・ルール・段取りを扱う仕事で信頼されます。',
    },
    scores: { work: 8, personality: 4 },
  },
  'head.sloped': {
    label: '頭脳線がゆるやかに下降',
    note: '月丘（小指側の下部）へ向かって下りています。想像力の働きを示します。',
    aspects: {
      personality: '現実的でありながら、発想の柔らかさも併せ持つバランス型。',
      work: '企画やデザインなど、正解のない問いを扱う仕事に向きます。',
    },
    scores: { work: 8, personality: 8 },
  },
  'head.steep': {
    label: '頭脳線が大きく下降',
    note: '月丘へ深く下りています。強い想像力・感受性の表れです。',
    aspects: {
      personality: '空想力が豊かで、人の気持ちの機微にも敏感。刺激を受け取りすぎる面も。',
      work: '創作・表現の分野で強い。締切と現実の管理は誰かと組むと安定します。',
      love: '相手の気持ちを想像しすぎて疲れることがあります。',
    },
    scores: { work: 6, personality: 10, love: -2 },
  },
  'head.broken': {
    label: '頭脳線に切れ目がある',
    note: '考え方が切り替わった時期を示すとされます。',
    aspects: { work: '方針転換を恐れない人。ただし、決めたことを書き留めておくと迷いが減ります。' },
    scores: { work: -4, personality: 4 },
  },

  // ── 感情線 ─────────────────────────────
  'heart.absent': {
    label: '感情線が見当たらない',
    note: '線が浅いか、頭脳線と一体になっている可能性があります。',
    aspects: { love: '感情を表に出すのが得意でないぶん、行動で示すタイプ。' },
    scores: { love: -2 },
  },
  'heart.long': {
    label: '感情線が長い',
    note: '小指側から人差し指のほうまで長く伸びています。愛情の深さを表します。',
    aspects: {
      love: '一度好きになると深く長く想う人。相手をよく見て、よく尽くします。',
      personality: '情に厚く、人との縁を大切にします。',
    },
    scores: { love: 12, personality: 6 },
  },
  'heart.medium': {
    label: '感情線が標準的な長さ',
    note: '手のひらを無理なく横切っています。',
    aspects: { love: '感情の出し入れが自然で、相手との距離感の取り方が上手なタイプ。' },
    scores: { love: 5 },
  },
  'heart.short': {
    label: '感情線が短い',
    note: '短めに収まっています。感情の対象を絞るタイプです。',
    aspects: {
      love: '広く浅くより、限られた相手に集中して向き合う人。',
      personality: '感情に振り回されにくく、冷静さを保てます。',
    },
    scores: { love: -2, personality: 6 },
  },
  'heart.curved': {
    label: '感情線が上向きにカーブ',
    note: '指の付け根に向かって反り上がっています。感情表現の豊かさの表れです。',
    aspects: {
      love: '好意をまっすぐ伝えられる人。恋愛が動き出すのが早いタイプ。',
      personality: '感情がそのまま表情に出る、裏表のなさが魅力。',
    },
    scores: { love: 10, personality: 6 },
  },
  'heart.straight': {
    label: '感情線がまっすぐ',
    note: '水平に近い形で伸びています。感情を内に置くタイプです。',
    aspects: {
      love: '好意を言葉より態度で示す人。伝わるまでに時間がかかることも。',
      personality: '感情を制御でき、場を乱しません。',
    },
    scores: { love: 2, personality: 8 },
  },
  'heart.reach.index': {
    label: '感情線が人差し指の下まで届く',
    note: '木星丘（人差し指の付け根）まで伸びています。理想の高さを示します。',
    aspects: {
      love: '相手に対する理想がはっきりしていて、妥協しません。誠実な関係を求めます。',
      work: '目標を高く置き、そこへ人を巻き込んでいける人。',
    },
    scores: { love: 8, work: 6 },
  },
  'heart.reach.middle': {
    label: '感情線が中指の下あたりで止まる',
    note: '土星丘の下で終わっています。',
    aspects: { love: '恋愛では自分の気持ちを優先するタイプ。情熱的な反面、切り替えも早め。' },
    scores: { love: 4 },
  },
  'heart.reach.short': {
    label: '感情線が短く手前で終わる',
    note: '小指側寄りで終わっています。',
    aspects: {
      love: '感情より現実の条件で相手を見るタイプ。慎重に距離を詰めます。',
      work: '公私を分けるのが上手で、仕事に感情を持ち込みません。',
    },
    scores: { love: -4, work: 6 },
  },
  'heart.broken': {
    label: '感情線に切れ目がある',
    note: '感情が大きく動いた出来事の跡とされます。',
    aspects: { love: '一度の経験から学ぶ力が強い人。過去を糧にできます。' },
    scores: { love: -6, personality: 4 },
  },

  // ── 運命線 ─────────────────────────────
  'fate.absent': {
    label: '運命線が見当たらない',
    note: '運命線は無い人も珍しくありません。決まったレールに乗らない生き方を示します。',
    aspects: {
      work: '会社や肩書きに人生を預けない人。自分で選んで進む自由さがあります。',
      personality: '型にはめられるのを嫌い、その時々で最適な道を選びます。',
    },
    scores: { work: -2, personality: 8 },
  },
  'fate.long': {
    label: '運命線が長い',
    note: '手首の近くから指の付け根へ、しっかり縦に伸びています。',
    aspects: {
      work: '早くから進む道が定まり、そこを一貫して歩けるタイプ。積み上げが効きます。',
      personality: '芯が通っていて、周りに流されません。',
    },
    scores: { work: 14, personality: 6 },
  },
  'fate.medium': {
    label: '運命線が中ほどから伸びる',
    note: '手のひらの途中から立ち上がっています。',
    aspects: { work: '人生の途中で自分の道を見つけるタイプ。今の積み重ねが後で効いてきます。' },
    scores: { work: 6 },
  },
  'fate.short': {
    label: '運命線が短い',
    note: '短く現れています。方向が定まりつつある段階です。',
    aspects: { work: '進む道を模索中の時期。いま試していることが線を伸ばします。' },
    scores: { work: 0 },
  },
  'fate.origin.center': {
    label: '運命線が手首の中央から出ている',
    note: '最も標準的な形。自力で道を切り拓く型です。',
    aspects: { work: '人の力を借りるより、自分の実力で立つタイプ。' },
    scores: { work: 6, personality: 4 },
  },
  'fate.origin.thumb': {
    label: '運命線が親指側から出ている',
    note: '生命線寄りから立ち上がっています。身内との縁の強さを示します。',
    aspects: {
      work: '家族や身近な人の影響を受けながら道が決まるタイプ。支えを力に変えられます。',
      personality: '身近な人を大切にし、その期待に応えようとします。',
    },
    scores: { work: 4, personality: 6 },
  },
  'fate.origin.pinky': {
    label: '運命線が小指側から出ている',
    note: '月丘寄りから立ち上がっています。人の縁で道が開ける形です。',
    aspects: {
      work: '人に引き上げられて道が開けるタイプ。声をかけられたら乗ってみる価値あり。',
      love: '人との出会いが人生の転機になりやすい人。',
    },
    scores: { work: 8, love: 8 },
  },
  'fate.broken': {
    label: '運命線に切れ目がある',
    note: '転職・転居など、進む道が切り替わる節目を示します。',
    aspects: { work: '一本道ではなく、乗り換えながら進むキャリア。変化を恐れないほうが結果的に伸びます。' },
    scores: { work: -2, personality: 6 },
  },
}
