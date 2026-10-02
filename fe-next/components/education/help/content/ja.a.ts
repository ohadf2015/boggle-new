import type { HelpLocaleContent } from '../helpTypes';

export const jaA: HelpLocaleContent = {
  'create-teacher-account': {
    title: '無料の先生アカウントを作る',
    summary: 'Googleかメールのワンタイムリンクで登録すると、その場で承認されて先生HQに入れます。所要時間は約1分、カード登録は不要です。',
    keywords: '登録, サインアップ, ログイン, サインイン, アカウント, 先生アクセス, 承認, パスワード, google, マジックリンク',
    blocks: [
      { t: 'p', text: '生徒にはアカウントは必要ありません。先生はアカウントを作ることで、クラス・単語リスト・結果を一か所にまとめて保存できます。無料で、無料プランに期限はありません。' },
      {
        t: 'steps',
        items: [
          { title: '先生用の登録画面を開く', body: '[先生HQ](app:/teacher)を開き、[[education.access.auth_required_cta]]を選びます。すでにLexiClashのアカウントがある場合は[[education.access.auth_signin_cta]]を選んでください。' },
          { title: 'ログイン方法を選ぶ', body: 'いちばん早いのは[[auth.continueWithGoogle]]です。メールがよければ学校のアドレスを入力すると、ワンタイムのログインリンクが届くので、パスワードを覚える必要はありません。[[auth.magicLink.usePassword]]も選べます。', shot: 'teacher-signup' },
          { title: '承認を受ける', body: '先生アクセスはすぐに承認されます。順番待ちも、確認の電話もありません。' },
          { title: '先生HQを見てみる', body: 'すぐに始められるゲームが用意された[[teacher.nav.play]]画面が開きます。横のメニュー（スマホでは画面下）に[[teacher.nav.classes]]、[[teacher.nav.lessons]]、[[teacher.nav.reports]]、[[teacher.nav.me]]があります。', shot: 'hq-overview' },
        ],
      },
      { t: 'tip', text: '最初のゲームの前に準備は要りません。[[teacher.playNow.goLive]]を押せば、参加コードが黒板に映るあいだにLexiClashがクラスを作ってくれます。' },
      { t: 'pro', text: '無料プランでは、最大{students}人のクラスを{classes}つまで使えます。Teacher Proは任意で、担当クラスが増えたときや、より詳しいレポートが欲しくなったときに検討すれば十分です。' },
    ],
  },
  'create-a-class': {
    title: 'クラスを作って参加コードを取得する',
    summary: '担当するグループごとにクラスを作りましょう。クラスごとに6文字のコード、名簿、結果がつきます。',
    keywords: '新しいクラス, 学級, クラス分け, 名簿, 参加コード, 名前の変更, クラスの削除, google classroom',
    blocks: [
      { t: 'p', text: 'クラスは、参加した生徒、出した宿題、すべてのゲーム結果をひとまとめにします。3つのグループを教えているなら、レポートが混ざらないようにクラスを3つ作りましょう。' },
      {
        t: 'steps',
        items: [
          { title: 'クラス画面を開く', body: '先生HQで[[teacher.nav.classes]]を開きます。すべてのクラスが、コードと名簿の人数とともに表示されます。' },
          { title: 'クラスを作る', body: '[[teacher.onboardingChecklist.createClassroomCta]]を押し、生徒がわかる名前（例：「2年3組 英語」）を付けて、クラスで使う言語を選びます。', shot: 'create-class' },
          { title: 'コードを共有する', body: '新しいクラスのカードに参加コードが表示されます。[[teacher.classroom.copyCode]]でクラスのチャットに貼り付けるか、[[teacher.nav.play]]から黒板に映しましょう。' },
          { title: 'あとから編集・整理する', body: 'クラスカードの **⋯** メニューから[[teacher.classroom.edit]]、[[teacher.classroom.googleClassroom]]、[[teacher.classroom.delete]]ができます。', shot: 'classes-actions' },
        ],
      },
      { t: 'tip', text: 'クラスの言語は大切です。それがクラスでプレイする言語になります。スペイン語のクラスは、先生の画面が日本語でもスペイン語の単語でプレイします。' },
      { t: 'pro', text: '無料プラン：クラスは{classes}つまで、1クラスの生徒は{students}人まで。Teacher Proならどちらの上限もなくなります。' },
    ],
  },
  'start-a-live-game': {
    title: 'ワンタップでライブゲームを始める',
    summary: 'ゲームを選び、単語を選び、「スタート」を押すだけ。生徒が席に着く前に、参加コードが黒板に映ります。',
    keywords: 'スタート, ライブ, ゲーム開始, プロジェクター, 授業でゲーム, クラスゲーム, 今すぐプレイ',
    blocks: [
      { t: 'p', text: 'ライブゲームでは、クラス全員がそれぞれの端末から同時にプレイし、黒板にはコード・タイマー・ランキングが映ります。すべて先生HQの[[teacher.nav.play]]から始まります。' },
      {
        t: 'steps',
        items: [
          { title: 'ゲームを選ぶ', body: '[[academy.hq.startTitle]]の下にあるポスターをタップします。迷ったら、[[academy.hq.modes.classic]]はどの単語リストでも遊べます。[[academy.hq.modes.vocabQuiz]]には意味つきの単語が必要です。', shot: 'hq-start-game' },
          { title: '単語を選ぶ', body: 'ポスターの下にあるリストをタップするか、[[teacher.playNow.changeWords]]を押して[[teacher.playNow.sourcePacks]]や[[teacher.playNow.sourcePaste]]を選びます。' },
          { title: '「スタート」を押す', body: '[[teacher.playNow.goLive]]を押すと、LexiClashがクラスを準備し、単語を読み込み、ルームを開きます。ロビーにはコード、参加リンク、QRコードが大きく表示されます。', shot: 'lobby' },
          { title: 'そろったら開始', body: '生徒が参加すると、ロビーに名前が次々と表示されます。生徒が1人以上入ると[[hostView.startClassGame]]が押せるようになります。押すと、全員の端末で同時にラウンドが始まります。' },
        ],
      },
      { t: 'tip', text: '始める前にどんなゲームか見せたいときは、ロビーで[[tvLobby.tryPracticeRound]]を押しましょう。説明しているあいだに2体のボットが短いラウンドをプレイします。クラスの結果には記録されません。' },
    ],
  },
  'how-students-join': {
    title: '生徒の参加方法（コード・リンク・QR）',
    summary: '生徒は6文字のコードを入力するか、リンクを開くかQRを読み取り、名前を決めるだけ。アカウントもメールもアプリも不要です。',
    keywords: '参加コード, 生徒のログイン, qrコード, リンク, アカウント不要, 参加ページ, 生徒が入れない, コードが違う',
    blocks: [
      { t: 'p', text: 'スマホ、タブレット、Chromebook、ノートパソコンなら約10秒で参加できます。最新のブラウザならどれでも動きます。' },
      {
        t: 'steps',
        items: [
          { title: 'コードを見える場所に出す', body: '先生HQの[[academy.hq.getStudentsIn]]カードにコードが表示されます。[[academy.hq.openProjector]]で全画面表示、[[academy.hq.qr]]で読み取り用のコード、[[academy.hq.copyLink]]でクラスのチャットや学習管理システムに貼るリンクが出せます。', shot: 'hq-get-students-in' },
          { title: '生徒が参加ページを開く', body: '生徒は **lexiclash.live/join** を開いて6文字を入力します。リンクを開くかQRを読み取れば、コードは自動で入力されます。' },
          { title: '生徒が名前を決める', body: '参加するクラス名を確認し、名前を入力して（サイコロをタップするとランダムな名前になります）[[education.student.join.flow.go]]を押せば完了です。', shot: 'student-join' },
          { title: '名簿が埋まっていくのを確認', body: '参加した生徒は先生の画面に順に表示されます。この方法でクラスに参加した生徒はクラスの名簿に追加され、結果もレポートに反映されます。' },
        ],
      },
      { t: 'tip', text: '名前は下の名前か、クラスで使っているニックネームにしてもらいましょう。ランキングでみんなに表示されるので、思いやりのある名前にしようと伝えるいい機会にもなります。' },
      { t: 'h2', text: '生徒が参加できないときは' },
      { t: 'list', items: ['コードを確認しましょう。英数字6文字で、ゲーム中はライブロビーに表示されているコードが有効です。', 'ページを再読み込みしてもらいましょう。学校のWi-Fiでページが途中までしか読み込まれていないのがよくある原因です。', 'ゲームを終了した場合、ルームは閉じています。もう一度[[teacher.playNow.goLive]]を押して、新しいコードを共有してください。'] },
    ],
  },
  'choose-a-game-mode': {
    title: 'どのゲームを選べばいい？',
    summary: 'ライブゲームは6種類。それぞれ得意なことが違います。何を練習できて、どんな場面に向いているかをまとめました。',
    keywords: 'ゲームモード, ワードアリーナ, クラシック, 単語クイズ, ブラスト, ワードハント, ワードクラフト, ホイールラッシュ, どのモード, 違い',
    blocks: [
      { t: 'p', text: 'どのモードも選んだ単語リストでプレイでき、同じ参加コードのまま使えます。授業の途中でも、誰も参加し直すことなく切り替えられます。' },
      {
        t: 'list',
        items: [
          '[[academy.hq.modes.classic]]：みんなで1つの文字盤を使い、見つけた単語をなぞります。どんなリストでもつづりや語の組み立ての練習に最適。標準は3分です。',
          '[[academy.hq.modes.vocabQuiz]]：4つの選択肢から意味を選び、速く正解するほど高得点。意味の確認にいちばん向いています。意味つきのリストが必要です。',
          '[[academy.hq.modes.blast]]：単語で連鎖コンボを起こすスピード勝負。金曜日や授業の最後の10分を盛り上げます。',
          '[[academy.hq.modes.wordHunt]]：リストの単語を文字盤からいち早く見つける競争。出会ったばかりの新出単語に向いています。',
          '[[academy.hq.modes.wordcraft]]：生徒それぞれが自分の盤でリストの単語を作ってバロンと対戦し、クラスのランキングで決着。落ち着いて取り組め、習熟度に差があるクラスにも合います。',
          '[[teacher.classroom.gameModes.wheelRush]]：文字のホイールを回し、制限時間内に単語を次々と出します。短くてにぎやか。',
        ],
      },
      { t: 'shot', id: 'lobby-switch-game', caption: 'ロビーの「ゲームを変える」なら、同じコードのままモードを切り替えられます。' },
      { t: 'h2', text: 'シンプルな目安' },
      { t: 'list', items: ['意味を教えるなら、まず[[academy.hq.modes.vocabQuiz]]。', 'つづりや語のなかまを教えるなら、[[academy.hq.modes.classic]]か[[academy.hq.modes.wordHunt]]。', '時間に追われると固まってしまう生徒には、[[academy.hq.modes.wordcraft]]。', '昼休み明けで元気がないときは、[[academy.hq.modes.blast]]。'] },
      { t: 'tip', text: 'リストに意味が入っていると、先生HQがその単語にいちばん合うゲームを表示するので、おすすめに従うだけでOKです。' },
    ],
  },
  'run-the-room': {
    title: 'ライブゲーム中の進め方',
    summary: '一時停止、時間の追加、ラウンドの終了、ゲームの切り替え、プレイヤーの退出。すべて画面下のバーから操作できます。',
    keywords: '一時停止, 時間延長, ラウンド終了, タイマー, ゲーム切り替え, 生徒を退出, 途中参加, 操作, ゲーム終了',
    blocks: [
      { t: 'p', text: 'ゲームが始まると、先生の画面は教室のスコアボードになります。遅れて来た生徒のためにコードは上に残り、中央にタイマー、ランキングはリアルタイムで更新されます。' },
      {
        t: 'steps',
        items: [
          { title: '始める前に設定を確認', body: 'ロビー下のバーに、ゲーム、タイマー、盤の大きさ、途中参加の可否が表示されます。[[education.modePicker.change]]を押せばゲームを切り替えられ、コードはそのままです。', shot: 'lobby-controls' },
          { title: 'ラウンドを操作する', body: 'プレイ中は、[[education.liveControls.pause]]で全員のタイマーを止め、**+30s** で時間を延長し、[[education.liveControls.endRound]]で早めに終了できます（誤操作を防ぐため2回タップ）。', shot: 'live-host' },
          { title: 'プレイヤーに対応する', body: 'プレイヤー数を開くと、誰がプレイ中で、誰がつまずいていそうかがわかります。このゲームからプレイヤーを退出させることもできます。退出した生徒はこのゲームに戻れません。' },
          { title: 'もう一回、またはおしまい', body: '結果画面で[[education.results.playAgain]]を押すと、同じ単語・同じコードでもう一度。[[eduLive.results.switchGame]]で別のモードへ。[[eduLive.results.backToClass]]で先生HQに戻ります。', shot: 'results' },
        ],
      },
      { t: 'tip', text: '「クラスに戻る」で抜けるときは確認が出ます。ゲームを終えると全員のルームが閉じるためです。単語を作っている途中の生徒は、この2回目のタップに感謝するはずです。' },
      { t: 'pro', text: 'Teacher Proには落ち着きモードがあり、タイマー、ライブランキング、スピードボーナスを生徒に見せるかどうかを先生が決められます。緊張しやすい生徒やテストのときに便利です。' },
    ],
  },
  'assign-homework': {
    title: '生徒が自分で取り組む宿題を出す',
    summary: '単語リストと練習の種類を選び、期限を決めるだけ。生徒は都合のいいときにクラスページから取り組めます。',
    keywords: '宿題, 課題, 配信, 期限, 練習モード, 対戦チャレンジ, ワードクラフト, 自主学習',
    blocks: [
      { t: 'p', text: '宿題にはライブゲームと同じ単語リストを使います。生徒はクラスページで宿題を見つけられるので、新しく説明することはありません。' },
      {
        t: 'steps',
        items: [
          { title: '課題の作成画面を開く', body: '先生HQで[[teacher.dashboard.tools]]を開き、[[teacher.assignment.create]]を押します。初回はクラスのチェックリストから始めることもできます。', shot: 'class-tools' },
          { title: '単語リストを選ぶ', body: '宿題で練習するレッスンを選びます。作成したリスト、貼り付けたリスト、スターターパックから保存したリストがすべて表示されます。' },
          { title: '練習の種類を選ぶ', body: '**WordCraft**（おすすめ）はやさしいボットとの1人プレイです。[[teacher.assignment.practiceMode]]は単語を反復練習し、[[teacher.assignment.duelChallenge]]は生徒どうしをペアにします。', shot: 'assign-type' },
          { title: '練習する内容を決める', body: '[[teacher.assignment.practiceMode]]では、意味・類義語・文脈のヒントなどの[[teacher.assignment.focus.label]]を選ぶか、[[teacher.assignment.focus.any]]のままにできます。リストの単語にその情報が十分そろうと、そのスキルが選べるようになります。', shot: 'assign-focus' },
          { title: '期限を決めて配信', body: '[[teacher.assignment.dueDate]]をワンタップ（今日・明日・来週）か日付指定で決め、必要なら指示を書き添えて、[[teacher.assignment.create]]を押します。' },
        ],
      },
      { t: 'tip', text: '誰が終えたかを見るには、[[teacher.dashboard.tools]]を開いて[[eduHq.tools.assignments]]へ。課題は進行中・期限切れ・完了に分けて表示されます。' },
      { t: 'pro', text: '無料プランでは1クラスにつき課題は{assignments}件まで。Teacher Proなら無制限です。' },
    ],
  },
};
