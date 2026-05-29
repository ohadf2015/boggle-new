import type { Metadata } from 'next';
import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import {
  buildEducationFaqJsonLd,
  buildEducationOrgJsonLd,
  buildEducationBreadcrumbJsonLd,
  buildEducationCourseJsonLd,
  buildEducationWebApplicationJsonLd,
} from '@/lib/seo/educationJsonLd';
import { PageClient as EducationPageClient } from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationHub', path: '/education', locale });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Education Hub - Word Games for Classrooms & Vocabulary Learning',
    description: 'Transform vocabulary learning with engaging word games designed for classrooms and students. Teachers can create vocabulary duels, assign curriculum-aligned word exercises, and track student progress through a dedicated dashboard. Make language learning fun with LexiClash Education.',
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
    ],
  },
  he: {
    title: 'מרכז חינוך - משחקי מילים לכיתות ולמידת אוצר מילים',
    description: 'שנו את למידת אוצר המילים עם משחקי מילים מרתקים שתוכננו לכיתות ולתלמידים. מורים יכולים ליצור דואלי אוצר מילים, להקצות תרגילים מותאמים לתכנית הלימודים ולעקוב אחר התקדמות התלמידים.',
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
    ],
  },
  ja: {
    title: '教育ハブ - 教室と語彙学習のためのワードゲーム',
    description: '教室と生徒向けに設計された魅力的なワードゲームで語彙学習を変えましょう。教師はボキャブラリーデュエルを作成し、カリキュラムに沿った課題を割り当て、教師ダッシュボードを通じて生徒の進捗を追跡できます。',
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
    ],
  },
  sv: {
    title: 'Utbildningshub - Ordspel för Klassrum och Ordförrådsinlärning',
    description: 'Förvandla inlärning av ordförråd med engagerande ordspel designade för klassrum och elever. Lärare kan skapa ordförrådsdueller, tilldela läroplansanpassade övningar och följa elevernas framsteg via en dedikerad panel.',
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
    ],
  },
  es: {
    title: 'Hub Educativo - Juegos de Palabras para Aulas y Aprendizaje de Vocabulario',
    description: 'Transforma el aprendizaje de vocabulario con juegos de palabras atractivos diseñados para aulas y estudiantes. Los profesores pueden crear duelos de vocabulario, asignar ejercicios alineados con el currículo y hacer seguimiento del progreso de los alumnos a través de un panel dedicado.',
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
    ],
  },
};

export default async function EducationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale as keyof typeof seoContent] ?? seoContent.en;
  const faqSchema = buildEducationFaqJsonLd(locale, content.faq);
  const orgSchema = buildEducationOrgJsonLd(locale);
  const breadcrumbSchema = buildEducationBreadcrumbJsonLd(locale);
  const courseSchema = buildEducationCourseJsonLd(locale);
  const webAppSchema = buildEducationWebApplicationJsonLd(locale);
  // Safe: schemas built from static seoContent + locale enum, not user input.
  // JSON.stringify escapes content for <script> context; same pattern as
  // app/[locale]/guides/page.tsx:73 and lib/seo/homepageFaqJsonLd.ts.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <EducationPageClient />
      <EducationResourceLinks locale={locale} />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}

