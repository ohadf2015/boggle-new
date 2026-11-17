import type { ConnectionsLandingCopy } from './content.types';

/**
 * Japanese landing copy — written natively, not translated. The Japanese pool
 * bridges a single kanji between two 二字熟語: 日[本]屋. That is a two-sided
 * 和同開珎, so the page leads with 漢字穴埋めクイズ (the exact format) and names
 * 和同開珎 as the family it belongs to. Every puzzle shown is a real row of
 * lib/connections/puzzles/generated/ja.generated.ts.
 */
export const JA_COPY: ConnectionsLandingCopy = {
  metaTitle: '漢字穴埋めクイズ無料｜二字熟語の和同開珎パズル | LexiClash',
  metaDescription:
    '無料の漢字穴埋めクイズ。左右の漢字をつなぐ一文字を当てる、和同開珎タイプの二字熟語パズルです。日□屋なら「本」。毎日5問、登録不要ですぐ遊べます。',
  metaKeywords:
    '漢字 穴埋めクイズ 無料, 漢字 穴埋め ゲーム, 和同開珎パズル, 和同開珎クイズ, 二字熟語 クイズ 穴埋め, 熟語パズル, 漢字パズル 無料',
  ogTitle: '漢字穴埋めクイズ：真ん中に入る漢字は？',
  ogDescription: '日□屋。日本と本屋をつなぐ一文字は？ 無料の二字熟語パズルをブラウザで。',
  twitterTitle: '無料の漢字穴埋めクイズ',
  twitterDescription: '日□屋。真ん中に入る漢字は？ 和同開珎タイプの熟語パズル。',
  badge: '無料・登録不要',
  h1Pre: '漢字穴埋めクイズ',
  h1Highlight: '真ん中に入る漢字は？',
  h1Sub: '漢字ブリッジ：和同開珎タイプの二字熟語パズル',
  introP1:
    '左右に漢字が一つずつ並び、その間が空いています。左の漢字とも右の漢字とも二字熟語になる一文字を入れてください。日□屋なら「本」で、日本と本屋になります。電□道なら「車」です。',
  introP2:
    'すぐにひらめく問題もあれば、しばらく眺めてやっと気づく問題もあります。毎日5問のデイリー問題、だんだん難しくなるステージ、困ったときのヒントがあります。無料で、アカウントを作らなくても遊べます。',
  ctaPrimary: '無料で遊ぶ',
  ctaSecondary: '遊び方 ↓',
  demo: {
    label: '一問どうぞ：真ん中のマスをタップ',
    puzzle: { word1: '日', word2: '屋', bridge: '本', difficulty: 'easy' },
    reveal: '答えを見る',
    success: '日本と本屋！',
  },
  howTo: {
    heading: '遊び方',
    steps: [
      '左右の漢字を見ます。答えはその間に入るので、左の字の後ろ、右の字の前に来ます。',
      '真ん中の一文字を入力します。左とも右とも、実際にある二字熟語にならないといけません。漢字でも、多くの問題では読みのひらがなでも正解になります。',
      '迷ったらヒントで方向をつかみましょう。ステージでは間違えるとライフが一つ減り、正解すると次の問題に進めます。',
    ],
    examplesLabel: '解き方の例',
    examples: [
      { word1: '電', bridge: '車', word2: '道', left: '電車', right: '車道' },
      { word1: '手', bridge: '紙', word2: '袋', left: '手紙', right: '紙袋' },
      { word1: '先', bridge: '生', word2: '徒', left: '先生', right: '生徒' },
    ],
  },
  samples: {
    heading: 'さあ、解いてみよう',
    sub: 'カードをタップして答え合わせ',
    revealLabel: 'タップで答え',
    difficultyLabels: { easy: 'やさしい', medium: 'ふつう', hard: 'むずかしい' },
    items: [
      { word1: '中', word2: '生', bridge: '学', difficulty: 'easy' },
      { word1: '可', word2: '力', bridge: '能', difficulty: 'medium' },
      { word1: '梅', word2: '戸', bridge: '雨', difficulty: 'hard' },
    ],
  },
  modes: {
    heading: '遊び方いろいろ',
    items: [
      {
        key: 'daily',
        title: 'デイリー問題',
        body: '毎日5問、全員に同じ問題が、やさしい順に出ます。明日になればまた新しい5問です。',
      },
      {
        key: 'play',
        title: 'ステージ',
        body: '200問以上を順番に解いていくモードです。ライフは3つで、減ったライフは20分で一つ戻ります。',
      },
      {
        key: 'community',
        title: 'みんなの問題',
        body: 'ほかのプレイヤーが作った問題です。気に入った問題に投票したり、自分で作って投稿したりできます。',
      },
    ],
  },
  why: {
    heading: 'ついもう一問やりたくなる理由',
    cards: [
      {
        title: '一問がすぐ終わる',
        body: 'たいていの問題は1分もかかりません。休憩中に一問、通勤中にデイリーの5問が片づきます。',
      },
      {
        title: '熟語を見る目が変わる',
        body: '何問か解くと、看板やメニュー、ニュースの見出しの熟語がつい気になるようになります。',
      },
      {
        title: 'わかった瞬間が気持ちいい',
        body: '答えは目の前にあるのに、なかなか見えない。しばらく考えてから気づくあの瞬間がこのパズルの醍醐味です。',
      },
    ],
  },
  heClassic: null,
  compare: {
    heading: 'ほかの言葉遊びとの違い',
    sub: '毎日遊べる言葉遊びの仲間ですが、中身は別物です',
    columns: ['ゲーム', '内容', '所要時間', '鍛えられる力'],
    rows: [
      {
        name: '漢字ブリッジ（本作）',
        doing: '左右の漢字をつなぐ一文字を入れる',
        length: '1問1分以内',
        skill: '熟語の知識',
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
        q: '和同開珎パズルとは何ですか？',
        a: '中央の一文字を当てて、まわりの漢字すべてと熟語を作るパズルです。古銭の和同開珎の形に見立てた名前で、ふつうは上下左右の4方向ですが、このゲームは左右2方向の穴埋めです。',
      },
      {
        q: '難易度はどのくらいですか？',
        a: '最初は先生や電車のような身近な熟語から始まり、ステージが進むと梅雨や対象のように少し考える問題が増えます。',
      },
      {
        q: '無料ですか？登録は必要ですか？',
        a: '無料です。登録もダウンロードもせずに、すぐ遊び始められます。',
      },
      {
        q: '答えはひらがなでも入力できますか？',
        a: '多くの問題でできます。たとえば「本」は「ほん」と入力しても正解になります。',
      },
      {
        q: 'ヒントはどう使えますか？',
        a: 'ヒントは1日1回無料です。答えそのものではなく、「国の名前と、マンガを買いに行くお店」のように方向を示す短い説明が出ます。',
      },
      {
        q: 'NYTのConnectionsとは違いますか？',
        a: '違います。Connectionsは16語を4つのグループに分けるゲームです。こちらは二つの漢字の間に入る一文字を当てます。',
      },
    ],
  },
  footerCta: {
    heading: '今日の5問、解けますか？',
    body: '無料、ブラウザだけ、ダウンロード不要。',
    button: '遊んでみる',
  },
  videoGameName: '漢字ブリッジ（漢字穴埋めクイズ）',
  videoGameDescription:
    '無料の漢字穴埋めクイズ。左右に表示された漢字の間に一文字を入れ、両側とも二字熟語にする和同開珎タイプのパズルです。日＋本＋屋のように解きます。デイリー問題、ステージ、みんなの問題があります。',
};
