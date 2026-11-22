export interface LocaleContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  heroTitle: string;
  intro: string;
  /** H2 for the extractable GEO answer block; body reuses `intro`. */
  geoQuestion: string;
  spellingListAnswer?: { question: string; paragraphs: string[] };
  ctaStart: string;
  ctaCduel: string;
  ctaMiddleSchool: string;
  fitsTitle: string;
  fits: Array<{ title: string; desc: string }>;
  stepsTitle: string;
  steps: Array<{ t: string; d: string }>;
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  moreTitle: string;
  moreCards: Array<{ title: string; sub: string }>;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
}

const en: LocaleContent = {
  metaTitle: 'Word Games for the Classroom — Free, No Login, No Download (2026) | LexiClash',
  metaDescription: 'Free word games for the classroom with no login and no download. Students join live multiplayer games with a 6-character code in seconds. Use your own word lists, 6 languages, works on any device. Zero prep for teachers.',
  ogTitle: 'Word Games for the Classroom — Free, No Login',
  ogDescription: 'Live multiplayer word games students join with a code. No download, no signup. Any device. Free to start.',
  twitterTitle: 'Word Games for the Classroom — Free',
  twitterDescription: 'Live multiplayer word games. No login, no download. Free.',
  heroTitle: 'Word games for the classroom — no login, no download, no prep.',
  intro: 'Most classroom games want student accounts, an app install, or both. LexiClash wants a 6-character code. Project it, students type it on any device, and the whole class is playing a live word game in seconds — free, browser-based, nothing to install. Word-formation gameplay (find and spell real words on Boggle-style grids, anagrams, and wheels) makes it perfect for vocabulary review, spelling, and brain breaks. Bring your own word list or use a built-in one for true zero prep.',
  geoQuestion: 'How do teachers run word games for the classroom with no student login?',
  spellingListAnswer: {
    question: 'How do I turn this week\'s spelling list into a game the whole class plays together?',
    paragraphs: [
      'When you start a class game, paste this week\'s spelling list into a lesson list or upload it as a CSV. Put the six-character join code on the projector and students join from their own phones, tablets or Chromebooks, with no accounts to make.',
      'Three live modes play straight from your list. Vocab Quiz asks the class four-choice questions built from your words, and its Boss Battle version has the whole room wearing down one boss together. Crossword builds a puzzle from the list with each word\'s meaning as the clue. Wordcraft deals every student their own board from the list to race a bot, while the class leaderboard adds everyone up.',
      'When the round ends, the results screen lists the words the class missed, so you know which ones to go over again. You can also send the same list home as homework, where each student practises it alone with a spelling drill that says the word and has them type it.',
    ],
  },
  ctaStart: 'Start a Class Game Free',
  ctaCduel: 'Run a 1v1 Duel',
  ctaMiddleSchool: 'Middle School Games',
  fitsTitle: 'Built for real classrooms',
  fits: [
    {
      title: 'Play in under a minute',
      desc: 'No account signup, no app install, no approval workflow. Generate a code, project it, students join and play instantly.'
    },
    {
      title: 'On any device',
      desc: 'Phones, tablets, laptops, or a mix in one room. No WiFi needed—works on hot spot, school network, or home internet.'
    },
    {
      title: 'Build from your own words',
      desc: 'Upload a CSV, paste a list, or pick from our built-in collections. Same game, your curriculum.'
    },
    {
      title: 'Real-time feedback',
      desc: 'See every word as it lands. Review results together—kids love watching high scores and seeing who got the tricky ones.'
    },
    {
      title: 'All ages welcome',
      desc: 'Elementary (spelling practice), middle school (word roots, vocabulary), high school (anagrams and patterns), ESL. One mechanic, endless difficulty.'
    },
    {
      title: 'Works on old tech',
      desc: 'No GPU required, no fancy graphics. Runs smooth on any school browser from the last 10 years.'
    }
  ],
  stepsTitle: 'Live in three steps',
  steps: [
    {
      t: 'Pick a list',
      d: 'Use a built-in word bank (6 languages, all ages) or upload your own CSV in seconds.'
    },
    {
      t: 'Project the code',
      d: 'You get a 6-character room code. Throw it on the board, screen, or say it aloud. Students type it in to join.'
    },
    {
      t: 'Play + review',
      d: 'Timer starts, kids race to find words. After the round, review the board live—everyone sees what was missed, what was found, what was tricky.'
    }
  ],
  faqTitle: 'Frequently asked questions',
  faqs: [
    {
      q: 'Do students need to create an account?',
      a: 'No. They just type the 6-character room code on the join screen. Zero friction, zero setup.'
    },
    {
      q: 'What if students don\'t have a device?',
      a: 'One device per pair or small group works fine. Multiplayer games (Boggle, Word Hunt) are cooperative or competitive by team, not individual.'
    },
    {
      q: 'Can I use my own word list?',
      a: 'Yes. Upload a CSV file or paste a list before you play. The game will use it for that session. Great for vocabulary units, spelling tests, or ESL themes.'
    },
    {
      q: 'What languages are supported?',
      a: 'English, Hebrew (RTL), Swedish, Japanese, Spanish, and Russian. All games, all word lists, full i18n.'
    },
    {
      q: 'How much does it cost?',
      a: 'Free to start — no ads and no login wall. Basic classroom play stays free for individual teachers; Teacher Pro ($9/mo) adds unlimited classes.'
    },
    {
      q: 'Will it work on our school WiFi?',
      a: 'Almost certainly. It\'s a standard web app (no WebGL, no peer-to-peer). If your school allows YouTube or Google Classroom, LexiClash works.'
    }
  ],
  moreTitle: 'More for teachers',
  moreCards: [
    {
      title: 'Substitute Teacher Games',
      sub: 'No-prep word games for any class in under 2 minutes. Works on any device.'
    },
    {
      title: 'Bell Ringer Word Games',
      sub: 'Quick daily word challenges—perfect for brain breaks and vocabulary drills.'
    },
    {
      title: 'Education Hub',
      sub: 'Word game guides, teaching strategies, and community lesson plans.'
    }
  ],
  finalTitle: 'Start one right now',
  finalBody: 'No account to create, nothing to install, no credit card. Pick a word list, project the join code, and the room is playing in under a minute.',
  finalCta: 'Start a Classroom Game Free'
};

