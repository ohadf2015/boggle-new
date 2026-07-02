import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import MemoryHuntPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainMemoryHunt', path: '/brain/drills/memory-hunt', locale, noIndex: true });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Memory Hunt — Word Recall Brain Game',
    description: 'Test your short-term memory by finding words you encountered on previous boards before the timer runs out. Memory Hunt is a proven word recall brain game that pushes your visual memory and lexical retention to the limit.',
    features: [
      'Tracks words across multiple board generations',
      'Timer pressure increases as rounds progress',
      'Adaptive difficulty scales to your recall accuracy',
      'Instant feedback highlights remembered vs. missed words',
    ],
    faq: [
      {
        question: 'What is a memory word game?',
        answer: 'A memory word game challenges you to remember and locate words you have seen before under timed conditions. Memory Hunt adds a boggle-style grid search on top of classic recall tasks.',
      },
      {
        question: 'How does word recall improve with practice?',
        answer: 'Repeated exposure and retrieval practice strengthen the neural pathways associated with specific words. Playing Memory Hunt daily reinforces both short-term and working memory for language.',
      },
      {
        question: 'Is Memory Hunt suitable for all ages?',
        answer: 'Yes. The drill is appropriate for teens and adults. Younger players benefit from vocabulary exposure while older players maintain memory sharpness.',
      },
    ],
  },
  he: {
    title: 'ציד זיכרון — משחק שליפת מילים לאימון מוח',
    description: 'בחן את הזיכרון לטווח קצר שלך על ידי איתור מילים שנתקלת בהן בלוחות קודמים לפני שהזמן נגמר. ציד זיכרון הוא משחק שליפת מילים מוכח שדוחף את הזיכרון החזותי ושימור הלקסיקון שלך לגבול.',
    features: [
      'עוקב אחר מילים על פני מספר לוחות',
      'לחץ הזמן גובר עם התקדמות הסיבובים',
      'קושי מסתגל לדיוק השליפה שלך',
      'משוב מיידי מדגיש מילים שנזכרו מול שנשכחו',
    ],
    faq: [
      {
        question: 'כיצד שליפת מילים משתפרת עם תרגול?',
        answer: 'חשיפה חוזרת ותרגול שליפה מחזקים את הנתיבים העצביים הקשורים למילים ספציפיות. משחק יומי בציד זיכרון מחזק את הזיכרון לטווח קצר ואת זיכרון העבודה לשפה.',
      },
    ],
  },
  sv: {
    title: 'Minnesjakt — Ordminnesspel för hjärnan',
    description: 'Testa ditt korttidsminne genom att hitta ord du sett på tidigare bräden innan tiden är ute.',
    features: [
      'Spårar ord över flera brädgenerationer',
      'Tidspressen ökar för varje runda',
      'Anpassad svårighetsgrad baserat på din träffsäkerhet',
      'Direkt feedback på rätt och missade ord',
    ],
    faq: [],
  },
  ja: {
    title: 'メモリーハント — 単語記憶脳トレゲーム',
    description: '以前のボードで見た単語を制限時間内に見つけ出す短期記憶テスト。視覚記憶と語彙保持力を限界まで鍛えます。',
    features: [
      '複数ボードにわたって単語を追跡',
      'ラウンドが進むにつれてタイマーが厳しくなる',
      '想起精度に合わせた適応型難易度',
    ],
    faq: [
      {
        question: 'メモリーハントは全年齢向けですか？',
        answer: 'はい。10代から大人まで適しています。語彙の習得にも記憶力の維持にも効果的です。',
      },
    ],
  },
  es: {
    title: 'Caza de Memoria — Juego de Recall de Palabras para el Cerebro',
    description: 'Pon a prueba tu memoria a corto plazo encontrando palabras que viste en tableros anteriores antes de que se acabe el tiempo. Caza de Memoria es un juego probado de recuperación de palabras que lleva tu memoria visual y retención léxica al límite.',
    features: [
      'Rastrea palabras a través de múltiples tableros',
      'La presión del tiempo aumenta con cada ronda',
      'Dificultad adaptativa según tu precisión de recall',
      'Retroalimentación inmediata sobre palabras recordadas y olvidadas',
    ],
    faq: [
      {
        question: '¿Qué es un juego de memoria de palabras?',
        answer: 'Un juego de memoria de palabras te desafía a recordar y localizar palabras que has visto antes bajo condiciones de tiempo limitado.',
      },
      {
        question: '¿Cómo mejora el recall de palabras con la práctica?',
        answer: 'La exposición repetida y la práctica de recuperación fortalecen las vías neuronales asociadas con palabras específicas, mejorando tanto la memoria a corto plazo como la memoria de trabajo.',
      },
    ],
  },
};

export default async function MemoryHuntPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  return (
    <>
      <MemoryHuntPageClient />
      <GamePageSeoContent title={content.title} description={content.description} features={content.features} faq={content.faq} />
    </>
  );
}
