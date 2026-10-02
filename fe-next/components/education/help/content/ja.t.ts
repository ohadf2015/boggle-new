import type { HelpLocaleContent, HelpQuickAnswer } from '../helpTypes';

export const jaT: HelpLocaleContent = {
  'first-live-game-in-5-minutes': {
    title: '5分でできる、はじめてのライブゲーム',
    summary: 'ログインから、表彰台で盛り上がるクラスまで。事前準備は一切なし。一度やれば、このページはもう必要ありません。',
    keywords: '最初の授業, クイックスタート, 初心者, はじめに, チュートリアル, 5分, デモ, はじめて',
    blocks: [
      { t: 'p', text: '必要なもの：クラス全員が見られる画面、先生の端末、スマホやタブレット・パソコンを持った生徒。クラスも名簿も単語リストも要りません。' },
      {
        t: 'steps',
        items: [
          { time: '0:00', title: '先生HQを開く', body: '[先生HQ](app:/teacher)にログインすると、[[teacher.nav.play]]画面が開きます。' },
          { time: '0:30', title: 'ゲームと単語を選ぶ', body: '[[academy.hq.modes.classic]]と、ポスターの下にあるスターターリストを1つタップします。すぐにプレイできます。', shot: 'hq-start-game' },
          { time: '1:00', title: 'スタートして画面を映す', body: '[[teacher.playNow.goLive]]を押して、画面を黒板に映します。ロビーには大きなコード、リンク、QRコードが表示されます。', shot: 'lobby' },
          { time: '1:30', title: '生徒が参加', body: '生徒はQRを読み取るか、lexiclash.live/join でコードを入力して名前を決めます。名前が次々と表示されます。' },
          { time: '2:00', title: '1ラウンド遊ぶ', body: '[[hostView.startClassGame]]を押します。[[academy.hq.modes.classic]]は1ラウンド3分。先生の画面にはタイマーとライブランキングが表示されます。', shot: 'live-host' },
          { time: '5:00', title: '盛り上がったら、もう一回', body: '表彰台が表示されます。[[education.results.playAgain]]で同じコードのまま2ラウンド目へ、[[eduLive.results.backToClass]]で終了です。' },
        ],
      },
      { t: 'tip', text: '生徒がそろうまでには差があります。待っているあいだに[[tvLobby.tryPracticeRound]]を押せば、2体のボットのプレイを見て、説明なしでルールを覚えてくれます。' },
    ],
  },
  'five-minute-vocab-warm-up': {
    title: '5分でできる語彙のウォーミングアップ',
    summary: 'つづりだけでなく意味も確かめる授業のはじめに。昨日教えた単語で単語クイズをしましょう。',
    keywords: '授業のはじめ, ウォーミングアップ, 導入, 復習, 単語クイズ, 意味, 定義',
    blocks: [
      { t: 'p', text: '意味の入ったリストを使うといちばん効果的です。自分のリストが理想ですが、ライブラリにある意味つきのリストでも大丈夫です。' },
      {
        t: 'steps',
        items: [
          { time: '授業前', title: '意味つきのリストを用意する', body: '[[teacher.nav.lessons]]を開いて意味が表示されているリストを選ぶか、自分のリストに **単語 - 意味** の形で意味を加えます。' },
          { time: '0:00', title: '単語クイズを選ぶ', body: '先生HQで[[academy.hq.modes.vocabQuiz]]とリストをタップし、[[teacher.playNow.goLive]]を押します。生徒が教室に入ってくるあいだ、ロビーを黒板に映しておきましょう。' },
          { time: '0:30', title: 'だいたいそろったら開始', body: '途中参加は標準でオンなので、遅れてきた生徒もあとから入れます。[[hostView.startClassGame]]を押します。' },
          { time: '1:00', title: 'クイズを進める', body: '1語につき4択で、速く正解するほど高得点。先生は教室を回って様子を見られます。' },
          { time: '4:30', title: '結果をみんなで確認', body: 'クラスがまちがえた単語を指して、それぞれ一文で意味を伝えましょう。それがミニ授業になります。', shot: 'results' },
        ],
      },
      { t: 'tip', text: '緊張しやすい生徒がいますか？Teacher Proの落ち着きモードなら、クイズはそのままでタイマーとライブランキングを非表示にできます。' },
    ],
  },
  'homework-in-3-minutes': {
    title: '今夜の宿題を3分で出す',
    summary: 'リストを選んでWordCraftを配信、期限は明日。生徒はクラスページから取り組み、先生は誰が終えたか確認できます。',
    keywords: '宿題, 課題, 時短, 今夜, 明日まで, 自主学習',
    blocks: [
      {
        t: 'steps',
        items: [
          { time: '0:00', title: '単語を用意する', body: '授業で使ったリストを使うか、新しく貼り付けます。[単語リストを作る](help:make-a-word-list)も参考にしてください。' },
          { time: '1:00', title: '課題を作る', body: '先生HQで[[teacher.dashboard.tools]]を開き、[[teacher.assignment.create]]を押してリストを選びます。', shot: 'class-tools' },
          { time: '1:30', title: 'おすすめのゲームのまま', body: '**WordCraft** を選んだままにします。やさしいボットとの1人プレイなので、宿題に向いています。', shot: 'assign-type' },
          { time: '2:00', title: '期限は明日にして配信', body: '[[teacher.assignment.dueDate]]で明日をタップし、必要なら指示を1行書いて[[teacher.assignment.create]]を押します。' },
          { time: '3:00', title: '明日確認する', body: '[[teacher.dashboard.tools]]を開いて[[eduHq.tools.assignments]]へ。進行中・期限切れ・完了の課題が確認できます。' },
        ],
      },
      { t: 'tip', text: 'クラスに参加している生徒は、クラスページで宿題を見つけられます。新しい生徒もクラスコードでいつでも参加できます。' },
      { t: 'pro', text: '無料プランでは1クラスにつき課題は{assignments}件まで。もっと必要なら、Teacher Proで宿題が無制限になります。' },
    ],
  },
  'reteach-missed-words': {
    title: 'クラスが見逃した単語を教え直す',
    summary: '誰も見つけられなかった単語を、明日のウォーミングアップと今夜の宿題に。単語が定着する5分のサイクルです。',
    keywords: '教え直し, 見逃した単語, 復習, 間隔反復, 難しい単語, つまずき, 補習, フォローアップ',
    blocks: [
      {
        t: 'steps',
        items: [
          { time: '0:00', title: '見逃した単語を確認', body: 'ライブゲームのあと、結果画面で誰も見つけられなかったレッスンの単語がわかります。メモするか写真を撮っておきましょう。', shot: 'results' },
          { time: '1:00', title: 'クラスカードを見る', body: '[[teacher.nav.classes]]では、各クラスカードに最近のゲームで難しかった単語が表示され、練習が提案されます。' },
          { time: '2:00', title: '短いリストを作る', body: '先生HQで[[teacher.playNow.changeWords]]、[[teacher.playNow.sourcePaste]]の順に押し、その単語だけを貼り付けます。5〜10語で十分です。', shot: 'hq-paste-words' },
          { time: '3:00', title: '明日のウォーミングアップに', body: '明日の授業をそのリストを使った[[academy.hq.modes.wordHunt]]で始めましょう。クラスが見逃した単語そのものを探す競争になります。' },
          { time: '4:00', title: '宿題にも出す', body: '同じリストを宿題として配信すれば、生徒一人ひとりがもう一度その単語に向き合えます。' },
        ],
      },
      { t: 'pro', text: 'Teacher Proなら、このサイクルを自動化できます。単語の定着度で全ゲームを通してクラスが何度もまちがえる単語がわかり、間隔をあけた復習ラウンドで数日後に見逃した単語がもう一度出題されます。' },
    ],
  },
};