// Swedish - native translation
const sv: LocaleContent = {
  metaTitle: 'Ordspel för klassrummet — Gratis, ingen inloggning, ingen nedladdning | LexiClash',
  metaDescription: 'Gratis ordspel för klassrummet utan inloggning och nedladdning. Eleverna går med i ett livespel med en kod på sex tecken. Använd egna ordlistor, 6 språk och vilken enhet som helst. Ingen förberedelse för läraren.',
  ogTitle: 'Ordspel för klassrummet — Gratis, ingen inloggning',
  ogDescription: 'Ordspel i realtid som eleverna går med i med en kod. Ingen nedladdning, ingen registrering, vilken enhet som helst. Gratis att börja.',
  twitterTitle: 'Ordspel för klassrummet — Gratis',
  twitterDescription: 'Ordspel i realtid. Ingen inloggning, ingen nedladdning. Gratis att börja.',
  heroTitle: 'Ordspel för klassrummet — ingen inloggning, ingen nedladdning, ingen förberedelse.',
  intro: 'De flesta klassrumsspel kräver elevkonton, en app eller både och. LexiClash behöver bara en kod på sex tecken. Visa den på projektorn, eleverna skriver in den på sin enhet och hela klassen spelar samma ordspel inom en minut, gratis i webbläsaren och utan installation. Eleverna hittar och stavar riktiga ord på bokstavsbräden, i anagram och på bokstavshjul, så spelet passar för ordförråd, stavning och korta pauser. Använd en egen ordlista eller en av de inbyggda.',
  geoQuestion: 'Hur kör lärare ordspel i klassrummet utan elevinloggning?',
  ctaStart: 'Starta ett klassrumsspel gratis',
  ctaCduel: 'Kör en duell 1 mot 1',
  ctaMiddleSchool: 'Spel för högstadiet',
  fitsTitle: 'Byggt för riktiga klassrum',
  fits: [
    {
      title: 'Igång på under en minut',
      desc: 'Inga konton, ingen app att installera och inget som behöver godkännas. Skapa en kod, visa den, och eleverna går med direkt.'
    },
    {
      title: 'På vilken enhet som helst',
      desc: 'Telefoner, surfplattor, Chromebooks eller en blandning i samma rum. Det fungerar på skolans nätverk, via mobilt internet eller hemifrån.'
    },
    {
      title: 'Bygg från dina egna ord',
      desc: 'Ladda upp en CSV-fil, klistra in en lista eller välj bland de inbyggda samlingarna. Samma spel, din läroplan.'
    },
    {
      title: 'Resultat i realtid',
      desc: 'Du ser varje ord när det kommer in. Gå igenom resultatet tillsammans efteråt och se vilka ord som var svåra.'
    },
    {
      title: 'För alla åldrar',
      desc: 'Lågstadiet övar stavning, mellanstadiet ordstammar och ordförråd, gymnasiet anagram och mönster, och det fungerar lika bra för sfi och engelska som andraspråk.'
    },
    {
      title: 'Fungerar på äldre datorer',
      desc: 'Inget grafikkort behövs. Spelet körs i en vanlig webbläsare, även på skolans äldre datorer.'
    }
  ],
  stepsTitle: 'Igång i tre steg',
  steps: [
    {
      t: 'Välj en lista',
      d: 'Använd en inbyggd ordbank (6 språk, alla åldrar) eller ladda upp en egen CSV-fil.'
    },
    {
      t: 'Visa koden',
      d: 'Du får en rumskod på sex tecken. Visa den på tavlan eller läs upp den, så skriver eleverna in den för att gå med.'
    },
    {
      t: 'Spela och gå igenom',
      d: 'Klockan startar och eleverna letar ord. Efter omgången går ni igenom brädet tillsammans och ser vad som hittades och vad som missades.'
    }
  ],
  faqTitle: 'Vanliga frågor',
  faqs: [
    {
      q: 'Behöver eleverna skapa ett konto?',
      a: 'Nej. De skriver bara in rumskoden på sex tecken. Inget konto och ingen installation.'
    },
    {
      q: 'Vad gör jag om alla elever inte har en enhet?',
      a: 'Låt eleverna dela en enhet i par eller små grupper. Då spelar varje grupp som ett lag.'
    },
    {
      q: 'Kan jag använda min egen ordlista?',
      a: 'Ja. Ladda upp en CSV-fil eller klistra in en lista innan ni spelar, så används den under lektionen. Det passar bra för veckans glosor, stavningsprov eller ett tema.'
    },
    {
      q: 'Vilka språk finns?',
      a: 'Engelska, hebreiska (från höger till vänster), svenska, japanska, spanska och ryska, var och en med sin egen ordlista.'
    },
    {
      q: 'Vad kostar det?',
      a: 'Det är gratis att börja, utan annonser och utan avgift per elev. Gratisplanen räcker till 3 klasser med upp till 50 elever, och Teacher Pro ($9/mån) lägger till obegränsat antal klasser.'
    },
    {
      q: 'Fungerar det på skolans wifi?',
      a: 'Nästan alltid. Det är en vanlig webbapp. Om skolan släpper igenom YouTube eller Google Classroom fungerar LexiClash också.'
    }
  ],
  moreTitle: 'Mer för lärare',
  moreCards: [
    {
      title: 'Ordspel för vikarier',
      sub: 'Ordspel utan förberedelse som fungerar i vilken klass som helst på under 2 minuter.'
    },
    {
      title: 'Ordspel för lektionsstart',
      sub: 'Korta dagliga ordutmaningar för att komma igång eller öva glosor.'
    },
    {
      title: 'Lärarsidan',
      sub: 'Guider till ordspel, undervisningsidéer och lektionsupplägg.'
    }
  ],
  finalTitle: 'Starta ett spel nu',
  finalBody: 'Inget konto, inget att installera och inget kreditkort. Välj en ordlista, visa rumskoden, så spelar klassen inom en minut.',
  finalCta: 'Starta ett klassrumsspel gratis'
};