// Server-rendered crawlable internal-link section. Surfaces sub-routes and
// English-only SEO landings to Googlebot + signals their priority via the
// PageRank flow from /education (priority 0.7 in sitemap).
const RESOURCE_TITLES: Record<string, { heading: string; subhead: string; cards: { duels: { title: string; desc: string }; classroom: { title: string; desc: string } } }> = {
  en: {
    heading: 'Explore Education Modes',
    subhead: 'Pick the right format for your classroom — quick 1v1 duels or live whole-class multiplayer.',
    cards: {
      duels: { title: 'Vocabulary Duels (1v1)', desc: 'Pair students for 2-3 minute head-to-head word battles.' },
      classroom: { title: 'Live Classroom Game', desc: 'Whole-class multiplayer; up to 30 students join with a 4-digit code.' },
    },
  },
  he: {
    heading: 'גלו מצבי לימוד',
    subhead: 'בחרו את הפורמט המתאים לכיתה — דואלי 1v1 מהירים או רב-משתתפים חי לכל הכיתה.',
    cards: {
      duels: { title: 'דואלי אוצר מילים (1v1)', desc: 'התאימו תלמידים לקרבות מילים של 2-3 דקות פנים מול פנים.' },
      classroom: { title: 'משחק כיתתי חי', desc: 'רב-משתתפים לכל הכיתה; עד 30 תלמידים מצטרפים עם קוד בן 4 ספרות.' },
    },
  },
  sv: {
    heading: 'Utforska utbildningslägen',
    subhead: 'Välj rätt format för ditt klassrum — snabba 1v1-dueller eller live-multiplayer för hela klassen.',
    cards: {
      duels: { title: 'Ordförrådsdueller (1v1)', desc: 'Para ihop elever för 2-3 minuters ordstrider mot varandra.' },
      classroom: { title: 'Live klassrumsspel', desc: 'Multiplayer för hela klassen; upp till 30 elever ansluter med en 4-siffrig kod.' },
    },
  },
  ja: {
    heading: '教育モードを探索',
    subhead: 'クラスに最適なフォーマットを選択 — クイック1対1デュエルまたはクラス全体のライブマルチプレイヤー。',
    cards: {
      duels: { title: '語彙デュエル (1対1)', desc: '生徒をペアリングして2〜3分の単語バトルを実施。' },
      classroom: { title: 'ライブクラスルームゲーム', desc: 'クラス全体のマルチプレイヤー; 最大30人の生徒が4桁のコードで参加。' },
    },
  },
  es: {
    heading: 'Explora los modos educativos',
    subhead: 'Elige el formato adecuado para tu aula — duelos 1v1 rápidos o multijugador en vivo para toda la clase.',
    cards: {
      duels: { title: 'Duelos de vocabulario (1v1)', desc: 'Empareja estudiantes para batallas de palabras cara a cara de 2-3 minutos.' },
      classroom: { title: 'Juego de aula en vivo', desc: 'Multijugador para toda la clase; hasta 30 estudiantes se unen con un código de 4 dígitos.' },
    },
  },
};

