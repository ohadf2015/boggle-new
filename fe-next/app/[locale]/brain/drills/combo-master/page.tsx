import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import ComboMasterPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainComboMaster', path: '/brain/drills/combo-master', locale });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Combo Master — Sustained Focus Word Drill',
    description: 'Build and maintain word combos under increasing pressure. Combo Master tests your sustained attention and processing speed by demanding rapid, back-to-back word finds before your combo streak breaks — a powerful drill for focus and mental endurance.',
    features: [
      'Combo streak multiplies your score the longer it lasts',
      'Pressure escalates each time your streak extends',
      'Trains sustained attention and speed simultaneously',
      'Visual combo meter gives real-time performance feedback',
    ],
    faq: [
      {
        question: 'What does "combo" mean in word games?',
        answer: 'A combo is an unbroken sequence of successful word finds. Each new word found before the timer resets extends your combo and increases your score multiplier.',
      },
      {
        question: 'How does Combo Master improve focus?',
        answer: 'Maintaining a combo requires you to stay locked in without distraction. The escalating pressure trains the brain to sustain concentration even under cognitive load — the same skill needed for studying or deep work.',
      },
      {
        question: 'What is the longest possible combo?',
        answer: 'There is no hard cap. Your combo continues as long as you keep finding valid words. The board refreshes with harder configurations to keep pushing your limits.',
      },
    ],
  },
  he: {
    title: 'מאסטר קומבו — תרגיל מילים לריכוז מתמשך',
    description: 'בנה ושמור על קומבואים של מילים תחת לחץ גובר. מאסטר קומבו בוחן את הקשב המתמשך ומהירות העיבוד שלך על ידי דרישה למציאת מילים מהירה ורצופה לפני שרצף הקומבו שלך נשבר.',
    features: [
      'רצף קומבו מכפיל את הניקוד ככל שנמשך',
      'הלחץ מגבר בכל פעם שהרצף מתארך',
      'מאמן קשב מתמשך ומהירות בו זמנית',
      'מד קומבו חזותי נותן משוב ביצועים בזמן אמת',
    ],
    faq: [
      {
        question: 'כיצד מאסטר קומבו משפר ריכוז?',
        answer: 'שמירה על קומבו מחייבת אותך להישאר ממוקד ללא הסחת דעת. הלחץ ההולך וגובר מאמן את המוח לשמור על ריכוז גם תחת עומס קוגניטיבי — אותה מיומנות הנדרשת ללימוד ועבודה מעמיקה.',
      },
    ],
  },
  sv: {
    title: 'Kombomästaren — Ordövning i uthållig fokus',
    description: 'Bygg och håll ordkombos under ökande press. Kombomästaren tränar din uthållande uppmärksamhet och bearbetningshastighet.',
    features: [
      'Kombosviten multiplicerar din poäng',
      'Trycket ökar ju längre din svit varar',
      'Tränar uthållig uppmärksamhet och hastighet',
      'Visuell kombomätare ger realtidsfeedback',
    ],
    faq: [],
  },
  ja: {
    title: 'コンボマスター — 持続集中力ワードドリル',
    description: '増加するプレッシャーの中でコンボを構築・維持しましょう。コンボマスターは持続的注意力と処理速度を同時に鍛える強力な集中力トレーニングです。',
    features: [
      'コンボが続くほどスコア倍率が上昇',
      'ストリークが延びるほどプレッシャーが増加',
      '持続的注意力とスピードを同時にトレーニング',
      'リアルタイムのコンボメーターで進捗確認',
    ],
    faq: [
      {
        question: 'コンボマスターはどのように集中力を改善しますか？',
        answer: 'コンボを維持するには集中力を切らさないことが必要です。エスカレートするプレッシャーが、認知負荷下でも集中を持続させる能力を鍛えます。',
      },
    ],
  },
  es: {
    title: 'Maestro de Combos — Ejercicio de Enfoque Sostenido',
    description: 'Construye y mantén combos de palabras bajo presión creciente. Maestro de Combos pone a prueba tu atención sostenida y velocidad de procesamiento exigiendo hallazgos rápidos y consecutivos de palabras antes de que se rompa tu racha.',
    features: [
      'La racha de combos multiplica tu puntuación mientras dura',
      'La presión escala cada vez que tu racha se extiende',
      'Entrena la atención sostenida y la velocidad simultáneamente',
      'Medidor de combo visual con retroalimentación en tiempo real',
    ],
    faq: [
      {
        question: '¿Qué significa "combo" en juegos de palabras?',
        answer: 'Un combo es una secuencia ininterrumpida de hallazgos exitosos de palabras. Cada nueva palabra encontrada antes de que el temporizador se reinicie extiende tu combo y aumenta tu multiplicador de puntuación.',
      },
      {
        question: '¿Cómo mejora el Maestro de Combos el enfoque?',
        answer: 'Mantener un combo requiere que te mantengas concentrado sin distracciones. La presión escalante entrena al cerebro para sostener la concentración incluso bajo carga cognitiva.',
      },
    ],
  },
};

export default async function ComboMasterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  return (
    <>
      <ComboMasterPageClient />
      <GamePageSeoContent title={content.title} description={content.description} features={content.features} faq={content.faq} />
    </>
  );
}