// Japanese - native translation
const ja: LocaleContent = {
  metaTitle: 'クラスルーム向けワードゲーム — 無料、ログイン不要、ダウンロード不要 | LexiClash',
  metaDescription: '教室向けの無料ワードゲーム。ログインなし、ダウンロードなし。学生は6文字のコードで数秒でライブマルチプレイヤーゲームに参加できます。独自の単語リストを使用、6言語対応、すべてのデバイスで動作。教師向けゼロ準備。',
  ogTitle: 'クラスルーム向けワードゲーム — 無料、ログイン不要',
  ogDescription: 'コードで参加するライブマルチプレイヤーワードゲーム。ダウンロード不要、サインアップ不要。どのデバイスでも。無料で始められます。',
  twitterTitle: 'クラスルーム向けワードゲーム — 無料',
  twitterDescription: 'ライブマルチプレイヤーワードゲーム。ログイン不要、ダウンロード不要。無料。',
  heroTitle: 'クラスルーム向けワードゲーム — ログイン不要、ダウンロード不要、準備不要。',
  intro: 'ほとんどの教室ゲームには学生アカウント、アプリのインストール、またはその両方が必要です。LexiClashが必要なのは6文字のコードだけです。それを投影し、学生がどのデバイスからでも入力すると、クラス全体が数秒でライブワードゲームをプレイしています — 無料、ブラウザベース、何もインストールする必要がありません。単語形成ゲームプレイ（ボグル風グリッド、アナグラム、ホイール上の実在する単語を見つけて綴る）は、語彙復習、綴り、そして脳トレに最適です。独自の単語リストを持参するか、組み込みのリストを使用して真のゼロ準備を実現できます。',
  geoQuestion: '生徒アカウントなしで教室向けワードゲームを始めるには？',
  ctaStart: '無料でクラスゲームを開始',
  ctaCduel: '1対1デュエルを実行',
  ctaMiddleSchool: '中学校ゲーム',
  fitsTitle: '実際の教室向けに設計',
  fits: [
    {
      title: '1分以内でプレイ',
      desc: 'アカウント登録なし、アプリのインストールなし、承認フローなし。コードを生成し、投影し、学生は即座に参加してプレイします。'
    },
    {
      title: 'どのデバイスでも',
      desc: '1つの部屋でスマートフォン、タブレット、ノートパソコン、または混合。WiFi不要 — ホットスポット、学校ネットワーク、ホームインターネットで動作。'
    },
    {
      title: '独自の単語から構築',
      desc: 'CSVをアップロード、リストを貼り付け、または組み込みコレクションから選択します。同じゲーム、あなたのカリキュラム。'
    },
    {
      title: 'リアルタイムフィードバック',
      desc: '各単語が到着するとすぐに確認します。一緒に結果を確認 — 子どもたちはハイスコアを見たり、誰が難しいものをゲットしたかを見たりするのが大好きです。'
    },
    {
      title: 'すべての年齢を歓迎',
      desc: '小学校（綴り練習）、中学校（単語の根、語彙）、高校（アナグラムとパターン）、ESL。1つのメカニク、無限の難度。'
    },
    {
      title: '古いテクノロジーで動作',
      desc: 'GPU不要、派手なグラフィックス不要。過去10年間のあらゆる学校ブラウザでスムーズに実行します。'
    }
  ],
  stepsTitle: '3つのステップでライブ',
  steps: [
    {
      t: 'リストを選択',
      d: '組み込み単語銀行（6言語、全年齢）を使用するか、数秒で独自のCSVをアップロードします。'
    },
    {
      t: 'コードを投影',
      d: '6文字のルームコードを取得します。それを板、画面に投げるか、大声で言ってください。学生がそれを入力して参加します。'
    },
    {
      t: 'プレイ +レビュー',
      d: 'タイマーが開始され、子どもたちは単語を見つけるために競い合います。ラウンド後、ボードをライブで確認 — 誰もが何が逃されたか、何が見つかったか、何が難しかったかを見ます。'
    }
  ],
  faqTitle: 'よくある質問',
  faqs: [
    {
      q: '学生がアカウントを作成する必要はありますか？',
      a: 'いいえ。参加画面に6文字のルームコードを入力するだけです。摩擦ゼロ、設定ゼロ。'
    },
    {
      q: '学生がデバイスを持っていない場合はどうしますか？',
      a: '1つのデバイスを2人以上のグループと共有することができます。マルチプレイヤーゲーム（ボグル、ワードハント）はチームごとに協力的または競争的であり、個別ではありません。'
    },
    {
      q: '独自の単語リストを使用できますか？',
      a: 'はい。プレイ前にCSVファイルをアップロードまたはリストを貼り付けます。ゲームはそのセッションでそれを使用します。語彙ユニット、綴りテスト、またはESLテーマに最適です。'
    },
    {
      q: 'どの言語がサポートされていますか？',
      a: '英語、ヘブライ語（RTL）、スウェーデン語、日本語、スペイン語、ロシア語。すべてのゲーム、すべての単語リスト、完全なi18n。'
    },
    {
      q: 'それはいくらですか？',
      a: '無料で開始 — 広告なし、ログイン壁なし、生徒ごとの料金なし。基本的なクラスルームプレイは個人の先生向けに無料のまま。Teacher Pro（月$9）でクラスが無制限になります。'
    },
    {
      q: '学校のWiFiで動作しますか？',
      a: 'ほぼ確実に。これは標準的なWebアプリです（WebGL、ピアツーピアなし）。学校がYouTubeまたはGoogleクラスルームを許可している場合、LexiClashは動作します。'
    }
  ],
  moreTitle: '教師向けの詳細',
  moreCards: [
    {
      title: '代わりの教師ゲーム',
      sub: '2分以内のどのクラスにも準備なしのワードゲーム。どのデバイスでも動作。'
    },
    {
      title: 'ベルリンガーワードゲーム',
      sub: '毎日の高速単語チャレンジ — 脳トレと語彙ドリルに最適。'
    },
    {
      title: '教育ハブ',
      sub: 'ワードゲームガイド、教授戦略、コミュニティレッスンプラン。'
    }
  ],
  finalTitle: '今すぐ開始しましょう',
  finalBody: 'アカウントを作成する必要なし、インストール不要、クレジットカード不要。単語リストを選択し、ルームコードを投影すると、ルームは1分以内でプレイしています。',
  finalCta: '無料でクラスルームゲームを開始'
};