export const jaQuick: HelpQuickAnswer[] = [
  { q: '生徒にアカウントは必要ですか？', a: 'いいえ。生徒は6文字のコード、リンク、QRコードのいずれかで参加し、名前を決めるだけです。メールもパスワードもアプリも不要です。', slug: 'how-students-join' },
  { q: 'LexiClashは先生なら無料ですか？', a: 'はい。無料プランに期限はなく、最大{students}人のクラスを{classes}つ、ライブゲーム、単語リスト、宿題が使えます。Teacher Proは任意です。', slug: 'teacher-pro-and-trial' },
  { q: '1つのライブゲームに何人参加できますか？', a: '無料プランでもProでも、1つのライブゲームに最大{players}人まで参加できます。', slug: 'start-a-live-game' },
  { q: 'どの端末で使えますか？', a: '最新のブラウザがあれば、スマホ、タブレット、Chromebook、ノートパソコンのどれでも使えます。生徒はWebページを開くだけで、インストールは不要です。', slug: 'how-students-join' },
  { q: '自分で選んだ単語を使えますか？', a: 'はい。単語を貼り付け、クイズで使うなら意味を加えれば、ライブゲームにも宿題にも使えます。', slug: 'make-a-word-list' },
  { q: 'Teacher Proの料金は？', a: '{trialDays}日間の無料体験のあと、月{price}です。体験期間中に解約すれば料金はかかりません。生徒はずっと無料です。', slug: 'teacher-pro-and-trial' },
];
