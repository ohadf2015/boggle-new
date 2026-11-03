// Server-rendered SEO content for the /education hub (crawlable copy + FAQPage
// JSON-LD source). Extracted from page.tsx so the teacher-intent FAQ is unit
// testable without importing the server page. The last two FAQ entries per
// locale (custom-word-list + no-download) target real teacher search intent
// surfaced 2026-05-30 — see docs/2026-05-30-education-teacher-seo-intent.md.

import { PRO_COPY_PARAMS as P } from '@/lib/education/proFeatures';

export type EducationFaqItem = { question: string; answer: string };
export type EducationSeoEntry = {
  title: string;
  description: string;
  features: string[];
  faq: EducationFaqItem[];
  /** Cite-able 40–60 word answer. Rendered as a visible H2, not an accordion. */
  geoAnswer: EducationFaqItem;
};

export const educationSeoContent: Record<string, EducationSeoEntry> = {
  en: {
    title: 'Free Vocabulary Games for the Classroom — No Student Logins',
    description: 'Free word and vocabulary games for your classroom — no student accounts and no downloads. Bring your own word lists, run whole-class multiplayer in any browser, and teach vocabulary in 6 languages including Hebrew and Japanese. Free for teachers; Teacher Pro $9/month with a 14-day trial; Schools & departments from $49 per teacher / year (5+ teachers, invoice/PO).',
    features: [
      'Classroom word games designed for student engagement and learning outcomes',
      'Whole-class live games: the board on the projector, students on their own devices',
      'Teacher dashboard to create assignments and monitor student progress',
      'Curriculum-aligned word exercises for any subject or grade level',
      'Real-time leaderboards to motivate and reward student achievement',
    ],
    geoAnswer: {
      question: 'How do I run a free vocabulary game in class with no student logins?',
      answer:
        `Create a LexiClash Education class and share a 6-character join code. Students open any browser on a Chromebook, phone, or tablet and play immediately — no app, email, or student account. Use your own word list. Rounds last 2–10 minutes for a warm-up, brain break, or review. The free plan covers ${P.classes} classes of up to ${P.students} students.`,
    },
    faq: [
      { question: 'What word games are available for the classroom?', answer: `LexiClash Education has ${P.modes} live game modes, from a class quiz and a boss battle on the projector to timed word hunts and Boggle-style boards on phones — all playable in a browser with no downloads.` },
      { question: 'How do teachers set up a classroom word game?', answer: 'Teachers create a classroom in the teacher dashboard, invite students with a join code, and launch any word game or assignment in seconds. Progress and scores are tracked automatically.' },
      { question: 'Is LexiClash an educational word game for students of all ages?', answer: 'Yes. Difficulty and word lists are customizable per assignment, making it suitable for primary, middle, and high school students as well as adult learners.' },
      { question: 'Can I use LexiClash as a vocabulary game for teachers?', answer: `Absolutely. Build word lists from your curriculum, run them live or as assignments, and see every round's results. Teacher Pro adds per-student analytics and printable class reports.` },
      { question: 'What does Teacher Pro add?', answer: `Unlimited classes and assignments, per-student progress analytics, printable class reports, a mastery heatmap, missed-word practice rounds and calm-mode settings. Live games seat up to ${P.students} students on every plan. Teacher Pro is ${P.price}/month, and the first ${P.days} days are free.` },
      { question: 'Do students need an account to play?', answer: 'No. Students join a classroom session with a 6-character code and play instantly in any browser. Only the teacher needs an account to manage classrooms and word lists.' },
      { question: 'Is LexiClash Education really free?', answer: `Free to start, and the free plan is a real one: up to ${P.classes} classes of up to ${P.students} students each — a whole real class fits — ${P.assignments} assignments per class, all ${P.modes} live game modes, your own word lists, and no ads. Teacher Pro is ${P.price}/month and adds unlimited classes and assignments, progress analytics and printable reports.` },
      { question: 'How does LexiClash compare to Quizlet, Kahoot, or Wordwall?', answer: `LexiClash focuses on word-formation gameplay (Boggle-style grids, anagrams, word wheels) rather than flashcards or quizzes. It runs without student accounts, supports ${P.languages} languages including Hebrew RTL and Japanese, and adds real-time multiplayer for the whole class — all on a free tier.` },
      { question: 'What languages does LexiClash Education support?', answer: 'English, Hebrew (with full right-to-left layout), Swedish, Japanese, Spanish, and Russian. Each language has its own dictionary, making LexiClash suitable for ESL/EFL classrooms, Hebrew immersion programs, and multilingual schools.' },
      { question: 'How long is a typical classroom session?', answer: `A quick round takes 2–3 minutes. A whole-class word game runs 5–10 minutes. Most teachers use LexiClash as a 5-minute warm-up, mid-lesson brain break, or end-of-class review activity.` },
      { question: 'Can I use my own vocabulary or word list?', answer: 'Yes. Build a custom word list from your own curriculum or paste any vocabulary set, and students play the word games using exactly the words you are teaching that week — there is no fixed word bank you are stuck with.' },
      { question: 'Do students need to download or install anything?', answer: 'No. LexiClash runs in any browser — Chromebooks, tablets, phones, or desktops — with no app, plugin, or install to manage. Students join with a 6-character code and start playing instantly.' },
    ],
  },
  he: {
    title: 'משחקי אוצר מילים חינמיים לכיתה — בלי חשבונות לתלמידים',
    description: 'משחקי מילים ואוצר מילים חינמיים לכיתה — בלי חשבונות לתלמידים, בלי פרסומות ובלי הורדות. מביאים רשימת מילים משלכם, מריצים משחק לכל הכיתה מכל דפדפן, ומלמדים אוצר מילים ב-6 שפות, כולל עברית ויפנית. נבנה למורים, וחינם להתחלה.',
    features: [
      'משחקי מילים לכיתה שמייצרים מעורבות ומחזקים את הלמידה',
      'משחקים חיים לכל הכיתה: הלוח על המקרן, התלמידים במכשירים שלהם',
      'לוח בקרה למורה ליצירת מטלות ומעקב אחר התקדמות הכיתה',
      'תרגילי מילים שמתאימים לכל מקצוע ולכל שכבת גיל בתוכנית הלימודים',
      'טבלאות מובילים בזמן אמת שמעודדות את התלמידים ומתגמלות הצלחות',
    ],
    geoAnswer: {
      question: 'איך מריצים משחק אוצר מילים חינמי בכיתה בלי חשבונות לתלמידים?',
      answer:
        `יוצרים כיתה ב-LexiClash Education ומשתפים קוד הצטרפות בן 6 תווים. התלמידים נכנסים מכל דפדפן — Chromebook, טלפון או טאבלט — ומשחקים מיד, בלי אפליקציה, בלי אימייל ובלי חשבון. משתמשים ברשימת המילים שלכם. סבב נמשך 2–10 דקות לחימום, להפסקה קצרה או לחזרה. המסלול החינמי מכסה ${P.classes} כיתות של עד ${P.students} תלמידים.`,
    },
    faq: [
      { question: 'אילו משחקי מילים זמינים לכיתה?', answer: `ב-LexiClash Education יש ${P.modes} מצבי משחק חיים: מחידון כיתתי וקרב בוס על המקרן ועד ציד מילים בזמן מוגבל ולוחות בסגנון Boggle בטלפונים — הכל בדפדפן, בלי שום הורדה.` },
      { question: 'איך מורה מקים כיתה?', answer: 'נכנסים ללוח הבקרה למורה, יוצרים כיתה, ומזמינים את התלמידים עם קוד הצטרפות. כל משחק או מטלה עולים לאוויר תוך שניות, והניקוד וההתקדמות נרשמים אוטומטית.' },
      { question: 'האם LexiClash מתאים לתלמידים בכל גיל?', answer: 'כן. רמת הקושי ורשימות המילים מתכווננות לכל מטלה בנפרד, כך שזה מתאים מהיסודי ועד התיכון — וגם ללומדים מבוגרים.' },
      { question: 'אפשר להשתמש ב-LexiClash כמשחק אוצר מילים למורים?', answer: `בהחלט. בונים רשימות מילים מתוכנית הלימודים, מריצים אותן בשיעור או כמטלה, ורואים את התוצאות של כל סבב. Teacher Pro מוסיף מעקב התקדמות לכל תלמיד ודוחות כיתה להדפסה.` },
      { question: 'מה Teacher Pro מוסיף?', answer: `כיתות ומטלות ללא הגבלה, מעקב התקדמות לכל תלמיד, דוחות כיתה להדפסה, מפת שליטה במילים, סבבי תרגול למילים שהוחמצו ומצב רגוע. בכל התוכניות משחק חי מכיל עד ${P.students} תלמידים. Teacher Pro עולה ${P.price} לחודש, ו-${P.days} הימים הראשונים בחינם.` },
      { question: 'האם תלמידים צריכים חשבון כדי לשחק?', answer: 'לא. התלמידים מצטרפים למשחק עם קוד בן 6 תווים ומתחילים מיד, מכל דפדפן. רק המורה צריך חשבון כדי לנהל את הכיתות ורשימות המילים.' },
      { question: 'האם LexiClash Education באמת חינמי?', answer: `מתחילים בחינם, והמסלול החינמי אמיתי: עד ${P.classes} כיתות של עד ${P.students} תלמידים כל אחת — כיתה שלמה נכנסת — ${P.assignments} מטלות לכל כיתה, כל ${P.modes} מצבי המשחק החיים, רשימות מילים משלכם ובלי פרסומות. Teacher Pro עולה ${P.price} לחודש ומוסיף כיתות ומטלות ללא הגבלה, מעקב התקדמות ודוחות להדפסה.` },
      { question: 'במה LexiClash שונה מ-Quizlet, Kahoot או Wordwall?', answer: `במקום כרטיסיות או חידונים, ב-LexiClash בונים מילים — לוחות בסגנון Boggle, אנגרמות וגלגלי מילים. הוא רץ בלי חשבונות לתלמידים, תומך ב-${P.languages} שפות כולל עברית מימין לשמאל ויפנית, ומוסיף משחק לכל הכיתה בזמן אמת — והכל בחינם.` },
      { question: 'באילו שפות LexiClash Education תומך?', answer: 'אנגלית, עברית (עם פריסה מלאה מימין לשמאל), שוודית, יפנית, ספרדית ורוסית. לכל שפה מילון משלה, כך ש-LexiClash מתאים לכיתות אנגלית כשפה זרה, לתוכניות עברית כשפה שנייה ולבתי ספר רב-לשוניים.' },
      { question: 'כמה זמן אורך מפגש כיתתי טיפוסי?', answer: `סבב קצר לוקח 2–3 דקות, ומשחק לכל הכיתה רץ 5–10 דקות. רוב המורים מנצלים את זה לחימום של 5 דקות בתחילת השיעור, להפסקה קצרה באמצע, או לחזרה בסוף.` },
      { question: 'אפשר להשתמש ברשימת המילים שלי?', answer: 'כן. בונים רשימת מילים מתוכנית הלימודים שלכם או פשוט מדביקים אוסף מילים, והתלמידים משחקים בדיוק עם המילים שאתם מלמדים השבוע. אתם לא תקועים עם מאגר מילים קבוע.' },
      { question: 'צריך להוריד או להתקין משהו?', answer: 'לא. LexiClash רץ בכל דפדפן — Chromebook, טאבלט, טלפון או מחשב — בלי אפליקציה, תוסף או התקנה. התלמידים מצטרפים עם קוד בן 6 תווים ומתחילים לשחק מיד.' },
    ],
  },
  ja: {
    title: '教室向け無料語彙ゲーム — 生徒のログイン不要',
    description: '教室で使える無料の単語・語彙ゲーム。生徒のアカウント不要、広告なし、ダウンロードなし。自分の単語リストを使い、どのブラウザでもクラス全体でマルチプレイ。ヘブライ語や日本語を含む6言語で語彙を教えられます。無料で始められる。',
    features: [
      '生徒の参加と学習成果のために設計されたクラスルームワードゲーム',
      'クラス全員のライブゲーム：ボードはプロジェクターに、生徒は自分の端末で',
      '課題作成と生徒の進捗監視のための教師ダッシュボード',
      'あらゆる科目や学年向けのカリキュラム準拠ワード演習',
      'リアルタイムリーダーボードで生徒のモチベーションを高める',
    ],
    geoAnswer: {
      question: '生徒のログインなしで、無料の語彙ゲームを授業で始めるには？',
      answer:
        `LexiClash Educationでクラスを作り、6文字の参加コードを共有します。生徒はChromebook、スマホ、タブレットのブラウザですぐに遊べます。アプリもメールも生徒アカウントも不要です。自分の単語リストを使えます。1ラウンドは2〜10分で、ウォームアップ、休憩、復習に向きます。無料プランは1クラス${P.students}人まで、最大${P.classes}クラスです。`,
    },
    faq: [
      { question: '教室で利用できるワードゲームは？', answer: `LexiClash Educationには${P.modes}つのライブモードがあります。プロジェクターで遊ぶクラスクイズやボスバトルから、スマホで遊ぶ制限時間つきワードハントやBoggle風ボードまで。すべてブラウザで、ダウンロード不要です。` },
      { question: '教師はどのようにクラスルームワードゲームを設定しますか？', answer: '教師は教師ダッシュボードでクラスを作成し、参加コードで生徒を招待し、数秒でゲームや課題を開始できます。進捗とスコアは自動的に追跡されます。' },
      { question: 'LexiClashはあらゆる年齢の生徒に適していますか？', answer: 'はい。難易度とワードリストは課題ごとにカスタマイズ可能で、小学生、中学生、高校生、成人学習者に適しています。' },
      { question: '教師向けの語彙ゲームとして使えますか？', answer: `もちろんです。カリキュラムから単語リストを作り、授業のライブゲームや課題として使い、毎ラウンドの結果を確認できます。Teacher Proでは生徒ごとの進捗分析と印刷できるクラスレポートが加わります。` },
      { question: 'Teacher Proでは何が増えますか？', answer: `クラスと課題が無制限になり、生徒ごとの進捗分析、印刷できるクラスレポート、習熟ヒートマップ、苦手単語の再練習ラウンド、落ち着いたモードが使えます。ライブゲームはどのプランでも最大${P.students}人です。Teacher Proは月${P.price}で、最初の${P.days}日間は無料です。` },
      { question: '生徒はプレイにアカウントが必要ですか？', answer: 'いいえ。生徒は6文字のコードでクラスルームセッションに参加し、任意のブラウザで即座にプレイできます。教師のみがクラスルームとワードリストの管理にアカウントが必要です。' },
      { question: 'LexiClash Educationは本当に無料ですか？', answer: `無料で始められ、無料プランも本物です。${P.classes}クラス・各クラス${P.students}人まで、1クラスにつき課題${P.assignments}件、${P.modes}つのライブモードすべて、自分の単語リストが使え、広告もありません。Teacher Proは月${P.price}で、クラスと課題の無制限、進捗分析、印刷できるレポートが加わります。` },
      { question: 'LexiClashはQuizlet、Kahoot、Wordwallと比べてどうですか？', answer: `LexiClashはフラッシュカードやクイズではなく、単語形成ゲームプレイ（Boggleスタイルのグリッド、アナグラム、ワードホイール）に焦点を当てています。生徒のアカウントなしで動作し、ヘブライ語RTLと日本語を含む${P.languages}言語をサポートし、クラス全体のリアルタイムマルチプレイヤーを追加 — すべて無料プランで。` },
      { question: 'LexiClash Educationはどの言語をサポートしていますか？', answer: '英語、ヘブライ語（完全な右から左のレイアウト付き）、スウェーデン語、日本語、スペイン語、ロシア語。各言語には独自の辞書があり、ESL/EFL教室、ヘブライ語イマージョンプログラム、多言語学校に適しています。' },
      { question: '典型的なクラスルームセッションの長さは？', answer: `短いラウンドは2〜3分。クラス全体のワードゲームは5〜10分です。ほとんどの教師はLexiClashを5分間のウォームアップ、授業中盤の気分転換、または授業終了時の復習として使っています。` },
      { question: '自分の単語リストを使えますか？', answer: 'はい。自分のカリキュラムからカスタム単語リストを作成するか、任意の語彙セットを貼り付けるだけで、生徒はその週に教えている単語そのものでワードゲームをプレイできます。固定の単語バンクに縛られることはありません。' },
      { question: '生徒は何かをダウンロードまたはインストールする必要がありますか？', answer: 'いいえ。LexiClashはあらゆるブラウザ（Chromebook、タブレット、スマートフォン、デスクトップ）で動作し、アプリ、プラグイン、インストールは不要です。生徒は6文字のコードで参加し、すぐにプレイを開始できます。' },
    ],
  },
  sv: {
    title: 'Gratis ordförrådsspel för klassrummet — utan elevkonton',
    description: 'Gratis ord- och ordförrådsspel för klassrummet — inga elevkonton, inga annonser och inga nedladdningar. Använd egna ordlistor, kör multiplayer för hela klassen i valfri webbläsare och undervisa ordförråd på 6 språk inklusive hebreiska och japanska. Byggt för lärare, gratis att börja.',
    features: [
      'Klassrumsordspel designade för elevengagemang och inlärningsresultat',
      'Liveспel för hela klassen: brädan på projektorn, eleverna på sina egna enheter',
      'Lärarpanel för att skapa uppgifter och övervaka elevernas framsteg',
      'Läroplansanpassade ordövningar för alla ämnen och årskurser',
      'Topplistor i realtid för att motivera och belöna elevernas prestationer',
    ],
    geoAnswer: {
      question: 'Hur startar jag ett gratis ordförrådsspel i klassen utan elevkonton?',
      answer:
        `Skapa en klass i LexiClash Education och dela en kod på sex tecken. Eleverna spelar direkt i valfri webbläsare på Chromebook, telefon eller surfplatta — ingen app, e-post eller elevkonto. Använd din egen ordlista. En runda tar 2–10 minuter som uppvärmning, hjärnpaus eller repetition. Gratisplanen täcker ${P.classes} klasser med upp till ${P.students} elever.`,
    },
    faq: [
      { question: 'Vilka ordspel finns tillgängliga för klassrummet?', answer: `LexiClash Education har ${P.modes} livelägen, från klassquiz och bosstrid på projektorn till tidsbegränsade ordjakter och Boggle-brädor på mobilerna — allt spelbart direkt i webbläsaren utan nedladdningar.` },
      { question: 'Hur ställer lärare in ett ordspel i klassrummet?', answer: 'Lärare skapar ett klassrum i lärarpanelen, bjuder in elever med en kod och startar valfritt spel eller uppgift på sekunder. Framsteg och poäng spåras automatiskt.' },
      { question: 'Är LexiClash lämpligt för elever i alla åldrar?', answer: 'Ja. Svårighetsgrad och ordlistor kan anpassas per uppgift, vilket gör det lämpligt för elever i grundskolan, mellanstadiet och gymnasiet samt vuxna inlärare.' },
      { question: 'Kan jag använda LexiClash som ett ordförrådsspel för lärare?', answer: `Absolut. Bygg ordlistor från din läroplan, kör dem live eller som uppgifter och se resultatet av varje runda. Teacher Pro lägger till framstegsstatistik per elev och utskrivbara klassrapporter.` },
      { question: 'Vad lägger Teacher Pro till?', answer: `Obegränsat antal klasser och uppgifter, framstegsstatistik per elev, utskrivbara klassrapporter, en mastery-värmekarta, övningsrundor för missade ord och lugnt läge. Ett livespel rymmer upp till ${P.students} elever i alla planer. Teacher Pro kostar ${P.price}/månad och de första ${P.days} dagarna är gratis.` },
      { question: 'Behöver elever ett konto för att spela?', answer: 'Nej. Elever ansluter till en klassrumssession med en kod på sex tecken och spelar direkt i valfri webbläsare. Endast läraren behöver ett konto för att hantera klassrum och ordlistor.' },
      { question: 'Är LexiClash Education verkligen gratis?', answer: `Gratis att börja, och gratisplanen är en riktig plan: upp till ${P.classes} klasser med upp till ${P.students} elever i varje — en hel klass får plats — ${P.assignments} uppgifter per klass, alla ${P.modes} livelägen, egna ordlistor och inga annonser. Teacher Pro kostar ${P.price}/månad och lägger till obegränsat antal klasser och uppgifter, framstegsstatistik och utskrivbara rapporter.` },
      { question: 'Hur jämförs LexiClash med Quizlet, Kahoot eller Wordwall?', answer: `LexiClash fokuserar på ordbildningsspel (Boggle-liknande brädor, anagram, ordhjul) snarare än flashcards eller frågesporter. Det fungerar utan elevkonton, stöder ${P.languages} språk inklusive hebreiska RTL och japanska, och lägger till realtidsmultiplayer för hela klassen — allt på en gratisnivå.` },
      { question: 'Vilka språk stöder LexiClash Education?', answer: 'Engelska, hebreiska (med fullständig höger-till-vänster-layout), svenska, japanska, spanska och ryska. Varje språk har sin egen ordbok, vilket gör LexiClash lämpligt för ESL/EFL-klassrum, hebreiska immersionsprogram och flerspråkiga skolor.' },
      { question: 'Hur lång är en typisk klassrumssession?', answer: `En snabb runda tar 2–3 minuter. Ett ordspel för hela klassen pågår 5–10 minuter. De flesta lärare använder LexiClash som en 5-minuters uppvärmning, hjärnpaus mitt i lektionen eller repetition vid lektionens slut.` },
      { question: 'Kan jag använda min egen ordlista?', answer: 'Ja. Bygg en anpassad ordlista från din egen läroplan eller klistra in valfri orduppsättning, så spelar eleverna ordspelen med exakt de ord du undervisar den veckan — du är inte låst till någon fast ordbank.' },
      { question: 'Behöver elever ladda ner eller installera något?', answer: 'Nej. LexiClash körs i valfri webbläsare — Chromebook, surfplatta, telefon eller dator — utan app, plugin eller installation att hantera. Eleverna ansluter med en kod på sex tecken och börjar spela direkt.' },
    ],
  },
  es: {
    title: 'Juegos de vocabulario gratis para el aula — sin cuentas de estudiantes',
    description: 'Juegos de palabras y vocabulario gratis para el aula — sin cuentas de estudiantes, sin anuncios y sin descargas. Usa tus propias listas de palabras, juega multijugador con toda la clase en cualquier navegador y enseña vocabulario en 6 idiomas, incluidos hebreo y japonés. Hecho para docentes, gratis para empezar.',
    features: [
      'Juegos de palabras para el aula diseñados para la participación y el aprendizaje de los alumnos',
      'Juegos en vivo para toda la clase: el tablero en el proyector, el alumnado en sus propios dispositivos',
      'Panel del profesor para crear tareas y monitorear el progreso de los alumnos',
      'Ejercicios de palabras alineados con el currículo para cualquier materia y nivel',
      'Clasificaciones en tiempo real para motivar y recompensar los logros de los estudiantes',
    ],
    geoAnswer: {
      question: '¿Cómo monto un juego de vocabulario gratis en clase sin cuentas de estudiantes?',
      answer:
        `Crea una clase en LexiClash Education y comparte un código de 6 caracteres. El alumnado juega al instante en cualquier navegador — Chromebook, teléfono o tablet — sin app, correo ni cuenta. Usa tu propia lista de palabras. Una ronda dura 2–10 minutos: calentamiento, pausa o repaso. El plan gratis cubre ${P.classes} clases de hasta ${P.students} estudiantes.`,
    },
    faq: [
      { question: '¿Qué juegos de palabras para el aula están disponibles?', answer: `LexiClash Education tiene ${P.modes} modos en vivo, desde un quiz de clase y una batalla contra el jefe en el proyector hasta búsquedas de palabras cronometradas y tableros estilo Boggle en los móviles, todo en el navegador sin descargas.` },
      { question: '¿Cómo configuran los profesores un juego de palabras en clase?', answer: 'Los profesores crean un aula en el panel del profesor, invitan a los alumnos con un código de acceso y lanzan cualquier juego o tarea en segundos. El progreso y las puntuaciones se registran automáticamente.' },
      { question: '¿LexiClash es un juego de palabras educativo para estudiantes de todas las edades?', answer: 'Sí. La dificultad y las listas de palabras se personalizan por tarea, así que sirve para primaria, secundaria y bachillerato, además de estudiantes adultos.' },
      { question: '¿Puedo usar LexiClash como juego de vocabulario para profesores?', answer: `Por supuesto. Crea listas de palabras desde tu currículo, úsalas en vivo o como tareas y revisa los resultados de cada ronda. Teacher Pro añade analíticas de progreso por estudiante e informes de clase imprimibles.` },
      { question: '¿Qué añade Teacher Pro?', answer: `Clases y tareas ilimitadas, analíticas de progreso por estudiante, informes de clase imprimibles, un mapa de dominio, rondas de repaso de palabras falladas y modo tranquilo. En todos los planes una partida en vivo admite hasta ${P.students} estudiantes. Teacher Pro cuesta ${P.price}/mes y los primeros ${P.days} días son gratis.` },
      { question: '¿Necesitan los estudiantes una cuenta para jugar?', answer: 'No. Los estudiantes se unen a una sesión de aula con un código de 6 caracteres y juegan al instante en cualquier navegador. Solo el profesor necesita una cuenta para gestionar aulas y listas de palabras.' },
      { question: '¿LexiClash Education es realmente gratis?', answer: `Gratis para empezar, y el plan gratuito es real: hasta ${P.classes} clases de hasta ${P.students} alumnos cada una — cabe una clase entera — ${P.assignments} tareas por clase, los ${P.modes} modos en vivo, tus propias listas y sin anuncios. Teacher Pro cuesta ${P.price}/mes y añade clases y tareas ilimitadas, analíticas de progreso e informes imprimibles.` },
      { question: '¿Cómo se compara LexiClash con Quizlet, Kahoot o Wordwall?', answer: `LexiClash se centra en juegos de formación de palabras (cuadrículas estilo Boggle, anagramas, ruedas de palabras) en lugar de tarjetas didácticas o cuestionarios. Funciona sin cuentas de estudiantes, admite ${P.languages} idiomas incluyendo hebreo RTL y japonés, y añade multijugador en tiempo real para toda la clase — todo en un nivel gratuito.` },
      { question: '¿Qué idiomas admite LexiClash Education?', answer: 'Inglés, hebreo (con diseño completo de derecha a izquierda), sueco, japonés, español y ruso. Cada idioma tiene su propio diccionario, lo que hace que LexiClash sea adecuado para aulas ESL/EFL, programas de inmersión en hebreo y escuelas multilingües.' },
      { question: '¿Cuánto dura una sesión de aula típica?', answer: `Una ronda rápida dura 2–3 minutos. Un juego de palabras para toda la clase dura 5–10 minutos. La mayoría de los profesores usan LexiClash como calentamiento de 5 minutos, descanso mental a mitad de lección o actividad de repaso al final de la clase.` },
      { question: '¿Puedo usar mi propia lista de vocabulario o de palabras?', answer: 'Sí. Crea una lista de palabras personalizada desde tu propio currículo o pega cualquier conjunto de vocabulario, y los estudiantes juegan con exactamente las palabras que enseñas esa semana — no estás atado a un banco de palabras fijo.' },
      { question: '¿Los estudiantes necesitan descargar o instalar algo?', answer: 'No. LexiClash funciona en cualquier navegador — Chromebooks, tablets, teléfonos u ordenadores — sin ninguna app, complemento ni instalación que gestionar. Los estudiantes se unen con un código de 6 caracteres y empiezan a jugar al instante.' },
    ],
  },
  ru: {
    title: 'Бесплатные игры для расширения словарного запаса в классе — без аккаунтов учащихся',
    description: 'Бесплатные словесные и словарные игры для класса — без аккаунтов учащихся, без объявлений и без загрузок. Используйте свои собственные списки слов, играйте с группой в любом браузере и преподавайте словарный запас на 6 языках, включая иврит и японский. Разработано для учителей, бесплатно для старта.',
    features: [
      'Словесные игры для класса, разработанные для участия и результатов обучения учащихся',
      'Живые игры для всего класса: поле на проекторе, ученики на своих устройствах',
      'Панель учителя для создания заданий и отслеживания прогресса учащихся',
      'Упражнения на слова, соответствующие учебной программе для любого предмета и уровня',
      'Рейтинговые таблицы в реальном времени для мотивации и поощрения достижений учащихся',
    ],
    geoAnswer: {
      question: 'Как провести бесплатную словарную игру в классе без аккаунтов учеников?',
      answer:
        `Создайте класс в LexiClash Education и поделитесь кодом из 6 символов. Ученики играют сразу в любом браузере — Chromebook, телефон или планшет — без приложения, почты и аккаунта. Используйте свой список слов. Раунд занимает 2–10 минут: разминка, пауза или повторение. Бесплатный план покрывает ${P.classes} класса до ${P.students} учеников.`,
    },
    faq: [
      { question: 'Какие словесные игры доступны для класса?', answer: `В LexiClash Education ${P.modes} живых режимов: от классной викторины и битвы с боссом на проекторе до поиска слов на время и полей в стиле Boggle на телефонах — всё в браузере без загрузок.` },
      { question: 'Как учитель настраивает словесную игру в классе?', answer: 'Учитель создаёт класс в панели учителя, приглашает учащихся по коду доступа и запускает игру или задание за несколько секунд. Прогресс и баллы фиксируются автоматически.' },
      { question: 'Подходит ли LexiClash для учащихся всех возрастов?', answer: 'Да. Сложность и списки слов персонализируются для каждого задания, поэтому подходит для начальной, средней и старшей школы, а также для взрослых обучающихся.' },
      { question: 'Могу ли я использовать LexiClash как словарную игру для учителей?', answer: `Конечно. Составляйте списки слов по своей программе, запускайте их вживую или как задания и смотрите результаты каждого раунда. Teacher Pro добавляет аналитику прогресса по каждому ученику и отчёты по классу для печати.` },
      { question: 'Что добавляет Teacher Pro?', answer: `Классы и задания без ограничений, аналитику прогресса по каждому ученику, отчёты по классу для печати, карту освоения слов, раунды повторения пропущенных слов и спокойный режим. На любом тарифе в живой игре до ${P.students} учеников. Teacher Pro стоит ${P.price} в месяц, первые ${P.days} дней бесплатно.` },
      { question: 'Нужен ли учащимся аккаунт для игры?', answer: 'Нет. Учащиеся присоединяются к классной сессии по коду из 6 символов и играют сразу же в любом браузере. Только учителю нужен аккаунт для управления классами и списками слов.' },
      { question: 'LexiClash Education действительно бесплатна?', answer: `Начать можно бесплатно, и бесплатный план настоящий: до ${P.classes} классов по ${P.students} учеников — целый класс помещается — ${P.assignments} задания на класс, все ${P.modes} живых режимов, свои списки слов и без рекламы. Teacher Pro стоит ${P.price} в месяц и добавляет классы и задания без ограничений, аналитику прогресса и отчёты для печати.` },
      { question: 'Чем LexiClash отличается от Quizlet, Kahoot или Wordwall?', answer: `LexiClash сосредоточена на словесных играх с составлением слов (сетки в стиле Boggle, анаграммы, словесные колёса), а не на флэш-картах или викторинах. Работает без аккаунтов учащихся, поддерживает ${P.languages} языков, включая иврит с RTL и японский, и добавляет многопользовательскую игру в реальном времени для всего класса — всё на бесплатном уровне.` },
      { question: 'Какие языки поддерживает LexiClash Education?', answer: `Английский, иврит (с полным расположением справа налево), шведский, японский, испанский и русский. Каждый язык имеет собственный словарь, что делает LexiClash подходящей для классов ESL/EFL, программ иммерсии на иврите и многоязычных школ.` },
      { question: 'Какова длительность типичной школьной сессии?', answer: `Быстрый раунд длится 2–3 минуты. Словесная игра для всего класса длится 5–10 минут. Большинство учителей используют LexiClash как 5-минутную разминку, перерыв для мозга в середине урока или повторение в конце занятия.` },
      { question: 'Могу ли я использовать мой собственный список слов?', answer: 'Да. Создайте пользовательский список слов из вашей программы или просто вставьте любой набор слов, и учащиеся будут играть с именно теми словами, которые вы преподаёте на этой неделе — вы не привязаны к фиксированному словарю.' },
      { question: 'Нужно ли учащимся что-то загружать или устанавливать?', answer: 'Нет. LexiClash работает в любом браузере — Chromebook, планшет, телефон или компьютер — без приложения, расширения или установки. Учащиеся присоединяются по коду из 6 символов и начинают играть сразу же.' },
    ],
  },
};