// Spanish - native translation
const es: LocaleContent = {
  metaTitle: 'Juegos de palabras para el aula — Gratis, Sin inicio de sesion, Sin descargas | LexiClash',
  metaDescription: 'Juegos de palabras gratuitos para el aula sin inicio de sesion y sin descargas. Los estudiantes se unen a juegos multijugador en vivo con un codigo de 6-characteros en segundos. Utilice sus propias listas de palabras, 6 idiomas, funciona en cualquier dispositivo. Cero preparacion para los maestros.',
  ogTitle: 'Juegos de palabras para el aula — Gratis, Sin inicio de sesion',
  ogDescription: 'Juegos de palabras multijugador en vivo a los que se unen con un codigo. Sin descarga, sin registro. Cualquier dispositivo. Gratis para empezar.',
  twitterTitle: 'Juegos de palabras para el aula — Gratis',
  twitterDescription: 'Juegos de palabras multijugador en vivo. Sin inicio de sesion, sin descargas. Gratis.',
  heroTitle: 'Juegos de palabras para el aula — sin inicio de sesion, sin descargas, sin preparacion.',
  intro: 'La mayoria de los juegos de aula requieren cuentas de estudiantes, una instalacion de aplicacion, o ambos. LexiClash solo necesita un codigo de 6-characteros. Proyectalo, los estudiantes lo escriben en cualquier dispositivo, y toda la clase esta jugando un juego de palabras en vivo en segundos — gratuito, basado en navegador, nada que instalar. La mecanica de juego de formacion de palabras (encontrar y deletrear palabras reales en cuadrículas estilo Boggle, anagramas y ruedas) lo hace perfecto para repaso de vocabulario, ortografia y descansos cerebrales. Trae tu propia lista de palabras o usa una integrada para preparacion realmente cero.',
  geoQuestion: 'Como se juegan juegos de palabras en el aula sin cuentas de estudiantes?',
  ctaStart: 'Iniciar un juego de clase gratis',
  ctaCduel: 'Ejecutar un duelo 1v1',
  ctaMiddleSchool: 'Juegos de escuela secundaria',
  fitsTitle: 'Disenado para aulas reales',
  fits: [
    {
      title: 'Juega en menos de un minuto',
      desc: 'Sin registro de cuenta, sin instalacion de aplicacion, sin flujo de aprobacion. Genera un codigo, proyectalo, los estudiantes se unen e inmediatamente juegan.'
    },
    {
      title: 'En cualquier dispositivo',
      desc: 'Telefonos, tabletas, laptops o una mezcla en una sala. Sin WiFi necesario — funciona en punto de acceso, red escolar, o internet en casa.'
    },
    {
      title: 'Construye con tus propias palabras',
      desc: 'Carga un CSV, pega una lista, o elige de nuestras colecciones integradas. Mismo juego, tu plan de estudios.'
    },
    {
      title: 'Retroalimentacion en tiempo real',
      desc: 'Ve cada palabra a medida que llega. Revisa los resultados juntos — a los ninos les encanta ver las puntuaciones mas altas y ver quien obtuvo las palabras dificiles.'
    },
    {
      title: 'Todas las edades bienvenidas',
      desc: 'Primaria (practica de ortografia), secundaria (raices de palabras, vocabulario), preparatoria (anagramas y patrones), ESL. Un mecanismo, dificultad infinita.'
    },
    {
      title: 'Funciona en tecnologia antigua',
      desc: 'Sin GPU requerida, sin graficos sofisticados. Se ejecuta sin problemas en cualquier navegador escolar de los ultimos 10 anos.'
    }
  ],
  stepsTitle: 'En vivo en tres pasos',
  steps: [
    {
      t: 'Elige una lista',
      d: 'Usa un banco de palabras integrado (6 idiomas, todas las edades) o carga tu propio CSV en segundos.'
    },
    {
      t: 'Proyecta el codigo',
      d: 'Obtiene un codigo de sala de 6-characteros. Lanzalo en la pizarra, pantalla, o dictalo en voz alta. Los estudiantes lo escriben para unirse.'
    },
    {
      t: 'Juega + revisa',
      d: 'El temporizador comienza, los ninos compiten para encontrar palabras. Despues de la ronda, revisa el tablero en vivo — todos ven lo que se perdio, lo que se encontro, lo que fue dificil.'
    }
  ],
  faqTitle: 'Preguntas frecuentes',
  faqs: [
    {
      q: 'Necesitan los estudiantes crear una cuenta?',
      a: 'No. Solo escriben el codigo de sala de 6-characteros en la pantalla de union. Cero friccion, cero configuracion.'
    },
    {
      q: 'Que pasa si los estudiantes no tienen un dispositivo?',
      a: 'Un dispositivo por pareja o grupo pequeno funciona bien. Los juegos multijugador (Boggle, Word Hunt) son cooperativos o competitivos por equipo, no individuales.'
    },
    {
      q: 'Puedo usar mi propia lista de palabras?',
      a: 'Si. Carga un archivo CSV o pega una lista antes de jugar. El juego la usara para esa sesion. Excelente para unidades de vocabulario, pruebas de ortografia, o temas de ESL.'
    },
    {
      q: 'Que idiomas son compatibles?',
      a: 'Ingles, hebreo (RTL), sueco, japones, espanol y ruso. Todos los juegos, todas las listas de palabras, i18n completo.'
    },
    {
      q: 'Cuanto cuesta?',
      a: 'Gratis para empezar — sin anuncios, sin muro de inicio de sesión, sin cargos por alumno. El juego básico de aula es gratis para docentes individuales; Teacher Pro ($9/mes) agrega clases ilimitadas.'
    },
    {
      q: 'Funcionara en nuestro WiFi escolar?',
      a: 'Casi con seguridad. Es una aplicacion web estandar (sin WebGL, sin peer-to-peer). Si tu escuela permite YouTube o Google Classroom, LexiClash funciona.'
    }
  ],
  moreTitle: 'Mas para maestros',
  moreCards: [
    {
      title: 'Juegos de maestro sustituto',
      sub: 'Juegos de palabras sin preparacion para cualquier clase en menos de 2 minutos. Funciona en cualquier dispositivo.'
    },
    {
      title: 'Juegos de palabras de campana sonadora',
      sub: 'Desafios de palabras diarios rapidos — perfecto para descansos cerebrales y ejercicios de vocabulario.'
    },
    {
      title: 'Centro de educacion',
      sub: 'Guias de juegos de palabras, estrategias de ensenanza, y planes de lecciones comunitarias.'
    }
  ],
  finalTitle: 'Comienza uno ahora',
  finalBody: 'Sin cuenta que crear, nada que instalar, sin tarjeta de credito. Elige una lista de palabras, proyecta el codigo de sala, y la sala esta jugando en menos de un minuto.',
  finalCta: 'Inicia un juego de aula gratis'
};

