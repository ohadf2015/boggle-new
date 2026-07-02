import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import PatternSwitcherPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainPatternSwitcher', path: '/brain/drills/pattern-switcher', locale, noIndex: true });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Pattern Switcher — Cognitive Flexibility Word Drill',
    description: 'Challenge your brain to switch between different word-finding rules each round. Pattern Switcher trains cognitive flexibility — the mental ability to adapt quickly when the rules change — a key executive function linked to learning and problem-solving.',
    features: [
      'New word-finding rule every round (length, letter, position)',
      'Switch cost measured and displayed after each round',
      'Builds executive control and mental agility',
      'Tracks rule-switching accuracy over time',
    ],
    faq: [
      {
        question: 'What is cognitive flexibility?',
        answer: 'Cognitive flexibility is the ability to shift your thinking between concepts or adapt to new rules quickly. It is an executive function strongly associated with creativity and academic performance.',
      },
      {
        question: 'Why alternate word-finding rules instead of sticking to one?',
        answer: 'Switching rules forces your brain to suppress the previous strategy and activate a new one. This "task-switching" exercise is one of the most effective ways to strengthen prefrontal cortex function.',
      },
      {
        question: 'How often should I train cognitive flexibility?',
        answer: 'Short daily sessions of 5–10 minutes are more effective than longer infrequent sessions. Pattern Switcher rounds are designed to fit into a daily warm-up routine.',
      },
    ],
  },
  he: {
    title: 'מחליף דפוסים — תרגיל מילים לגמישות קוגניטיבית',
    description: 'אתגר את מוחך לעבור בין כללי חיפוש מילים שונים בכל סיבוב. מחליף דפוסים מאמן גמישות קוגניטיבית — היכולת המנטלית להסתגל במהירות כשהכללים משתנים — תפקוד ניהולי מרכזי הקשור ללמידה ופתרון בעיות.',
    features: [
      'כלל חיפוש מילים חדש בכל סיבוב',
      'עלות המיתוג נמדדת ומוצגת לאחר כל סיבוב',
      'בונה שליטה ניהולית וזריזות מנטלית',
      'עוקב אחר דיוק מיתוג כללים לאורך זמן',
    ],
    faq: [
      {
        question: 'מהי גמישות קוגניטיבית?',
        answer: 'גמישות קוגניטיבית היא היכולת לעבור בין מושגים או להסתגל לכללים חדשים במהירות. זהו תפקוד ניהולי הקשור קשר הדוק ליצירתיות וביצועים אקדמיים.',
      },
    ],
  },
  sv: {
    title: 'Mönsterväxlaren — Ordövning i kognitiv flexibilitet',
    description: 'Träna hjärnan att växla mellan olika ordsökregler varje runda. Mönsterväxlaren stärker kognitiv flexibilitet — en nyckelkompetens kopplad till inlärning och problemlösning.',
    features: [
      'Ny ordsökregel varje runda',
      'Växlingskostnaden mäts och visas',
      'Stärker exekutiv kontroll och mental smidighet',
      'Spårar din regelväxlingsprecision',
    ],
    faq: [],
  },
  ja: {
    title: 'パターンスイッチャー — 認知柔軟性ワードドリル',
    description: 'ラウンドごとに異なる単語探しルールに切り替えながら、脳の適応力を鍛えましょう。認知柔軟性は学習や問題解決に深く関わる重要な実行機能です。',
    features: [
      'ラウンドごとに新しい単語探しルール',
      '切り替えコストを測定・表示',
      '実行制御と精神的な敏捷性を強化',
      'ルール切り替え精度を経時追跡',
    ],
    faq: [
      {
        question: '認知柔軟性とは何ですか？',
        answer: '概念間の思考を切り替えたり、新しいルールに素早く適応する能力です。創造性や学業成績と強く関連する実行機能です。',
      },
    ],
  },
  es: {
    title: 'Cambiador de Patrones — Ejercicio de Flexibilidad Cognitiva',
    description: 'Desafía tu cerebro a cambiar entre diferentes reglas de búsqueda de palabras cada ronda. El Cambiador de Patrones entrena la flexibilidad cognitiva — la capacidad mental de adaptarse rápidamente cuando las reglas cambian — una función ejecutiva clave vinculada al aprendizaje.',
    features: [
      'Nueva regla de búsqueda de palabras cada ronda',
      'El costo de cambio se mide y muestra tras cada ronda',
      'Desarrolla el control ejecutivo y la agilidad mental',
      'Rastrea la precisión de cambio de reglas con el tiempo',
    ],
    faq: [
      {
        question: '¿Qué es la flexibilidad cognitiva?',
        answer: 'La flexibilidad cognitiva es la capacidad de cambiar el pensamiento entre conceptos o adaptarse a nuevas reglas rápidamente. Es una función ejecutiva fuertemente asociada con la creatividad y el rendimiento académico.',
      },
      {
        question: '¿Por qué alternar reglas en lugar de usar siempre la misma?',
        answer: 'Cambiar de regla obliga al cerebro a suprimir la estrategia anterior y activar una nueva. Este ejercicio de cambio de tarea es una de las formas más efectivas de fortalecer la función prefrontal.',
      },
    ],
  },
};

export default async function PatternSwitcherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  return (
    <>
      <PatternSwitcherPageClient />
      <GamePageSeoContent title={content.title} description={content.description} features={content.features} faq={content.faq} />
    </>
  );
}
