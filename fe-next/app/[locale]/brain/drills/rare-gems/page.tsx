import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import RareGemsPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainRareGems', path: '/brain/drills/rare-gems', locale });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Rare Gems — Vocabulary Depth Word Drill',
    description: 'Hunt for uncommon and rare vocabulary words hidden in the grid to earn massive bonus points. Rare Gems rewards players who push beyond everyday language — building an exceptional vocabulary one rare find at a time.',
    features: [
      'Words rated by rarity — the rarer the word, the higher the gem tier',
      'Bonus multiplier for consecutive rare word finds',
      'Hints system reveals one letter at a time for stubborn gems',
      'Vocabulary log saves every rare word you discover',
    ],
    faq: [
      {
        question: 'How are words classified as rare?',
        answer: 'Rarity is calculated from word frequency data across large text corpora. Words that appear less often in everyday writing earn a higher gem rating — from uncommon (silver) to extremely rare (diamond).',
      },
      {
        question: 'Will I actually learn rare words by playing?',
        answer: 'Yes. Each discovered gem displays a definition and example sentence. The vocabulary log lets you review past finds, and spaced repetition surfaces old gems again in future sessions.',
      },
      {
        question: 'What if I can only find common words?',
        answer: 'Common words still count toward your score. The drill rewards persistence — the board is always solvable, but rare gems require creative scanning of letter paths.',
      },
    ],
  },
  he: {
    title: 'אבני חן נדירות — תרגיל מילים לעומק אוצר המילים',
    description: 'צוד מילים נדירות וייחודיות החבויות בלוח כדי להרוויח נקודות בונוס עצומות. אבני חן נדירות מתגמלת שחקנים שמתקדמים מעבר לשפה היומיומית — ובונה אוצר מילים יוצא דופן, גילוי אחר גילוי.',
    features: [
      'מילים מדורגות לפי נדירות — ככל שהמילה נדירה יותר, כך דרגת האבן גבוהה יותר',
      'מכפיל בונוס עבור מציאות מילים נדירות רצופות',
      'מערכת רמזים חושפת אות אחת בכל פעם',
      'יומן אוצר מילים שומר כל מילה נדירה שגילית',
    ],
    faq: [
      {
        question: 'האם אוכל ממש ללמוד מילים נדירות על ידי משחק?',
        answer: 'כן. כל אבן חן שגולתה מציגה הגדרה ומשפט דוגמה. יומן אוצר המילים מאפשר לסקור גילויים עבר, וחזרה מרווחת מציגה מחדש אבני חן ישנות בסשנים עתידיים.',
      },
    ],
  },
  sv: {
    title: 'Sällsynta Pärlor — Ordövning i ordförrådsdjup',
    description: 'Jaga ovanliga och sällsynta vokabulärord gömda i nätet för att tjäna enorma bonuspoäng. Sällsynta Pärlor belönar spelare som sträcker sig bortom vardagsspråket.',
    features: [
      'Ord betygsätts efter sällsynthet',
      'Bonusmultiplikator för på varandra följande sällsynta ord',
      'Ledtrådssystem avslöjar en bokstav i taget',
      'Vokabulärlogg sparar varje sällsynt ord du hittar',
    ],
    faq: [],
  },
  ja: {
    title: 'レアジェム — 語彙力強化ワードドリル',
    description: 'グリッドに隠された珍しい語彙を見つけて大量のボーナスポイントを獲得しましょう。レアジェムは日常言語を超えた語彙力を持つプレイヤーを報います。',
    features: [
      '単語の希少性に応じてジェムティアが決まる',
      '連続レア単語発見でボーナス倍率アップ',
      '語彙ログで発見した珍しい単語を保存',
    ],
    faq: [
      {
        question: '単語はどのようにレアと分類されますか？',
        answer: '大規模テキストコーパスの単語頻度データから希少性を計算します。日常的な文章に少ししか登場しない単語ほど高いジェムランクを獲得します。',
      },
    ],
  },
  es: {
    title: 'Gemas Raras — Ejercicio de Profundidad de Vocabulario',
    description: 'Caza palabras de vocabulario poco comunes y raras escondidas en la cuadrícula para ganar enormes puntos de bonificación. Gemas Raras recompensa a los jugadores que van más allá del lenguaje cotidiano — construyendo un vocabulario excepcional un hallazgo raro a la vez.',
    features: [
      'Palabras clasificadas por rareza — cuanto más rara, mayor el nivel de gema',
      'Multiplicador de bonificación por hallazgos consecutivos de palabras raras',
      'Sistema de pistas que revela una letra a la vez',
      'Registro de vocabulario que guarda cada palabra rara descubierta',
    ],
    faq: [
      {
        question: '¿Cómo se clasifican las palabras como raras?',
        answer: 'La rareza se calcula a partir de datos de frecuencia de palabras en grandes corpus de texto. Las palabras que aparecen menos en la escritura cotidiana obtienen una calificación de gema más alta.',
      },
      {
        question: '¿Aprenderé realmente palabras raras jugando?',
        answer: 'Sí. Cada gema descubierta muestra una definición y una oración de ejemplo. El registro de vocabulario te permite revisar hallazgos pasados, y la repetición espaciada vuelve a mostrar gemas antiguas en sesiones futuras.',
      },
    ],
  },
};

export default async function RareGemsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  return (
    <>
      <RareGemsPageClient />
      <GamePageSeoContent title={content.title} description={content.description} features={content.features} faq={content.faq} />
    </>
  );
}