// Hebrew - native translation
const he: LocaleContent = {
  metaTitle: 'משחקי מילים לכיתה — חינם, ללא התחברות, ללא הורדה | LexiClash',
  metaDescription: 'משחקי מילים חינמיים לכיתה ללא התחברות וללא הורדה. תלמידים מצטרפים למשחקים מולטיפלייר בחיים עם קוד בן 6 תווים בשניות. השתמש ברשימות מילים שלך, 6 שפות, עובד בכל מכשיר. אפס הכנה למורים.',
  ogTitle: 'משחקי מילים לכיתה — חינם, ללא התחברות',
  ogDescription: 'משחקי מילים מולטיפלייר בחיים שתלמידים מצטרפים אליהם עם קוד. ללא הורדה, ללא הרשמה. כל מכשיר. חינם לעד.',
  twitterTitle: 'משחקי מילים לכיתה — חינם',
  twitterDescription: 'משחקי מילים מולטיפלייר בחיים. ללא התחברות, ללא הורדה. חינם.',
  heroTitle: 'משחקי מילים לכיתה — ללא התחברות, ללא הורדה, ללא הכנה.',
  intro: 'רוב משחקי הכיתה דורשים חשבונות תלמידים, התקנת אפליקציה, או שניהם. LexiClash צריך רק קוד בן 6 תווים. הקרן אותו, תלמידים מקלידים אותו בכל מכשיר, וכל הכיתה משחקת משחק מילים חי בשניות — חינם, מבוסס דפדפן, אין צורך להתקין. מכניקת משחק יצירת מילים (מצא ואיית מילים אמיתיות ברשתות בסגנון בוגל, אנגרמות וגלגלים) הופכת אותו למושלם לחזרה על אוצר מילים, איות והפסקות למוח. הביא את רשימת המילים שלך או השתמש באחת מובנית לאפס הכנה אמיתי.',
  geoQuestion: 'איך מריצים משחקי מילים בכיתה בלי חשבונות לתלמידים?',
  ctaStart: 'התחל משחק כיתה חינם',
  ctaCduel: 'הפעל דו-קרב 1 על 1',
  ctaMiddleSchool: 'משחקי חטיבת ביניים',
  fitsTitle: 'בנוי לכיתות אמיתיות',
  fits: [
    {
      title: 'שחק בפחות מדקה',
      desc: 'ללא הרשמה לחשבון, ללא התקנת אפליקציה, ללא זרימת אישור. צור קוד, הקרן אותו, תלמידים מצטרפים ומשחקים מיד.'
    },
    {
      title: 'בכל מכשיר',
      desc: 'טלפונים, טאבלטים, למטופים או תערובת בחדר אחד. אין צורך ב-WiFi — עובד בחיבור חם, רשת בית ספר או אינטרנט ביתי.'
    },
    {
      title: 'בנה מהמילים שלך',
      desc: 'העלה קובץ CSV, הדבק רשימה, או בחר מהאוספים המובנים שלנו. משחק זהה, הקורס שלך.'
    },
    {
      title: 'משוב בזמן אמת',
      desc: 'ראה כל מילה כשהיא מגיעה. בדוק תוצאות ביחד — ילדים אוהבים לראות ניקוד גבוה ולראות מי קיבל את הקשות.'
    },
    {
      title: 'כל הגילאים מוזמנים',
      desc: 'יסודי (תרגול איות), חטיבת ביניים (שורשי מילים, אוצר מילים), תיכון (אנגרמות ודפוסים), ESL. מכניקה אחת, קושי אינסופי.'
    },
    {
      title: 'עובד בטכנולוגיה ישנה',
      desc: 'לא נדרש GPU, אין גרפיקה מופנקת. פועל בצורה חלקה בכל דפדפן בית ספר מהעשר השנים האחרונות.'
    }
  ],
  stepsTitle: 'חי בשלושה שלבים',
  steps: [
    {
      t: 'בחר רשימה',
      d: 'השתמש בבנק מילים מובנה (6 שפות, כל גיל) או העלה את ה-CSV שלך בשניות.'
    },
    {
      t: 'הקרן את הקוד',
      d: 'אתה מקבל קוד חדר בן 6 תווים. זרוק אותו על הלוח, המסך, או אמור אותו בקול רם. תלמידים מקלידים אותו כדי להצטרף.'
    },
    {
      t: 'שחק + בדוק',
      d: 'הטיימר מתחיל, ילדים מתחרים למצוא מילים. לאחר הסיבוב, בדוק את הלוח בחיים — כולם רואים מה נפסל, מה נמצא, מה היה קשה.'
    }
  ],
  faqTitle: 'שאלות נפוצות',
  faqs: [
    {
      q: 'תלמידים צריכים ליצור חשבון?',
      a: 'לא. הם פשוט מקלידים את קוד החדר 6 תווים במסך ההצטרפות. אפס חיכוך, אפס הגדרה.'
    },
    {
      q: 'מה אם לתלמידים אין מכשיר?',
      a: 'מכשיר אחד לזוג או קבוצה קטנה עובד בסדר. משחקי מולטיפלייר (בוגל, חיפוש מילים) הם שיתופיים או תחרותיים לפי צוות, לא פרטניים.'
    },
    {
      q: 'האם אני יכול להשתמש ברשימת המילים שלי?',
      a: 'כן. העלה קובץ CSV או הדבק רשימה לפני שתשחק. המשחק ישתמש בו לאותה הסדרה. מעולה ליחידות אוצר מילים, בדיקות איות, או נושאי ESL.'
    },
    {
      q: 'אילו שפות נתמכות?',
      a: 'אנגלית, עברית (RTL), שוודית, יפנית, ספרדית ורוסית. כל משחקים, כל רשימות מילים, i18n מלא.'
    },
    {
      q: 'כמה זה עולה?',
      a: 'חינם להתחלה — בלי מודעות, בלי קיר התחברות, בלי עלות לכל תלמיד. המשחק הכיתתי הבסיסי נשאר חינם למורים בודדים; מסלול Teacher Pro ($9 לחודש) מוסיף כיתות ללא הגבלה.'
    },
    {
      q: 'האם זה יעבוד ב-WiFi של בית הספר שלנו?',
      a: 'כמעט בוודאות. זו אפליקציה ווב סטנדרטית (ללא WebGL, ללא peer-to-peer). אם בית הספר שלך מאפשר YouTube או Google Classroom, LexiClash עובד.'
    }
  ],
  moreTitle: 'עוד למורים',
  moreCards: [
    {
      title: 'משחקי מורה חלופי',
      sub: 'משחקי מילים ללא הכנה לכל כיתה בפחות מ-2 דקות. עובד בכל מכשיר.'
    },
    {
      title: 'משחקי מילים של פעמון',
      sub: 'אתגרי מילים יומיים מהיר — מושלם להפסקות מוח ותרגילי אוצר מילים.'
    },
    {
      title: 'מרכז חינוך',
      sub: 'מדריכים למשחקי מילים, אסטרטגיות הוראה, ותכניות שיעור קהילתיות.'
    }
  ],
  finalTitle: 'התחל אחד עכשיו',
  finalBody: 'אין חשבון ליצור, אין להתקין, אין כרטיס אשראי. בחר רשימת מילים, הקרן את קוד החדר, וחדר משחק בפחות מדקה.',
  finalCta: 'התחל משחק כיתה חינם'
};

