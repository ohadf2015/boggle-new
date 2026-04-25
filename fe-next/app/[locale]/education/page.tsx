import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import {
  buildEducationFaqJsonLd,
  buildEducationOrgJsonLd,
  buildEducationBreadcrumbJsonLd,
  buildEducationCourseJsonLd,
} from '@/lib/seo/educationJsonLd';
import EducationPageClient from './PageClient';

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
  // Safe: schemas built from static seoContent + locale enum, not user input.
  // JSON.stringify escapes content for <script> context; same pattern as
  // app/[locale]/guides/page.tsx:73 and lib/seo/homepageFaqJsonLd.ts.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <EducationPageClient />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}
