// Server-rendered SEO content for the /education hub (crawlable copy + FAQPage
// JSON-LD source). Extracted from page.tsx so the teacher-intent FAQ is unit
// testable without importing the server page. The last two FAQ entries per
// locale (custom-word-list + no-download) target real teacher search intent
// surfaced 2026-05-30 — see docs/2026-05-30-education-teacher-seo-intent.md.

export type EducationFaqItem = { question: string; answer: string };
export type EducationSeoEntry = {
  title: string;
  description: string;
  features: string[];
  faq: EducationFaqItem[];
};

export const educationSeoContent: Record<string, EducationSeoEntry> = {
  en: {
    title: 'Free Vocabulary Games for the Classroom — No Student Logins',
    description: 'Free word and vocabulary games for your classroom — no student accounts, no ads, and no downloads. Bring your own word lists, run whole-class multiplayer in any browser, and teach vocabulary in 5 languages including Hebrew and Japanese. Built for teachers, free forever.',
    features: [
      'Classroom word games designed for student engagement and learning outcomes',
      'Vocabulary duels between students for competitive, fun review sessions',
      'Teacher dashboard to create assignments and monitor student progress',
      'Curriculum-aligned word exercises for any subject or grade level',
      'Real-time leaderboards to motivate and reward student achievement',
    ],
    faq: [
      { question: 'What word games are available for the classroom?', answer: 'LexiClash Education offers multiplayer vocabulary duels, timed word hunts, and collaborative word-building challenges — all playable directly in a browser with no downloads required.' },
      { question: 'How do teachers set up a classroom word game?', answer: 'Teachers create a classroom in the teacher dashboard, invite students with a join code, and launch any word game or assignment in seconds. Progress and scores are tracked automatically.' },
      { question: 'Is LexiClash an educational word game for students of all ages?', answer: 'Yes. Difficulty and word lists are customizable per assignment, making it suitable for primary, middle, and high school students as well as adult learners.' },
      { question: 'Can I use LexiClash as a vocabulary game for teachers?', answer: 'Absolutely. The teacher hub lets you build custom word lists from your curriculum, schedule game sessions, view class-wide analytics, and export results for grading.' },
      { question: 'How does the vocabulary duel format work?', answer: 'Two or more students compete head-to-head to find words from a shared board as fast as possible. First to hit the target score wins. Teachers can restrict word lists to vocabulary from current lessons.' },
      { question: 'Do students need an account to play?', answer: 'No. Students join a classroom session with a 4-digit code and play instantly in any browser. Only the teacher needs an account to manage classrooms and word lists.' },
      { question: 'Is LexiClash Education really free?', answer: 'Yes — fully free, no paywalls, no premium tier. Teachers and students get the same word games, vocabulary duels, classroom multiplayer, and analytics dashboard at zero cost.' },
      { question: 'How does LexiClash compare to Quizlet, Kahoot, or Wordwall?', answer: 'LexiClash focuses on word-formation gameplay (Boggle-style grids, anagrams, word wheels) rather than flashcards or quizzes. It runs without student accounts, supports 5 languages including Hebrew RTL and Japanese, and adds real-time multiplayer for the whole class — all on a free tier.' },
      { question: 'What languages does LexiClash Education support?', answer: 'English, Hebrew (with full right-to-left layout), Swedish, Japanese, and Spanish. Each language has its own dictionary, making LexiClash suitable for ESL/EFL classrooms, Hebrew immersion programs, and multilingual schools.' },
      { question: 'How long is a typical classroom session?', answer: 'A vocabulary duel takes 2–3 minutes. A whole-class word game runs 5–10 minutes. Most teachers use LexiClash as a 5-minute warm-up, mid-lesson brain break, or end-of-class review activity.' },
      { question: 'Can I use my own vocabulary or word list?', answer: 'Yes. Build a custom word list from your own curriculum or paste any vocabulary set, and students play the word games using exactly the words you are teaching that week — there is no fixed word bank you are stuck with.' },
      { question: 'Do students need to download or install anything?', answer: 'No. LexiClash runs in any browser — Chromebooks, tablets, phones, or desktops — with no app, plugin, or install to manage. Students join with a 4-digit code and start playing instantly.' },
    ],
  },
  he: {
    title: 'משחקי אוצר מילים חינמיים לכיתה — בלי חשבונות לתלמידים',
    description: 'משחקי מילים ואוצר מילים חינמיים לכיתה — בלי חשבונות לתלמידים, בלי פרסומות ובלי הורדות. הביאו רשימות מילים משלכם, שחקו רב-משתתפים לכל הכיתה בכל דפדפן, ולמדו אוצר מילים ב-5 שפות כולל עברית ויפנית. נבנה למורים, חינם לתמיד.',
    features: [
      'משחקי מילים לכיתה המיועדים למעורבות תלמידים ותוצאות למידה',
      'דואלי אוצר מילים בין תלמידים לסשנים תחרותיים ומהנים',
      'לוח מחוונים למורים ליצירת מטלות ומעקב אחר התקדמות',
      'תרגילי מילים המותאמים לתכנית הלימודים לכל נושא ורמת כיתה',
      'לוחות מובילים בזמן אמת להנעת תלמידים ותגמול הישגים',
    ],
    faq: [
      { question: 'אילו משחקי מילים זמינים לכיתה?', answer: 'LexiClash Education מציע דואלי אוצר מילים רב-משתתפים, מצודות מילים בזמן מוגבל ואתגרי בניית מילים שיתופיים — כולם ניתנים למשחק ישירות בדפדפן ללא הורדה.' },
      { question: 'כיצד מורים יוצרים כיתה?', answer: 'מורים יוצרים כיתה בלוח המחוונים, מזמינים תלמידים עם קוד הצטרפות ומשיקים כל משחק מילים תוך שניות. ניקוד והתקדמות נעקבים אוטומטית.' },
      { question: 'האם ניתן להשתמש ב-LexiClash כמשחק אוצר מילים לכל הגילאים?', answer: 'כן. הרמה ורשימות המילים ניתנות להתאמה אישית לכל מטלה, מה שהופך אותה למתאימה לתלמידי יסודי, חטיבה ותיכון.' },
      { question: 'האם תלמידים צריכים חשבון כדי לשחק?', answer: 'לא. תלמידים מצטרפים למפגש כיתתי עם קוד בן 4 ספרות ומשחקים מיידית בכל דפדפן. רק המורה צריך חשבון לניהול כיתות ורשימות מילים.' },
      { question: 'האם LexiClash Education באמת חינמי?', answer: 'כן — חינם לחלוטין, ללא חומות תשלום, ללא שכבת פרימיום. מורים ותלמידים מקבלים את אותם משחקי מילים, דואלי אוצר מילים, רב-משתתפים כיתתי ולוח אנליטיקה ללא עלות.' },
      { question: 'איך LexiClash משתווה ל-Quizlet, Kahoot או Wordwall?', answer: 'LexiClash מתמקד במשחקי בניית מילים (לוחות בסגנון Boggle, אנגרמות, גלגלי מילים) במקום כרטיסיות או חידונים. פועל ללא חשבונות תלמיד, תומך ב-5 שפות כולל עברית RTL ויפנית, ומוסיף רב-משתתפים בזמן אמת לכל הכיתה — הכל בשכבה חינמית.' },
      { question: 'באילו שפות LexiClash Education תומך?', answer: 'אנגלית, עברית (כולל פריסה ימין-לשמאל מלאה), שוודית, יפנית וספרדית. לכל שפה מילון משלה, מה שהופך את LexiClash למתאים לכיתות אנגלית כשפה שנייה, תוכניות עברית כשפה שנייה ובתי ספר רב-לשוניים.' },
      { question: 'כמה זמן אורך מפגש כיתתי טיפוסי?', answer: 'דואל אוצר מילים אורך 2–3 דקות. משחק מילים לכל הכיתה אורך 5–10 דקות. רוב המורים משתמשים ב-LexiClash כחימום של 5 דקות, הפסקת מוח באמצע השיעור או פעילות סיכום בסוף השיעור.' },
      { question: 'האם אפשר להשתמש ברשימת המילים שלי?', answer: 'כן. בנו רשימת מילים מותאמת מתוכנית הלימודים שלכם או הדביקו כל אוסף מילים, והתלמידים משחקים במשחקי המילים בדיוק עם המילים שאתם מלמדים השבוע — אין מאגר מילים קבוע שאתם תקועים איתו.' },
      { question: 'האם תלמידים צריכים להוריד או להתקין משהו?', answer: 'לא. LexiClash פועל בכל דפדפן — Chromebook, טאבלט, טלפון או מחשב — ללא אפליקציה, תוסף או התקנה. התלמידים מצטרפים עם קוד בן 4 ספרות ומתחילים לשחק מיד.' },
    ],
  },
  ja: {
    title: '教室向け無料語彙ゲーム — 生徒のログイン不要',
    description: '教室で使える無料の単語・語彙ゲーム。生徒のアカウント不要、広告なし、ダウンロードなし。自分の単語リストを使い、どのブラウザでもクラス全体でマルチプレイ。ヘブライ語や日本語を含む5言語で語彙を教えられます。先生はずっと無料。',
    features: [
      '生徒の参加と学習成果のために設計されたクラスルームワードゲーム',
      '競争的で楽しい復習のための生徒間語彙デュエル',
      '課題作成と生徒の進捗監視のための教師ダッシュボード',
      'あらゆる科目や学年向けのカリキュラム準拠ワード演習',
      'リアルタイムリーダーボードで生徒のモチベーションを高める',
    ],
    faq: [
      { question: '教室で利用できるワードゲームは？', answer: 'LexiClash Educationはマルチプレイヤー語彙デュエル、時間制限付きワードハント、共同ワードビルディングチャレンジを提供します。すべてブラウザで直接プレイ可能、ダウンロード不要です。' },
      { question: '教師はどのようにクラスルームワードゲームを設定しますか？', answer: '教師は教師ダッシュボードでクラスを作成し、参加コードで生徒を招待し、数秒でゲームや課題を開始できます。進捗とスコアは自動的に追跡されます。' },
      { question: 'LexiClashはあらゆる年齢の生徒に適していますか？', answer: 'はい。難易度とワードリストは課題ごとにカスタマイズ可能で、小学生、中学生、高校生、成人学習者に適しています。' },
      { question: '教師向けの語彙ゲームとして使えますか？', answer: 'もちろんです。教師ハブではカリキュラムからカスタムワードリストを作成し、ゲームセッションをスケジュールし、クラス全体の分析を表示し、採点用に結果をエクスポートできます。' },
      { question: '語彙デュエルの形式はどのように機能しますか？', answer: '2人以上の生徒が共有ボードからできるだけ早く単語を見つけて対戦します。目標スコアに最初に達した方が勝ちます。教師は現在のレッスンの語彙にワードリストを制限できます。' },
      { question: '生徒はプレイにアカウントが必要ですか？', answer: 'いいえ。生徒は4桁のコードでクラスルームセッションに参加し、任意のブラウザで即座にプレイできます。教師のみがクラスルームとワードリストの管理にアカウントが必要です。' },
      { question: 'LexiClash Educationは本当に無料ですか？', answer: 'はい — 完全無料、ペイウォールなし、プレミアム階層なし。教師と生徒は同じワードゲーム、語彙デュエル、クラスルームマルチプレイヤー、分析ダッシュボードを無料で利用できます。' },
      { question: 'LexiClashはQuizlet、Kahoot、Wordwallと比べてどうですか？', answer: 'LexiClashはフラッシュカードやクイズではなく、単語形成ゲームプレイ（Boggleスタイルのグリッド、アナグラム、ワードホイール）に焦点を当てています。生徒のアカウントなしで動作し、ヘブライ語RTLと日本語を含む5言語をサポートし、クラス全体のリアルタイムマルチプレイヤーを追加 — すべて無料階層で。' },
      { question: 'LexiClash Educationはどの言語をサポートしていますか？', answer: '英語、ヘブライ語（完全な右から左のレイアウト付き）、スウェーデン語、日本語、スペイン語。各言語には独自の辞書があり、ESL/EFL教室、ヘブライ語イマージョンプログラム、多言語学校に適しています。' },
      { question: '典型的なクラスルームセッションの長さは？', answer: '語彙デュエルは2〜3分。クラス全体のワードゲームは5〜10分実行されます。ほとんどの教師はLexiClashを5分間のウォームアップ、レッスン中盤の頭の休憩、または授業終了時の復習活動として使用します。' },
      { question: '自分の単語リストを使えますか？', answer: 'はい。自分のカリキュラムからカスタム単語リストを作成するか、任意の語彙セットを貼り付けるだけで、生徒はその週に教えている単語そのものでワードゲームをプレイできます。固定の単語バンクに縛られることはありません。' },
      { question: '生徒は何かをダウンロードまたはインストールする必要がありますか？', answer: 'いいえ。LexiClashはあらゆるブラウザ（Chromebook、タブレット、スマートフォン、デスクトップ）で動作し、アプリ、プラグイン、インストールは不要です。生徒は4桁のコードで参加し、すぐにプレイを開始できます。' },
    ],
  },
  sv: {
    title: 'Gratis ordförrådsspel för klassrummet — utan elevkonton',
    description: 'Gratis ord- och ordförrådsspel för klassrummet — inga elevkonton, inga annonser och inga nedladdningar. Använd egna ordlistor, kör multiplayer för hela klassen i valfri webbläsare och undervisa ordförråd på 5 språk inklusive hebreiska och japanska. Byggt för lärare, gratis för alltid.',
    features: [
      'Klassrumsordspel designade för elevengagemang och inlärningsresultat',
      'Ordförrådsdueller mellan elever för roliga och tävlingsinriktade repetitionssessioner',
      'Lärarpanel för att skapa uppgifter och övervaka elevernas framsteg',
      'Läroplansanpassade ordövningar för alla ämnen och årskurser',
      'Topplistor i realtid för att motivera och belöna elevernas prestationer',
    ],
    faq: [
      { question: 'Vilka ordspel finns tillgängliga för klassrummet?', answer: 'LexiClash Education erbjuder ordförrådsdueller för flera spelare, tidsbegränsade ordjakter och samarbetsutmaningar — alla spelbara direkt i webbläsaren utan nedladdningar.' },
      { question: 'Hur ställer lärare in ett ordspel i klassrummet?', answer: 'Lärare skapar ett klassrum i lärarpanelen, bjuder in elever med en kod och startar valfritt spel eller uppgift på sekunder. Framsteg och poäng spåras automatiskt.' },
      { question: 'Är LexiClash lämpligt för elever i alla åldrar?', answer: 'Ja. Svårighetsgrad och ordlistor kan anpassas per uppgift, vilket gör det lämpligt för elever i grundskolan, mellanstadiet och gymnasiet samt vuxna inlärare.' },
      { question: 'Kan jag använda LexiClash som ett ordförrådsspel för lärare?', answer: 'Absolut. Lärarhubben låter dig bygga anpassade ordlistor från din läroplan, schemalägga spelpass, visa klassanalys och exportera resultat för betygsättning.' },
      { question: 'Hur fungerar ordförrådsduellerna?', answer: 'Två eller fler elever tävlar mot varandra för att hitta ord från en gemensam bräda så snabbt som möjligt. Den första som når målpoängen vinner. Lärare kan begränsa ordlistor till aktuell lektionsvokabulär.' },
      { question: 'Behöver elever ett konto för att spela?', answer: 'Nej. Elever ansluter till en klassrumssession med en 4-siffrig kod och spelar direkt i valfri webbläsare. Endast läraren behöver ett konto för att hantera klassrum och ordlistor.' },
      { question: 'Är LexiClash Education verkligen gratis?', answer: 'Ja — helt gratis, inga betalspärrar, ingen premiumnivå. Lärare och elever får samma ordspel, ordförrådsdueller, klassrumsmultiplayer och analyspanel utan kostnad.' },
      { question: 'Hur jämförs LexiClash med Quizlet, Kahoot eller Wordwall?', answer: 'LexiClash fokuserar på ordbildningsspel (Boggle-liknande brädor, anagram, ordhjul) snarare än flashcards eller frågesporter. Det fungerar utan elevkonton, stöder 5 språk inklusive hebreiska RTL och japanska, och lägger till realtidsmultiplayer för hela klassen — allt på en gratisnivå.' },
      { question: 'Vilka språk stöder LexiClash Education?', answer: 'Engelska, hebreiska (med fullständig höger-till-vänster-layout), svenska, japanska och spanska. Varje språk har sin egen ordbok, vilket gör LexiClash lämpligt för ESL/EFL-klassrum, hebreiska immersionsprogram och flerspråkiga skolor.' },
      { question: 'Hur lång är en typisk klassrumssession?', answer: 'En ordförrådsduell tar 2–3 minuter. Ett ordspel för hela klassen pågår 5–10 minuter. De flesta lärare använder LexiClash som en 5-minuters uppvärmning, hjärnpaus mitt i lektionen eller granskningsaktivitet vid lektionens slut.' },
      { question: 'Kan jag använda min egen ordlista?', answer: 'Ja. Bygg en anpassad ordlista från din egen läroplan eller klistra in valfri orduppsättning, så spelar eleverna ordspelen med exakt de ord du undervisar den veckan — du är inte låst till någon fast ordbank.' },
      { question: 'Behöver elever ladda ner eller installera något?', answer: 'Nej. LexiClash körs i valfri webbläsare — Chromebook, surfplatta, telefon eller dator — utan app, plugin eller installation att hantera. Eleverna ansluter med en 4-siffrig kod och börjar spela direkt.' },
    ],
  },
  es: {
    title: 'Juegos de vocabulario gratis para el aula — sin cuentas de estudiantes',
    description: 'Juegos de palabras y vocabulario gratis para el aula — sin cuentas de estudiantes, sin anuncios y sin descargas. Usa tus propias listas de palabras, juega multijugador con toda la clase en cualquier navegador y enseña vocabulario en 5 idiomas, incluidos hebreo y japonés. Hecho para docentes, gratis para siempre.',
    features: [
      'Juegos de palabras para el aula diseñados para la participación y el aprendizaje de los alumnos',
      'Duelos de vocabulario entre estudiantes para sesiones de repaso competitivas y divertidas',
      'Panel del profesor para crear tareas y monitorear el progreso de los alumnos',
      'Ejercicios de palabras alineados con el currículo para cualquier materia y nivel',
      'Clasificaciones en tiempo real para motivar y recompensar los logros de los estudiantes',
    ],
    faq: [
      { question: '¿Qué juegos de palabras para el aula están disponibles?', answer: 'LexiClash Education ofrece duelos de vocabulario multijugador, búsquedas de palabras cronometradas y desafíos colaborativos de construcción de palabras, todo jugable en el navegador sin descargas.' },
      { question: '¿Cómo configuran los profesores un juego de palabras en clase?', answer: 'Los profesores crean un aula en el panel del profesor, invitan a los alumnos con un código de acceso y lanzan cualquier juego o tarea en segundos. El progreso y las puntuaciones se registran automáticamente.' },
      { question: '¿Puedo usar LexiClash como juego de vocabulario para profesores?', answer: 'Por supuesto. El panel del profesor te permite crear listas de palabras personalizadas de tu currículo, programar sesiones de juego, ver análisis de toda la clase y exportar resultados.' },
      { question: '¿Necesitan los estudiantes una cuenta para jugar?', answer: 'No. Los estudiantes se unen a una sesión de aula con un código de 4 dígitos y juegan al instante en cualquier navegador. Solo el profesor necesita una cuenta para gestionar aulas y listas de palabras.' },
      { question: '¿LexiClash Education es realmente gratis?', answer: 'Sí — totalmente gratis, sin muros de pago, sin nivel premium. Profesores y estudiantes obtienen los mismos juegos de palabras, duelos de vocabulario, multijugador de aula y panel de análisis sin coste alguno.' },
      { question: '¿Cómo se compara LexiClash con Quizlet, Kahoot o Wordwall?', answer: 'LexiClash se centra en juegos de formación de palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) en lugar de tarjetas didácticas o cuestionarios. Funciona sin cuentas de estudiantes, admite 5 idiomas incluyendo hebreo RTL y japonés, y añade multijugador en tiempo real para toda la clase — todo en un nivel gratuito.' },
      { question: '¿Qué idiomas admite LexiClash Education?', answer: 'Inglés, hebreo (con diseño completo de derecha a izquierda), sueco, japonés y español. Cada idioma tiene su propio diccionario, lo que hace que LexiClash sea adecuado para aulas ESL/EFL, programas de inmersión en hebreo y escuelas multilingües.' },
      { question: '¿Cuánto dura una sesión de aula típica?', answer: 'Un duelo de vocabulario dura 2–3 minutos. Un juego de palabras para toda la clase dura 5–10 minutos. La mayoría de los profesores usan LexiClash como calentamiento de 5 minutos, descanso mental a mitad de lección o actividad de repaso al final de la clase.' },
      { question: '¿Puedo usar mi propia lista de vocabulario o de palabras?', answer: 'Sí. Crea una lista de palabras personalizada desde tu propio currículo o pega cualquier conjunto de vocabulario, y los estudiantes juegan con exactamente las palabras que enseñas esa semana — no estás atado a un banco de palabras fijo.' },
      { question: '¿Los estudiantes necesitan descargar o instalar algo?', answer: 'No. LexiClash funciona en cualquier navegador — Chromebooks, tablets, teléfonos u ordenadores — sin ninguna app, complemento ni instalación que gestionar. Los estudiantes se unen con un código de 4 dígitos y empiezan a jugar al instante.' },
    ],
  },
};