// Russian - native translation
const ru: LocaleContent = {
  metaTitle: 'Словесные игры для класса — Бесплатно, без входа, без загрузки | LexiClash',
  metaDescription: 'Бесплатные словесные игры для класса без входа и загрузки. Ученики присоединяются к живым многопользовательским играм с кодом из 6 символов за считанные секунды. Используйте собственные списки слов, 6 языков, работает на любом устройстве. Нулевая подготовка для учителей.',
  ogTitle: 'Словесные игры для класса — Бесплатно, без входа',
  ogDescription: 'Живые многопользовательские словесные игры, к которым присоединяются по коду. Без загрузки, без регистрации. Любое устройство. Бесплатный старт.',
  twitterTitle: 'Словесные игры для класса — Бесплатно',
  twitterDescription: 'Живые многопользовательские словесные игры. Без входа, без загрузки. Бесплатно.',
  heroTitle: 'Словесные игры для класса — без входа, без загрузки, без подготовки.',
  intro: 'Большинство классных игр требуют учетные записи учеников, установку приложения или оба варианта. LexiClash требует только код из 6 символов. Проецируйте его, ученики вводят его на любом устройстве, и весь класс играет в живую словесную игру за считанные секунды — бесплатно, в браузере, ничего не надо устанавливать. Механика словообразования (ищите и пишите реальные слова на сетках в стиле Богла, анаграммы и колеса) идеальны для повторения словарного запаса, орфографии и пауз в мозгу. Принесите свой собственный список слов или используйте встроенный для истинной нулевой подготовки.',
  geoQuestion: 'Как провести словесные игры в классе без аккаунтов учеников?',
  ctaStart: 'Начать классную игру бесплатно',
  ctaCduel: 'Запустить поединок 1v1',
  ctaMiddleSchool: 'Игры для средней школы',
  fitsTitle: 'Разработано для реальных классов',
  fits: [
    {
      title: 'Играйте менее чем за минуту',
      desc: 'Без регистрации учетной записи, без установки приложения, без рабочего процесса утверждения. Создайте код, проецируйте его, ученики присоединяются и сразу же играют.'
    },
    {
      title: 'На любом устройстве',
      desc: 'Телефоны, планшеты, ноутбуки или микс в одном помещении. WiFi не требуется — работает через горячую точку, школьную сеть или домашний интернет.'
    },
    {
      title: 'Создавайте из своих слов',
      desc: 'Загрузите CSV, вставьте список или выберите из наших встроенных коллекций. Та же игра, ваша учебная программа.'
    },
    {
      title: 'Обратная связь в реальном времени',
      desc: 'Видите каждое слово по мере его появления. Просмотрите результаты вместе — дети любят видеть высокие баллы и узнавать, кто понял сложные слова.'
    },
    {
      title: 'Добро пожаловать всем возрастам',
      desc: 'Начальная школа (орфография), средняя школа (словообразование, словарный запас), старшая школа (анаграммы и паттерны), ESL. Одна механика, бесконечная сложность.'
    },
    {
      title: 'Работает на старых технологиях',
      desc: 'Не требуется GPU, никакой причудливой графики. Плавно работает в любом школьном браузере последних 10 лет.'
    }
  ],
  stepsTitle: 'В прямом эфире за три этапа',
  steps: [
    {
      t: 'Выберите список',
      d: 'Используйте встроенный словарь (6 языков, все возрасты) или загрузите свой CSV за считанные секунды.'
    },
    {
      t: 'Проецируйте код',
      d: 'Вы получите код из 6 символов комнаты. Бросьте его на доску, экран или произнесите вслух. Ученики вводят его, чтобы присоединиться.'
    },
    {
      t: 'Играйте + просмотрите',
      d: 'Таймер запускается, дети гонятся в поиске слов. После раунда просмотрите доску в прямом эфире — все видят, что было пропущено, что было найдено, что было сложно.'
    }
  ],
  faqTitle: 'Часто задаваемые вопросы',
  faqs: [
    {
      q: 'Должны ли ученики создавать учетную запись?',
      a: 'Нет. Они просто вводят код из 6 символов комнаты на экране присоединения. Нулевое трение, нулевая установка.'
    },
    {
      q: 'Что, если у учеников нет устройства?',
      a: 'Одно устройство на пару или небольшую группу работает отлично. Многопользовательские игры (Boggle, Word Hunt) являются кооперативными или конкурентными по командам, а не индивидуально.'
    },
    {
      q: 'Могу ли я использовать свой собственный список слов?',
      a: 'Да. Загрузите CSV-файл или вставьте список перед игрой. Игра будет использовать его для этой сессии. Отлично подходит для модулей словарного запаса, тестов на орфографию или тем ESL.'
    },
    {
      q: 'Какие языки поддерживаются?',
      a: 'Английский, иврит (RTL), шведский, японский, испанский и русский. Все игры, все списки слов, полный i18n.'
    },
    {
      q: 'Сколько это стоит?',
      a: 'Бесплатно начать — без рекламы, без стены входа, без платы за ученика. Базовая классная игра бесплатна для отдельных учителей; Teacher Pro ($9 в месяц) добавляет неограниченные классы.'
    },
    {
      q: 'Будет ли работать на школьном WiFi?',
      a: 'Почти наверняка. Это стандартное веб-приложение (без WebGL, без peer-to-peer). Если ваша школа разрешает YouTube или Google Classroom, LexiClash работает.'
    }
  ],
  moreTitle: 'Больше для учителей',
  moreCards: [
    {
      title: 'Игры учителя-заместителя',
      sub: 'Игры со словами без подготовки для любого класса менее чем за 2 минуты. Работает на любом устройстве.'
    },
    {
      title: 'Игры со словами на звонок',
      sub: 'Быстрые ежедневные словесные вызовы — идеально для пауз в мозгу и упражнений на словарный запас.'
    },
    {
      title: 'Образовательный центр',
      sub: 'Руководства по играм со словами, стратегии обучения и планы уроков сообщества.'
    }
  ],
  finalTitle: 'Начните прямо сейчас',
  finalBody: 'Нет учетной записи для создания, ничего не нужно устанавливать, кредитная карта не требуется. Выберите список слов, проецируйте код комнаты, и комната играет менее чем за минуту.',
  finalCta: 'Начать классную игру бесплатно'
};

export const CLASSROOM_LOCALES = ['en', 'sv', 'ja', 'es', 'he', 'ru'];

export const contentMap: Record<string, LocaleContent> = {
  en,
  sv,
  ja,
  es,
  he,
  ru
};

export function getClassroomContent(locale: string): LocaleContent {
  return contentMap[locale] || contentMap.en;
}