type ResourceCard = { badge: string; title: string; desc: string };
const RESOURCE_CARDS: Record<string, { heading: string; subhead: string; vocab: ResourceCard; esl: ResourceCard; teachers: ResourceCard; spelling: ResourceCard }> = {
  en: {
    heading: 'Teacher Guides',
    subhead: 'Deep-dive landing pages on specific use cases, with comparison tables, FAQs, and free word lists.',
    vocab: { badge: 'Guide', title: 'Vocabulary Games for the Classroom', desc: 'No signup, 5 languages, free forever — vs Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'ESL', title: 'ESL Word Games Online', desc: 'CEFR-scaled (A1→C2), 5 dictionaries, no student signup.' },
    teachers: { badge: 'For Teachers', title: 'Word Games for Teachers', desc: 'Sub-day, brain-break, warm-up — zero prep, free forever.' },
    spelling: { badge: 'Spelling Bee', title: 'Spelling Bee Practice Online', desc: '4-week training plan, custom word lists, 1v1 duels — Scripps prep.' },
  },
  he: {
    heading: 'מדריכים למורים',
    subhead: 'דפי נחיתה מעמיקים למקרי שימוש ספציפיים, עם טבלאות השוואה, שאלות נפוצות ורשימות מילים חינמיות.',
    vocab: { badge: 'מדריך', title: 'משחקי אוצר מילים לכיתה', desc: 'בלי הרשמה, 5 שפות, חינם לתמיד — מול Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'אנגלית', title: 'משחקי מילים באנגלית כשפה זרה', desc: 'מדורג לפי CEFR (A1→C2), 5 מילונים, בלי הרשמת תלמידים.' },
    teachers: { badge: 'למורים', title: 'משחקי מילים למורים', desc: 'יום מילוי מקום, הפסקה מרעננת, חימום — אפס הכנה, חינם לתמיד.' },
    spelling: { badge: 'איות', title: 'תרגול תחרות איות אונליין', desc: 'תוכנית אימון של 4 שבועות, רשימות מילים מותאמות, דואלי 1v1 — הכנה לתחרות.' },
  },
  sv: {
    heading: 'Lärarguider',
    subhead: 'Fördjupande sidor om specifika användningsfall, med jämförelsetabeller, vanliga frågor och gratis ordlistor.',
    vocab: { badge: 'Guide', title: 'Ordförrådsspel för klassrummet', desc: 'Ingen registrering, 5 språk, gratis för alltid — jämfört med Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'ESL', title: 'Ordspel för engelska online', desc: 'CEFR-skalad (A1→C2), 5 ordböcker, ingen elevregistrering.' },
    teachers: { badge: 'För lärare', title: 'Ordspel för lärare', desc: 'Vikariedag, hjärnpaus, uppvärmning — noll förberedelse, gratis för alltid.' },
    spelling: { badge: 'Stavning', title: 'Stavningstävling online', desc: '4-veckors träningsplan, anpassade ordlistor, 1v1-dueller — tävlingsförberedelse.' },
  },
  ja: {
    heading: '教師向けガイド',
    subhead: '比較表、よくある質問、無料単語リスト付きの、具体的な活用法を深掘りするページ。',
    vocab: { badge: 'ガイド', title: '教室向け語彙ゲーム', desc: '登録不要、5言語、ずっと無料 — Quizlet/Kahoot/Wordwallと比較。' },
    esl: { badge: 'ESL', title: 'オンライン英語単語ゲーム', desc: 'CEFR準拠（A1→C2）、5つの辞書、生徒の登録不要。' },
    teachers: { badge: '教師向け', title: '教師のための単語ゲーム', desc: '代行日、頭の休憩、ウォームアップ — 準備ゼロ、ずっと無料。' },
    spelling: { badge: 'スペリング', title: 'オンラインスペリング練習', desc: '4週間のトレーニングプラン、カスタム単語リスト、1対1デュエル — 大会対策。' },
  },
  es: {
    heading: 'Guías para docentes',
    subhead: 'Páginas detalladas sobre casos de uso específicos, con tablas comparativas, preguntas frecuentes y listas de palabras gratuitas.',
    vocab: { badge: 'Guía', title: 'Juegos de vocabulario para el aula', desc: 'Sin registro, 5 idiomas, gratis para siempre — frente a Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'ESL', title: 'Juegos de palabras en inglés online', desc: 'Escalado por CEFR (A1→C2), 5 diccionarios, sin registro de estudiantes.' },
    teachers: { badge: 'Para docentes', title: 'Juegos de palabras para docentes', desc: 'Día de sustitución, descanso mental, calentamiento — cero preparación, gratis para siempre.' },
    spelling: { badge: 'Concurso de Ortografía', title: 'Práctica de concurso de ortografía online', desc: 'Plan de entrenamiento de 4 semanas, listas personalizadas, duelos 1v1 — preparación para concursos.' },
  },
};

function EducationResourceLinks({ locale }: { locale: string }) {
  const lang = locale in RESOURCE_TITLES ? locale : 'en';
  const t = RESOURCE_TITLES[lang];
  const rc = RESOURCE_CARDS[lang] ?? RESOURCE_CARDS.en;

  return (
    <section aria-label="Education resources" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 border-t-3 border-neo-black/30">
      <h2 className="font-neo-display text-2xl sm:text-3xl font-black uppercase text-neo-white">
        {t.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm sm:text-base text-neo-gray-200">{t.subhead}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/${locale}/education/duels`}
          className="group rounded-neo border-3 border-neo-black bg-neo-pink p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <h3 className="font-neo-display text-lg font-black uppercase text-neo-white">{t.cards.duels.title}</h3>
          <p className="mt-2 text-sm text-neo-white">{t.cards.duels.desc}</p>
          <span className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-neo-yellow">→</span>
        </Link>
        <Link
          href={`/${locale}/education/classroom-game`}
          className="group rounded-neo border-3 border-neo-black bg-neo-cyan p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <h3 className="font-neo-display text-lg font-black uppercase text-neo-navy">{t.cards.classroom.title}</h3>
          <p className="mt-2 text-sm text-neo-navy/90">{t.cards.classroom.desc}</p>
          <span className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy">→</span>
        </Link>
      </div>

      <h2 className="mt-12 font-neo-display text-2xl sm:text-3xl font-black uppercase text-neo-white">
        {rc.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm sm:text-base text-neo-gray-200">
        {rc.subhead}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={`/${locale}/education/vocabulary-games-classroom`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{rc.vocab.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.vocab.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.vocab.desc}</p>
        </Link>
        <Link
          href={`/${locale}/education/esl-word-games`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-cyan px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{rc.esl.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.esl.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.esl.desc}</p>
        </Link>
        <Link
          href={`/${locale}/education/games-for-teachers`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-purple px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white">{rc.teachers.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.teachers.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.teachers.desc}</p>
        </Link>
        <Link
          href={`/${locale}/education/spelling-bee-practice`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-pink px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white">{rc.spelling.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.spelling.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.spelling.desc}</p>
        </Link>
      </div>
    </section>
  );
}
