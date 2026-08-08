import type { ConnectionsLandingCopy } from './content.types';

/**
 * Japanese landing copy — written natively, not translated. The Japanese pool
 * (194 puzzles) bridges a single kanji between two 熟語: 日[本]屋. That format has
 * an established Japanese name — 和同開珎 — which is what people actually search
 * for, so the copy leads with it rather than with a translation of "Word Bridge".
 * Samples are real puzzles from lib/connections/puzzles/generated/ja.generated.ts.
 */
export const JA_COPY: ConnectionsLandingCopy = {
  metaTitle: '漢字ブリッジ（和同開珎）— 真ん中の漢字を当てるパズル | LexiClash',
  metaDescription:
    '無料の漢字パズル。左右の漢字をつなぐ一文字を当てる和同開珎スタイル。日□／□屋 → 本。登録不要・ダウンロード不要、ブラウザですぐ遊べます。',
  metaKeywords:
    '和同開珎, 漢字パズル, 熟語パズル, 無料 漢字クイズ, 言葉遊び, 脳トレ 漢字, 漢字 ブリッジ, 二字熟語 パズル',
  ogTitle: '漢字ブリッジ（和同開珎）— 真ん中の漢字を当てる',
  ogDescription: '左右をつなぐ一文字を当てるパズル。無料・登録不要でブラウザから。',
  twitterTitle: '漢字ブリッジ — 無料の和同開珎パズル',
  twitterDescription: '左右をつなぐ漢字は何？ 無料で今すぐ。',
  badge: '無料・登録不要',
  h1Pre: '二つの熟語、一つの漢字。',
  h1Highlight: '真ん中を当てよう。',
  h1Sub: '漢字ブリッジ — 和同開珎スタイルの熟語パズル',
  introP1:
    '左右に漢字が一つずつ表示されます。両方と組み合わせて正しい二字熟語になる、真ん中の一文字を探してください。日□／□屋なら「本」（日本・本屋）。学□／□長なら「校」（学校・校長）。ルールは十秒で覚えられます。',
  introP2:
    '江戸時代から親しまれてきた和同開珎（わどうかいちん）という形式のパズルです。一問およそ三十秒。プレイ中に広告が割り込むことはなく、インストールも不要です。',
  ctaPrimary: '無料で遊ぶ',
  ctaSecondary: '遊び方 ↓',
  demo: {
    label: '試してみる — 真ん中のマスをタップ',
    puzzle: { word1: '日', word2: '屋', bridge: '本', difficulty: 'easy' },
    reveal: '答えを見る',
    success: 'つながりました！',
  },
  samples: {
    heading: '三問おためし',
    sub: 'カードをタップすると答えが出ます',
    revealLabel: 'タップして表示',
    difficultyLabels: { easy: 'やさしい', medium: 'ふつう', hard: 'むずかしい' },
    items: [
      { word1: '学', word2: '長', bridge: '校', difficulty: 'easy' },
      { word1: '水', word2: '物', bridge: '着', difficulty: 'medium' },
      { word1: '火', word2: '頂', bridge: '山', difficulty: 'hard' },
    ],
  },
  why: {
    heading: '脳トレとしての効果',
    cards: [
      {
        title: '熟語のストックが増える',
        body: '「見たことはあるけれど書けない」熟語を、三十秒で引き出す訓練になります。受け身の知識が使える知識に変わります。',
      },
      {
        title: '発想の切り替えが速くなる',
        body: '最初に浮かぶ漢字はたいてい外れます。同音・類義・比喩を素早く走査する回路が鍛えられます。',
      },
      {
        title: '語彙の記憶を保つ',
        body: '真ん中を探す作業は、想起と連想を同時に使います。喉まで出かかった言葉を引き出す力と同じ働きです。',
      },
    ],
  },
  heClassic: null,
  compare: {
    heading: 'ほかの言葉遊びとの違い',
    sub: '「もう一つのWordle」にはしませんでした',
    columns: ['ゲーム', '内容', '所要時間', '鍛えられる力'],
    rows: [
      {
        name: '漢字ブリッジ（本作）',
        doing: '左右をつなぐ一文字を探す',
        length: '1問30秒',
        skill: '連想＋語彙',
      },
      {
        name: 'しりとり',
        doing: '前の語の最後の音で次の語をつなぐ',
        length: '5〜15分',
        skill: '語彙の瞬発力',
      },
      {
        name: 'Wordle',
        doing: '5文字の単語を6回以内で当てる',
        length: '3〜5分',
        skill: '文字の論理',
      },
      {
        name: 'クロスワード',
        doing: 'ヒントからマスを埋める',
        length: '10〜60分',
        skill: '知識＋表記',
      },
    ],
  },
  faq: {
    heading: 'よくある質問',
    items: [
      {
        q: '和同開珎とはどんなパズルですか？',
        a: '中央に一文字を置き、上下左右（この版では左右）の漢字と組み合わせてすべて正しい熟語にする形式です。名前は、中央に穴の空いた和同開珎という古銭に見立てたことに由来します。',
      },
      {
        q: 'NYTのConnectionsと同じですか？',
        a: 'いいえ。あちらは16語を4つのグループに分類します。本作は二つの漢字を提示して、その間に入る一文字を当てるパズルです。仕組みは別ものです。',
      },
      {
        q: '本当に無料ですか？',
        a: 'はい。登録も課金もダウンロードも不要です。アカウントは進捗の保存とランキング参加に使う場合だけ必要です。',
      },
      {
        q: 'プレイ中に広告が入りますか？',
        a: '入りません。問題の途中でポップアップが出たり盤面を覆ったりはしません。ヒントが欲しいときだけ、任意で短い動画を見られます。',
      },
      {
        q: '答えはひらがなでも入力できますか？',
        a: 'できます。「本」でも「ほん」でも正解として扱われます。読みが複数ある場合も、主要な読みは受け付けます。',
      },
      {
        q: 'ヒントはどう機能しますか？',
        a: '一問につき一つ。答えそのものではなく方向を示します。たとえば「本」なら「国の名前と、本を売る店」といった具合です。',
      },
      {
        q: 'デイリー問題はありますか？',
        a: 'あります。全プレイヤー共通の5問が毎日出題され、ランキングも共有です。UTCの午前0時に切り替わります。',
      },
    ],
  },
  footerCta: {
    heading: '真ん中の一文字、見つけますか？',
    body: '無料。ブラウザだけ。インストール不要。',
    button: 'はじめる',
  },
  videoGameName: '漢字ブリッジ（和同開珎）',
  videoGameDescription:
    '無料の日本語漢字パズル。左右に示された漢字の両方と組み合わさって二字熟語になる、中央の一文字を当てる和同開珎形式のゲーム。',
};
